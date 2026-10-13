import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { osmProspects, webProspects, searchExternal, searchSchema, fetchJSON } from '../server/prospect-providers.js';
import { createGateway } from '../infra/searxng/gateway.mjs';

const origin='https://awdevelop-globe.vercel.app';
process.env.BETTER_AUTH_URL=origin;
const headers={Origin:origin,'Content-Type':'application/json'};
const query={provider:'osm',category:'restaurant',location:{name:'Botafogo, Rio de Janeiro',lat:-22.95,lon:-43.18},radius:1,keyword:''};
const osm={elements:[{type:'node',id:7,lat:-22.95,lon:-43.18,tags:{name:'Restaurante Teste',phone:'21999999999',website:'example.com','contact:email':'hello@example.com','addr:city':'Rio de Janeiro','addr:state':'RJ'}}]};
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
async function fixture(t,{role='owner',session=true,env={},fetcher=async()=>json(osm),throttled=false,duplicate=false}={}){
  const calls=[],cache=new Map();
  const execute=async(sql,params=[])=>{
    calls.push({sql,params});
    if(sql.startsWith('SELECT id,payload'))return {rows:cache.has(params[0])?[cache.get(params[0])]:[]};
    if(sql.startsWith('INSERT INTO aw_prospect_cache')){const record={id:params[0],payload:JSON.parse(params[2]),created_at:'2026-10-13T12:00:00Z'};cache.set(params[1],record);return {rows:[record]};}
    if(sql.startsWith('INSERT INTO aw_prospect_limits'))return {rows:throttled?[]:[{key:params[0]}]};
    if(sql.startsWith('INSERT INTO aw_prospect_usage'))return {rows:[{count:1}]};
    if(sql.startsWith('SELECT payload'))return {rows:[...cache.values()].filter(x=>x.id===params[0])};
    if(sql.startsWith('SELECT id FROM aw_quotes'))return {rows:duplicate?[{id:'12'}]:[]};
    if(sql.startsWith('INSERT INTO aw_quotes'))return {rows:[{id:'99'}],rowCount:1};
    return {rows:[],rowCount:0};
  };
  const client={query:execute,release(){}};
  const app=createApp({auth:()=>({api:{getSession:async()=>session?{user:{id:'u1',email:'owner@example.com'}}:null}}),access:async()=>({active:true,role,name:'Owner'}),db:()=>({query:execute,connect:async()=>client}),prospectingFetch:fetcher,prospectingEnv:env});
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
  return {url:`http://127.0.0.1:${server.address().port}`,calls,cache};
}
const search=(f,body=query)=>fetch(f.url+'/api/admin/prospecting/search',{method:'POST',headers,body:JSON.stringify(body)});

