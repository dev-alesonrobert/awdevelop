import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app.js';
import { quoteSchema,digest } from '../server/management.js';
const initial=JSON.parse(await readFile(new URL('../dist/content-default.json',import.meta.url),'utf8'));
const origin='https://awdevelop-globe.vercel.app';process.env.BETTER_AUTH_URL=origin;process.env.ADMIN_EMAIL='owner@example.com';
const headers={Origin:origin,'Content-Type':'application/json'};
const quote={requestId:randomUUID(),name:'Cliente Teste',email:'client@example.com',phone:'',company:'',service:'Landing page',idea:'Gostaria de apresentar minha empresa.',stage:'Do zero',timeline:'Em breve',consent:true,website:''};
async function fixture(t,{role='owner',active=true,query=async()=>({rows:[]}),session=true,provision}={}){
 const calls=[];const execute=async(sql,params)=>{calls.push({sql,params});return query(sql,params);};
 const client={query:execute,release(){}};
 const app=createApp({auth:()=>({api:{getSession:async()=>session?{user:{id:'user-1',email:'owner@example.com'}}:null}}),access:async()=>({active,role,name:'Owner'}),db:()=>({query:execute,connect:async()=>client}),provision});
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 return {url:`http://127.0.0.1:${server.address().port}`,calls};
}
test('Restauração troca somente o rascunho e registra o responsável',async t=>{
 const saved={...initial,sections:[{id:'contato',type:'builtin'},{id:'inicio',type:'builtin'}]};
 const f=await fixture(t,{query:async sql=>sql.startsWith('SELECT content')?{rows:[{content:saved}]}:sql.startsWith('UPDATE aw_content')?{rows:[{revision:9}]}:{rows:[]}});
 assert.equal((await fetch(f.url+'/api/admin/history/3/restore',{method:'POST',headers,body:JSON.stringify({revision:8})})).status,200);
 assert.ok(f.calls.some(c=>c.sql.includes('SET draft=')));assert.equal(f.calls.some(c=>c.sql.includes('SET published=')),false);assert.ok(f.calls.some(c=>c.sql.includes('INSERT INTO aw_activity')));
 assert.deepEqual(JSON.parse(f.calls.find(c=>c.sql.includes('SET draft=')).params[0]).sections,saved.sections);
});
test('Restauração de revisão desatualizada reverte a transação',async t=>{
 const f=await fixture(t,{query:async sql=>sql.startsWith('SELECT content')?{rows:[{content:initial}]}:{rows:[]}});
 assert.equal((await fetch(f.url+'/api/admin/history/3/restore',{method:'POST',headers,body:JSON.stringify({revision:1})})).status,409);assert.equal(f.calls.at(-1).sql,'ROLLBACK');
});
test('Editor não publica, gerencia administradores nem consulta orçamentos',async t=>{
 const f=await fixture(t,{role:'editor'});
 for(const [path,method,body] of [['/api/admin/publish','POST',{revision:1}],['/api/admin/members','GET'],['/api/admin/invites','POST',{email:'x@example.com',name:'Name',role:'admin'}],['/api/admin/quotes','GET']]){
  assert.equal((await fetch(f.url+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})})).status,403);
 }assert.equal(f.calls.length,0);
});
test('Administrador não concede acessos: gestão exclusiva do proprietário',async t=>{
 const f=await fixture(t,{role:'admin'});assert.equal((await fetch(f.url+'/api/admin/members')).status,403);
});
test('Conta desativada perde acesso mesmo com sessão válida',async t=>{
 const f=await fixture(t,{active:false});assert.equal((await fetch(f.url+'/api/admin/content')).status,401);assert.equal(f.calls.length,0);
});
test('Proprietário não remove seu próprio acesso',async t=>{
 const f=await fixture(t);assert.equal((await fetch(f.url+'/api/admin/members',{method:'PATCH',headers,body:JSON.stringify({email:'owner@example.com',role:'editor',active:false})})).status,403);assert.equal(f.calls.length,0);
});
test('Revogar acesso também revoga sessões e convites pendentes',async t=>{
 const f=await fixture(t,{query:async sql=>sql.startsWith('UPDATE aw_members')?{rows:[{email:'other@example.com'}]}:{rows:[]}});
 assert.equal((await fetch(f.url+'/api/admin/members',{method:'PATCH',headers,body:JSON.stringify({email:'other@example.com',role:'editor',active:false})})).status,200);
 assert.ok(f.calls.some(c=>c.sql.startsWith('DELETE FROM session')));assert.ok(f.calls.some(c=>c.sql.startsWith('UPDATE aw_setup_invites')));
});
test('Convite dinâmico guarda hash e expira em sete dias',async t=>{
 const f=await fixture(t,{query:async()=>({rows:[],rowCount:0})});
 const response=await fetch(f.url+'/api/admin/invites',{method:'POST',headers,body:JSON.stringify({email:'new@example.com',name:'Novo Editor',role:'editor'})});assert.equal(response.status,201);const data=await response.json();const token=new URL(data.url).hash.slice(1);
 const insert=f.calls.find(c=>c.sql.startsWith('INSERT INTO aw_setup_invites'));assert.equal(insert.params[0],digest(token));assert.equal(insert.params[1],'new@example.com');assert.ok(insert.sql.includes("interval '7 days'"));assert.equal(f.calls.some(c=>c.params?.includes(token)),false);
});
test('Orçamento exige consentimento e dados válidos',async t=>{
 const f=await fixture(t,{session:false});assert.equal((await fetch(f.url+'/api/quotes',{method:'POST',headers,body:JSON.stringify({...quote,consent:false})})).status,400);assert.equal(f.calls.length,0);assert.equal(quoteSchema.safeParse({...quote,email:'invalid'}).success,false);
});
test('Envio público persiste o orçamento sem sessão administrativa',async t=>{
 const f=await fixture(t,{session:false,query:async sql=>sql.startsWith('INSERT INTO aw_quote_limits')?{rows:[{count:1}]}:{rows:[]}});
 assert.equal((await fetch(f.url+'/api/quotes',{method:'POST',headers,body:JSON.stringify(quote)})).status,201);assert.ok(f.calls.some(c=>c.sql.startsWith('INSERT INTO aw_quotes')));
});
test('Reenvio do mesmo pedido não duplica orçamento',async t=>{
 const {requestId,website,...payload}=quoteSchema.parse(quote);
 const f=await fixture(t,{session:false,query:async sql=>sql.startsWith('SELECT payload_hash')?{rows:[{payload_hash:digest(JSON.stringify(payload))}]}:{rows:[]}});
 assert.equal((await fetch(f.url+'/api/quotes',{method:'POST',headers,body:JSON.stringify(quote)})).status,200);assert.equal(f.calls.some(c=>c.sql.startsWith('INSERT INTO aw_quotes')),false);
});
test('Limite de envios e honeypot impedem novos registros',async t=>{
 const f=await fixture(t,{session:false});assert.equal((await fetch(f.url+'/api/quotes',{method:'POST',headers,body:JSON.stringify(quote)})).status,429);assert.equal(f.calls.some(c=>c.sql.startsWith('INSERT INTO aw_quotes')),false);
 const trap=await fixture(t,{session:false});assert.equal((await fetch(trap.url+'/api/quotes',{method:'POST',headers,body:JSON.stringify({...quote,website:'spam'})})).status,202);assert.equal(trap.calls.length,0);
});
test('Orçamento não permite atualização com revisão antiga',async t=>{
 const f=await fixture(t);assert.equal((await fetch(f.url+'/api/admin/quotes/1',{method:'PATCH',headers,body:JSON.stringify({status:'won',notes:'Fechado',revision:1})})).status,409);
});
test('Convite expirado não cria conta',async t=>{
 let created=false;const f=await fixture(t,{query:async sql=>sql.startsWith('SELECT email,name,role,consumed_at')?{rows:[{email:'new@example.com',consumed_at:null,expires_at:'2020-01-01'}]}:{rows:[]},provision:()=>({api:{signUpEmail:async()=>{created=true;}}})});
 assert.equal((await fetch(f.url+'/api/setup',{method:'POST',headers,body:JSON.stringify({token:'a-valid-length-random-token',password:'long-password-here',confirmation:'long-password-here'})})).status,409);assert.equal(created,false);
});

