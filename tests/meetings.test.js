import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {createApp} from '../server/app.js';
const key=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'});
const appId='vpaas-magic-cookie-'+'b'.repeat(32);
const env={JAAS_APP_ID:appId,JAAS_API_KEY_ID:appId+'/test',JAAS_PRIVATE_KEY:key};
const room='c3263f71-d475-43c1-8f1e-672a22dd2f83';
const expectedOrigin=new URL(process.env.BETTER_AUTH_URL||'http://localhost:3000').origin;
async function fixture(t,{role='owner',session=true,active=true,configured=true}={}){
 const app=createApp({auth:()=>({api:{getSession:async()=>session?{user:{id:'test-user',email:'test@example.invalid'}}:null}}),access:async()=>({active,role,name:'Equipe'}),meetingsEnv:configured?env:{}});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 return{url:'http://127.0.0.1:'+server.address().port,post:(path,body,origin=expectedOrigin)=>fetch('http://127.0.0.1:'+server.address().port+path,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})};
}
test('Reuniões exigem sessão ativa e POST de mesma origem',async t=>{
 for(const options of [{session:false},{active:false}]){const f=await fixture(t,options);assert.equal((await fetch(f.url+'/api/admin/meetings/status')).status,401);assert.equal((await f.post('/api/admin/meetings/token',{room})).status,401);}
 const f=await fixture(t);assert.equal((await f.post('/api/admin/meetings/token',{room},'https://evil.example')).status,403);
});
test('Sem credenciais a seção informa pendência e não emite token',async t=>{
 const f=await fixture(t,{configured:false});const status=await(await fetch(f.url+'/api/admin/meetings/status')).json();assert.equal(status.configured,false);assert.equal(status.paidFeatures,false);
 const response=await f.post('/api/admin/meetings/token',{room});assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await response.json()),/jwt|PRIVATE KEY|JAAS_PRIVATE_KEY/);
});
test('Administrador cria convite, editor pode entrar mas não criar nem moderar',async t=>{
 const owner=await fixture(t);const created=await owner.post('/api/admin/meetings',{});assert.equal(created.status,201);assert.match((await created.json()).room,/^[a-f0-9-]{36}$/);
 const editor=await fixture(t,{role:'editor'});assert.equal((await editor.post('/api/admin/meetings',{})).status,403);
 const response=await editor.post('/api/admin/meetings/token',{room});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const data=await response.json();
 assert.equal(JSON.parse(Buffer.from(data.jwt.split('.')[1],'base64url')).context.user.moderator,'false');
 assert.equal((await editor.post('/api/admin/meetings/token',{room:'*'})).status,400);assert.equal((await editor.post('/api/admin/meetings/token',{room:[room]})).status,400);
});