test('Prospecção exige sessão comercial e origem autorizada',async t=>{
  for(const options of [{session:false},{role:'editor'}]){const f=await fixture(t,options);assert.equal((await search(f)).status,options.session===false?401:403);assert.equal(f.calls.length,0);}
  const f=await fixture(t);assert.equal((await fetch(f.url+'/api/admin/prospecting/search',{method:'POST',headers:{...headers,Origin:'https://external.invalid'},body:JSON.stringify(query)})).status,403);
});
test('Consulta externa validada, limitada e armazenada; repetir utiliza cache sem chamar provedor',async t=>{
  let count=0;const f=await fixture(t,{fetcher:async(url,options)=>{count++;assert.match(String(url),/^https:\/\/overpass-api.de/);assert.match(options.body,/around/);return json(osm);}});
  const first=await search(f);assert.equal(first.status,200);const result=await first.json();assert.equal(result.items[0].name,'Restaurante Teste');assert.equal(result.cached,false);
  const second=await (await search(f)).json();assert.equal(second.cached,true);assert.equal(second.searchId,result.searchId);assert.equal(count,1);
  assert.equal(f.calls.filter(x=>x.sql.startsWith('INSERT INTO aw_prospect_limits')).length,1);
});
test('Geocodificação é manual, restrita ao Brasil, identificada e usa cache',async t=>{
  let count=0;const f=await fixture(t,{fetcher:async(url,options)=>{count++;assert.equal(url.searchParams.get('countrycodes'),'br');assert.match(options.headers['User-Agent'],/AWDevelopLeads/);return json([{display_name:'Botafogo, Rio de Janeiro',lat:'-22.95',lon:'-43.18'}]);}});
  for(let i=0;i<2;i++){const r=await fetch(f.url+'/api/admin/prospecting/locations?q=Botafogo');assert.equal(r.status,200);assert.equal((await r.json()).items[0].lat,-22.95);}
  assert.equal(count,1);
});
test('Raio, categoria e coordenadas inválidos não geram consulta externa',async t=>{
  const f=await fixture(t,{fetcher:async()=>{throw Error('Não deveria consultar');}});
  for(const body of [{...query,radius:100},{...query,category:'arbitrary";out;'}, {...query,location:{...query.location,lat:90}}])assert.equal((await search(f,body)).status,400);
  assert.equal(f.calls.length,0);
  assert.equal(searchSchema.safeParse(query).success,true);
});
test('Indisponibilidade, limites e SearXNG não configurado retornam mensagens úteis',async t=>{
  const limited=await fixture(t,{throttled:true});assert.equal((await search(limited)).status,429);
  const unavailable=await fixture(t,{fetcher:async()=>{throw Error('Offline');}});assert.equal((await search(unavailable)).status,502);
  const missing=await fixture(t);assert.equal((await search(missing,{...query,provider:'web'})).status,503);assert.equal(missing.calls.filter(x=>x.sql.startsWith('INSERT INTO aw_prospect_limits')).length,0);
  const disabled=await fixture(t,{env:{PROSPECTING_OSM_DISABLED:'true'}});assert.equal((await search(disabled)).status,503);
});
test('OpenStreetMap não inventa contatos, valida links e conserva origem',()=>{
  const items=osmProspects({elements:[{type:'way',id:1,tags:{name:'Negócio',website:'javascript:alert(1)',email:'not-an-email','addr:state':'Rio de Janeiro'}}]},query);
  assert.equal(items[0].email,'');assert.equal(items[0].website,'');assert.equal(items[0].phone,'');assert.equal(items[0].state,'');assert.equal(items[0].sourceUrl,'https://www.openstreetmap.org/way/1');
});
test('Resultados web são sugestões, sem tratar diretórios como sites oficiais; elimina duplicados e links inseguros',()=>{
  const data={results:[{url:'https://directory.example/lead',title:'Lead',content:'Descrição'},{url:'https://directory.example/lead',title:'Duplicado'},{url:'javascript:alert(1)',title:'Inseguro'}]};
  const items=webProspects(data,query);assert.equal(items.length,1);assert.equal(items[0].website,'');assert.equal(items[0].phone,'');assert.equal(items[0].sourceUrl,'https://directory.example/lead');
});
test('Conector SearXNG usa o serviço configurado e mantém token no servidor',async()=>{
  const result=await searchExternal({...query,provider:'web'},{env:{SEARXNG_URL:'https://search.example',SEARXNG_TOKEN:'test-token'},fetcher:async(url,options)=>{assert.equal(url.hostname,'search.example');assert.equal(url.searchParams.get('format'),'json');assert.equal(options.headers.Authorization,'Bearer test-token');return json({results:[{title:'Negócio',url:'https://business.example'}]});}});
  assert.equal(result.length,1);
});
test('Importação usa resultado armazenado, salva revisão e registra autor em transação',async t=>{
  const f=await fixture(t),result=await (await search(f)).json();
  const response=await fetch(f.url+'/api/admin/prospecting/import',{method:'POST',headers,body:JSON.stringify({searchId:result.searchId,key:result.items[0].key,name:'Nome revisado',phone:'',email:'',website:'',service:'Landing page',sourceUrl:'https://fake.invalid'})});
  assert.equal(response.status,201);assert.deepEqual(await response.json(),{id:'99',duplicate:false});
  const insert=f.calls.find(x=>x.sql.startsWith('INSERT INTO aw_quotes'));assert.equal(insert.params[2],'Nome revisado');assert.equal(insert.params[14],'https://www.openstreetmap.org/node/7');
  assert.equal(f.calls.at(-1).sql,'COMMIT');assert.ok(f.calls.some(x=>x.sql.startsWith('INSERT INTO aw_crm_events')&&x.params[1]==='owner@example.com'));
});
test('Importação repetida retorna ficha existente sem criar novo lead; resultado não encontrado é recusado',async t=>{
  const f=await fixture(t,{duplicate:true}),result=await (await search(f)).json();
  const body={searchId:result.searchId,key:result.items[0].key,name:'Lead',phone:'',email:'',website:'',service:'Site'};
  const response=await fetch(f.url+'/api/admin/prospecting/import',{method:'POST',headers,body:JSON.stringify(body)});assert.equal(response.status,200);assert.deepEqual(await response.json(),{id:'12',duplicate:true});assert.ok(!f.calls.some(x=>x.sql.startsWith('INSERT INTO aw_quotes')));
  const expired=await fetch(f.url+'/api/admin/prospecting/import',{method:'POST',headers,body:JSON.stringify({...body,key:'unknown'})});assert.equal(expired.status,409);
});
test('Resposta externa malformada e resposta grande são rejeitadas',async()=>{
  await assert.rejects(fetchJSON('https://provider.example',{},async()=>new Response('not JSON')),/formato inválido/);
  await assert.rejects(fetchJSON('https://provider.example',{},async()=>new Response('{}',{headers:{'content-length':'3000000'}})),/dados demais/);
});
test('Gateway privado exige autenticação e só encaminha pesquisa JSON',async t=>{
  const token='testing-only-not-a-production-token';let called=0;
  const server=createGateway({token,fetcher:async(url)=>{called++;assert.equal(url.searchParams.get('format'),'json');return json({results:[{url:'https://example.com',title:'Lead'}]});}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base+'/search?q=lead')).status,401);
  assert.equal((await fetch(base+'/other',{headers:{Authorization:'Bearer '+token}})).status,404);
  const response=await fetch(base+'/search?q=lead',{headers:{Authorization:'Bearer '+token}});assert.equal(response.status,200);assert.equal((await response.json()).results.length,1);assert.equal(called,1);
});
