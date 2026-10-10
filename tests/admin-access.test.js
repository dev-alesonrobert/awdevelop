import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdmin, setupRecipient } from '../server/admin-access.js';
import { createApp } from '../server/app.js';
process.env.ADMIN_EMAIL='owner@example.com';
process.env.ADMIN_SETUP_TOKEN='owner-test-invite-long-enough';
process.env.PARTNER_ADMIN_EMAIL='partner@example.com';
process.env.PARTNER_ADMIN_SETUP_TOKEN='partner-test-invite-long-enough';
process.env.BETTER_AUTH_URL='https://awdevelop-globe.vercel.app';
test('Somente os dois e-mails configurados recebem acesso',()=>{
 assert.ok(isAdmin('OWNER@example.com'));assert.ok(isAdmin('Partner@example.com'));assert.equal(isAdmin('other@example.com'),false);assert.equal(isAdmin(undefined),false);
});
test('Convites distintos vinculam cada administrador ao próprio e-mail',()=>{
 assert.equal(setupRecipient('owner-test-invite-long-enough').email,'owner@example.com');assert.equal(setupRecipient('partner-test-invite-long-enough').email,'partner@example.com');assert.equal(setupRecipient('invalid'),null);assert.equal(setupRecipient(null),null);
});
async function fixture(t,{session=null,existing=false,consumed=false,failProvision=false}={}){
 let created;
 let pending=consumed, creations=0;
 const client={query:async sql=>{
  if(sql==='BEGIN')pending=consumed;
  if(sql==='COMMIT')consumed=pending;
  if(sql==='ROLLBACK')pending=consumed;
  if(sql.startsWith('SELECT email,name,role,consumed_at'))return {rows:[{email:'partner@example.com',name:'Partner',role:'admin',consumed_at:consumed?'2026-10-10':null}]};
  if(sql.startsWith('SELECT active FROM aw_members'))return {rows:[{active:true}]};
  if(sql.startsWith('UPDATE aw_setup_invites'))pending=true;
  return sql.startsWith('SELECT id')?{rowCount:existing?1:0,rows:[]}:{rows:[]};
 },release(){}};
 const app=createApp({access:async email=>isAdmin(email)?{active:true,role:'admin',name:'Admin'}:null,auth:()=>({api:{getSession:async()=>session}}),db:()=>({connect:async()=>client,query:async()=>({rows:[{draft:{},revision:1}]})}),provision:()=>({api:{signUpEmail:async value=>{if(failProvision)throw new Error('Provision failed');creations++;created=value.body;return {user:{id:'partner'}};}}})});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 return {url:`http://127.0.0.1:${server.address().port}`,created:()=>created,consumed:()=>consumed,creations:()=>creations};
}
test('Sessão do sócio acessa o editor e sessão não autorizada é recusada',async t=>{
 const partner=await fixture(t,{session:{user:{id:'partner',email:'partner@example.com'}}});assert.equal((await fetch(partner.url+'/api/admin/content')).status,200);
 const stranger=await fixture(t,{session:{user:{id:'stranger',email:'other@example.com'}}});assert.equal((await fetch(stranger.url+'/api/admin/content')).status,401);
});
const headers={Origin:'https://awdevelop-globe.vercel.app','Content-Type':'application/json'};
const body={token:'partner-test-invite-long-enough',password:'test-password-long',confirmation:'test-password-long',email:'attacker@example.com'};
test('Convite do sócio cria somente seu e-mail mesmo com e-mail adulterado no pedido',async t=>{
 const f=await fixture(t);assert.equal((await fetch(f.url+'/api/setup',{method:'POST',headers,body:JSON.stringify(body)})).status,200);assert.equal(f.created().email,'partner@example.com');
});
test('Convite não altera senha de uma conta existente',async t=>{
 const f=await fixture(t,{existing:true});assert.equal((await fetch(f.url+'/api/setup',{method:'POST',headers,body:JSON.stringify(body)})).status,409);assert.equal(f.created(),undefined);
});
test('Convite inválido e origem externa não criam contas',async t=>{
 const f=await fixture(t);assert.equal((await fetch(f.url+'/api/setup',{method:'POST',headers,body:JSON.stringify({...body,token:'invalid'})})).status,401);
 assert.equal((await fetch(f.url+'/api/setup',{method:'POST',headers:{...headers,Origin:'https://other.example'},body:JSON.stringify(body)})).status,403);assert.equal(f.created(),undefined);
});

test('O token é consumido após criar a senha e não volta a funcionar sem a conta',async t=>{
 const f=await fixture(t);
 const submit=()=>fetch(f.url+'/api/setup',{method:'POST',headers,body:JSON.stringify(body)});
 assert.equal((await submit()).status,200);assert.equal(f.consumed(),true);
 assert.equal((await submit()).status,409);assert.equal(f.creations(),1);
});
test('Falha na criação não consome o convite',async t=>{
 const f=await fixture(t,{failProvision:true});
 assert.equal((await fetch(f.url+'/api/setup',{method:'POST',headers,body:JSON.stringify(body)})).status,503);assert.equal(f.consumed(),false);
});
test('Um convite previamente consumido não cria outra conta',async t=>{
 const f=await fixture(t,{consumed:true});
 assert.equal((await fetch(f.url+'/api/setup',{method:'POST',headers,body:JSON.stringify(body)})).status,409);assert.equal(f.creations(),0);
});
