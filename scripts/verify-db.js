import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { getPool } from '../server/db.js';
import { createAuth } from '../server/auth.js';
import { createApp } from '../server/app.js';
const pool=getPool();
// Initial deployment only: never modify an owner's live drafts during later builds.
const owner=(await pool.query('SELECT id FROM "user" WHERE email=$1',[process.env.ADMIN_EMAIL])).rows[0];
if(owner){console.log('Database write checks skipped: owner account already exists.');await pool.end();process.exit(0);}
if(process.env.AW_RUN_INITIAL_DB_CHECKS!=='1'){console.log('Database write checks skipped: explicit initial-validation flag required.');await pool.end();process.exit(0);}
const email=`qa-${randomUUID()}@example.invalid`,password=randomBytes(32).toString('base64url');
const previousEmail=process.env.ADMIN_EMAIL,previousURL=process.env.BETTER_AUTH_URL;
const before=(await pool.query('SELECT * FROM aw_content WHERE id=1')).rows[0];
const server=createApp({auth:()=>auth}).listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
process.env.ADMIN_EMAIL=email;process.env.BETTER_AUTH_URL=origin;
const auth=createAuth();
let userId;
try {
  const account=await createAuth({provisioning:true}).api.signUpEmail({body:{name:'Disposable validation account',email,password}});userId=account.user.id;
  const login=await fetch(origin+'/api/auth/sign-in/email',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(login.status,200);
  const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');assert.ok(cookie);
  assert.equal((await fetch(origin+'/api/admin/content')).status,401);
  const read=await fetch(origin+'/api/admin/content',{headers:{Cookie:cookie}});assert.equal(read.status,200);
  const current=await read.json();const draft=structuredClone(current.draft);draft.hero.description='Disposable validation draft';
  const save=await fetch(origin+'/api/admin/content',{method:'PUT',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({revision:current.revision,content:draft})});assert.equal(save.status,200);const saved=await save.json();
  const publicData=await (await fetch(origin+'/api/content')).json();assert.deepEqual(publicData.content,before.published);
  const stale=await fetch(origin+'/api/admin/content',{method:'PUT',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({revision:current.revision,content:draft})});assert.equal(stale.status,409);
  // Publish the unchanged original content, then verify the copy and audit record.
  const restoreDraft=await fetch(origin+'/api/admin/content',{method:'PUT',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({revision:saved.revision,content:before.draft})});assert.equal(restoreDraft.status,200);const restored=await restoreDraft.json();
  const publish=await fetch(origin+'/api/admin/publish',{method:'POST',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({revision:restored.revision})});assert.equal(publish.status,200);
  assert.deepEqual((await (await fetch(origin+'/api/content')).json()).content,before.draft);
  const signup=await fetch(origin+'/api/auth/sign-up/email',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Blocked',email:'blocked@example.invalid',password})});assert.equal(signup.ok,false);
  console.log('REAL DATABASE CHECKS PASSED: login, session, access control, draft isolation, revision conflicts, publication, closed registration.');
} finally {
  await pool.query('UPDATE aw_content SET draft=$1::jsonb,published=$2::jsonb,revision=$3,published_revision=$4,updated_at=$5,published_at=$6 WHERE id=1',[JSON.stringify(before.draft),JSON.stringify(before.published),before.revision,before.published_revision,before.updated_at,before.published_at]);
  if(userId){await pool.query('DELETE FROM aw_publications WHERE editor=$1',[userId]);await pool.query('DELETE FROM session WHERE "userId"=$1',[userId]);await pool.query('DELETE FROM account WHERE "userId"=$1',[userId]);await pool.query('DELETE FROM "user" WHERE id=$1',[userId]);}
  await new Promise(resolve=>server.close(resolve));process.env.ADMIN_EMAIL=previousEmail;process.env.BETTER_AUTH_URL=previousURL;await pool.end();
}
