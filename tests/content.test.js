import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { contentSchema } from '../server/content-schema.js';
import { isAdmin } from '../server/admin-access.js';
import { createApp } from '../server/app.js';
const initial=JSON.parse(await readFile(new URL('../dist/content-default.json',import.meta.url),'utf8'));
test('Conteúdo inicial corresponde ao contrato do editor',()=>assert.equal(contentSchema.parse(initial).portfolio.projects.length,3));
test('Rejeita URLs executáveis e IDs duplicados',()=>{
  let data=structuredClone(initial);data.settings.logo='javascript:alert(1)';assert.equal(contentSchema.safeParse(data).success,false);
  data=structuredClone(initial);data.portfolio.projects[1].id=data.portfolio.projects[0].id;assert.equal(contentSchema.safeParse(data).success,false);
});
test('Impede portfólio vazio e intervalos excessivos',()=>{
  let data=structuredClone(initial);data.portfolio.projects=[];assert.equal(contentSchema.safeParse(data).success,false);
  data=structuredClone(initial);data.settings.rotationSeconds=0;assert.equal(contentSchema.safeParse(data).success,false);
});
test('Estrutura aceita versões antigas e recusa seções duplicadas, desconhecidas ou vazias',()=>{
  assert.equal(contentSchema.safeParse(initial).success,true);
  for(const sections of [[],[{id:'contato',type:'builtin'},{id:'contato',type:'builtin'}],[{id:'invalida',type:'builtin'}]]){
    assert.equal(contentSchema.safeParse({...initial,sections}).success,false);
  }
});
test('Seções personalizadas validam URLs, acessibilidade e limite de blocos',()=>{
  const section={id:'custom-teste',type:'custom',title:'Serviço',description:'Texto',image:'',alt:'',button:'',url:''};
  assert.equal(contentSchema.safeParse({...initial,sections:[section]}).success,true);
  for(const change of [{url:'javascript:alert(1)',button:'Abrir'},{image:'https://example.com/a.png'},{button:'Abrir'},{image:'https://user:pass@example.com/a.png',alt:'Imagem'}])assert.equal(contentSchema.safeParse({...initial,sections:[{...section,...change}]}).success,false);
  assert.equal(contentSchema.safeParse({...initial,sections:Array.from({length:21},(_,i)=>({...section,id:'custom-'+i}))}).success,false);
});
async function fixture(t,{session=null,query=async()=>({rows:[]}),upload}={}){
  process.env.ADMIN_EMAIL='owner@example.com';process.env.BETTER_AUTH_URL='https://awdevelop-globe.vercel.app';
  const app=createApp({auth:()=>({api:{getSession:async()=>session}}),db:()=>({query}),access:async email=>isAdmin(email)?{active:true,role:'owner',name:'Owner'}:null,upload});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
const owner={user:{id:'owner',email:'owner@example.com'}};
test('Rascunho e upload recusam visitantes sem consultar o conteúdo',async t=>{
  let accessed=false;const url=await fixture(t,{query:async()=>{accessed=true;return {rows:[]};}});
  assert.equal((await fetch(url+'/api/admin/content')).status,401);
  assert.equal((await fetch(url+'/api/admin/upload',{method:'POST',body:'test'})).status,401);assert.equal(accessed,false);
});
test('Uma sessão de outro usuário não recebe permissão de editor',async t=>{
  const url=await fixture(t,{session:{user:{email:'other@example.com'}}});assert.equal((await fetch(url+'/api/admin/content')).status,401);
});
test('Uma origem externa não consegue salvar alterações',async t=>{
  const url=await fixture(t,{session:owner});const response=await fetch(url+'/api/admin/content',{method:'PUT',headers:{Origin:'https://attacker.example','Content-Type':'application/json'},body:JSON.stringify({revision:0,content:initial})});assert.equal(response.status,403);
});
test('Conflito de revisão retorna 409 sem sobrescrever um rascunho novo',async t=>{
  const url=await fixture(t,{session:owner});const response=await fetch(url+'/api/admin/content',{method:'PUT',headers:{Origin:'https://awdevelop-globe.vercel.app','Content-Type':'application/json'},body:JSON.stringify({revision:0,content:initial})});assert.equal(response.status,409);
});
test('Conteúdo inválido não é gravado no banco',async t=>{
  let accessed=false;const url=await fixture(t,{session:owner,query:async()=>{accessed=true;return {rows:[]};}});const data=structuredClone(initial);data.settings.background='red';const response=await fetch(url+'/api/admin/content',{method:'PUT',headers:{Origin:'https://awdevelop-globe.vercel.app','Content-Type':'application/json'},body:JSON.stringify({revision:0,content:data})});assert.equal(response.status,400);assert.equal(accessed,false);
});
test('Endpoint público entrega somente a versão publicada',async t=>{
  const url=await fixture(t,{query:async(sql)=>{assert.match(sql,/SELECT published,/);return {rows:[{published:initial,published_at:'2026-10-10'}]};}});const response=await fetch(url+'/api/content');const data=await response.json();assert.deepEqual(data.content,initial);assert.equal(data.draft,undefined);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('Uma imagem com tipo falso é recusada antes do armazenamento',async t=>{
  let uploaded=false;const url=await fixture(t,{session:owner,upload:async()=>{uploaded=true;}});const response=await fetch(url+'/api/admin/upload',{method:'POST',headers:{Origin:'https://awdevelop-globe.vercel.app','Content-Type':'image/png'},body:'not-a-png'});assert.equal(response.status,400);assert.equal(uploaded,false);
});