test('Notificações exigem sessão e permissão comercial',async t=>{
 for(const options of [{session:false},{role:'editor'}]){const f=await fixture(t,options);assert.equal((await fetch(f.url+'/api/admin/notifications')).status,options.session===false?401:403);assert.equal((await fetch(f.url+'/api/admin/notifications/read',{method:'POST',headers,body:JSON.stringify({through:'12'})})).status,options.session===false?401:403);assert.equal(f.calls.length,0);}
});
test('Notificações consultam apenas leitura da conta autenticada',async t=>{
 const f=await fixture(t,{query:async sql=>({rows:sql.includes('aw_crm_tasks')?[]:[{count:2,latest:'12',items:[]}]})});const r=await fetch(f.url+'/api/admin/notifications');assert.equal(r.status,200);assert.deepEqual(await r.json(),{count:2,latest:'12',items:[],tasks:[],taskCount:0});assert.deepEqual(f.calls[0].params,['owner@example.com']);assert.match(f.calls[0].sql,/NOT EXISTS/);
});
test('Leitura não muda orçamento e preserva pedidos futuros',async t=>{
 const f=await fixture(t);assert.equal((await fetch(f.url+'/api/admin/notifications/read',{method:'POST',headers,body:JSON.stringify({through:'12',email:'other@example.com'})})).status,200);assert.deepEqual(f.calls[0].params,['owner@example.com','12']);assert.match(f.calls[0].sql,/INSERT INTO aw_quote_reads/);assert.match(f.calls[0].sql,/id<=\$2/);assert.match(f.calls[0].sql,/ON CONFLICT DO NOTHING/);assert.equal(f.calls.some(c=>c.sql.includes('UPDATE aw_quotes')),false);
});
test('Cursor inválido e origem externa não alteram leitura',async t=>{
 const f=await fixture(t);assert.equal((await fetch(f.url+'/api/admin/notifications/read',{method:'POST',headers,body:JSON.stringify({through:'-1'})})).status,400);assert.equal((await fetch(f.url+'/api/admin/notifications/read',{method:'POST',headers:{...headers,Origin:'https://other.invalid'},body:JSON.stringify({through:'12'})})).status,403);assert.equal(f.calls.length,0);
});
