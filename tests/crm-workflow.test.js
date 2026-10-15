import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {identityKeys,duplicateSchema,contactQueueSql} from '../server/crm-workflow.js';
const origin='https://awdevelop-globe.vercel.app';process.env.BETTER_AUTH_URL=origin;
const headers={Origin:origin,'Content-Type':'application/json'};
async function fixture(t,{role='owner',session=true,query=async()=>({rows:[],rowCount:0})}={}) {
 const calls=[];const execute=async(sql,params)=>{calls.push({sql,params});return query(sql,params);};
 const app=createApp({auth:()=>({api:{getSession:async()=>session?{user:{id:'qa',email:'owner@example.com'}}:null}}),access:async()=>({active:true,role,name:'Owner'}),db:()=>({query:execute})});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 return {url:'http://127.0.0.1:'+server.address().port,calls};
}
test('Identidades normalizam telefone brasileiro e acentos; domínios sociais não são identidades',()=>{
 const keys=identityKeys(duplicateSchema.parse({email:'TEST@example.com',phone:'+55 (21) 99999-0000',website:'https://www.example.com/path',company:'Clínica Saúde',city:'São Paulo'}));
 assert.deepEqual(keys,['test@example.com','21999990000','example.com','clinicasaude','saopaulo',null]);
 assert.equal(identityKeys(duplicateSchema.parse({website:'https://instagram.com/empresa',phone:'abc'}))[2],'');
 assert.equal(identityKeys(duplicateSchema.parse({phone:'abc'}))[1],'');
});
test('Fila e duplicidades recusam visitante, editor e origem externa',async t=>{
 for(const options of [{session:false},{role:'editor'}]) {
 const f=await fixture(t,options);
 assert.equal((await fetch(f.url+'/api/admin/crm/contact-queue')).status,options.session===false?401:403);
 assert.equal((await fetch(f.url+'/api/admin/crm/duplicates',{method:'POST',headers,body:'{}'})).status,options.session===false?401:403);
 assert.equal(f.calls.length,0);
 }
 const f=await fixture(t);
 assert.equal((await fetch(f.url+'/api/admin/crm/duplicates',{method:'POST',headers:{...headers,Origin:'https://external.invalid'},body:'{}'})).status,403);
});
test('Fila usa responsável autenticado, fuso de Brasília e exclui tarefas concluídas e negócios encerrados',async t=>{
 const f=await fixture(t,{query:async()=>({rows:[{id:'1',lead_id:'7',kind:'task',bucket:'today',total:3}]})});
 const response=await fetch(f.url+'/api/admin/crm/contact-queue');const data=await response.json();
 assert.equal(data.total,3);assert.equal(data.items[0].lead_id,'7');assert.equal(data.items[0].total,undefined);
 assert.deepEqual(f.calls[0].params,['owner@example.com']);assert.match(contactQueueSql,/America\/Sao_Paulo/);assert.match(contactQueueSql,/NOT t.done/);assert.match(contactQueueSql,/q.crm_stage NOT IN/);assert.match(contactQueueSql,/NOT EXISTS/);assert.match(contactQueueSql,/LIMIT 100/);
 await fetch(f.url+'/api/admin/crm/contact-queue?scope=team');assert.deepEqual(f.calls[1].params,[null]);
 assert.equal((await fetch(f.url+'/api/admin/crm/contact-queue?scope=invalid')).status,400);
});
test('Duplicidade usa parâmetros, exclui a própria ficha e retorna motivos e contato anterior',async t=>{
 const f=await fixture(t,{query:async()=>({rows:[{id:'9',reasons:['Telefone'],last_contact_at:'2026-10-14T12:00:00Z'}]})});
 const response=await fetch(f.url+'/api/admin/crm/duplicates',{method:'POST',headers,body:JSON.stringify({phone:'(21) 99999-0000',excludeId:'8'})});
 assert.equal(response.status,200);assert.equal((await response.json()).items[0].id,'9');assert.equal(f.calls[0].params[1],'21999990000');assert.equal(f.calls[0].params[5],'8');assert.match(f.calls[0].sql,/cardinality\(reasons\)>0/);
 assert.equal((await fetch(f.url+'/api/admin/crm/duplicates',{method:'POST',headers,body:'{"excludeId":"invalid"}'})).status,400);
});
test('Novos tipos de histórico são aceitos e preservam autor e conteúdo',async t=>{
 const f=await fixture(t,{query:async()=>({rows:[{id:'1'}],rowCount:1})});
 for(const kind of ['approach','response','whatsapp','email']){
 const response=await fetch(f.url+'/api/admin/crm/leads/7/events',{method:'POST',headers,body:JSON.stringify({kind,body:'Contato registrado manualmente.'})});
 assert.equal(response.status,201);assert.equal(f.calls.at(-1).params[1],'owner@example.com');assert.equal(f.calls.at(-1).params[2],kind);
 }
 assert.equal((await fetch(f.url+'/api/admin/crm/leads/7/events',{method:'POST',headers,body:'{"kind":"invalid","body":"Teste"}'})).status,400);
});
