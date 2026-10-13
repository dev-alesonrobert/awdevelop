import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { osmProspects, webProspects, searchExternal, searchSchema, fetchJSON } from '../server/prospect-providers.js';
import { createGateway } from '../infra/searxng/gateway.mjs';
import { createHmac } from 'node:crypto';

const origin='https://awdevelop-globe.vercel.app';
process.env.BETTER_AUTH_URL=origin;
const headers={Origin:origin,'Content-Type':'application/json'};
const query={provider:'osm',category:'restaurant',location:{name:'Botafogo, Rio de Janeiro',lat:-22.95,lon:-43.18},radius:1,keyword:''};
const osm={elements:[{type:'node',id:7,lat:-22.95,lon:-43.18,tags:{name:'Restaurante Teste',phone:'21999999999',website:'example.com','contact:email':'hello@example.com','addr:city':'Rio de Janeiro','addr:state':'RJ'}}]};
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
async function fixture(t,{role='owner',session=true,env={},fetcher=async()=>json(osm),throttled=false,duplicate=false,googleMonthlyUsed=0,googleDailyUsed=0,legacyExhausted=false,budgetOffline=false}={}){
  const calls=[],cache=new Map(),budgets=new Map();let snapshot;
  const execute=async(sql,params=[])=>{
    calls.push({sql,params});
    if(sql==='BEGIN'){snapshot=new Map(budgets);return {rows:[]};}
    if(sql==='ROLLBACK'){budgets.clear();for(const entry of snapshot||[])budgets.set(...entry);return {rows:[]};}
    if(sql.startsWith('SELECT')&&sql.includes("'month:'"))return {rows:[{month:'month:2026-10',day:'day:2026-10-13'}]};
    if(sql.startsWith('INSERT INTO aw_google_usage')){
      if(budgetOffline)throw Error('budget database unavailable');
      const period=params[0].startsWith('month:')?'month':'day',key=period+':'+params[1];
      const count=budgets.get(key)??(period==='month'?googleMonthlyUsed:googleDailyUsed);
      if(count>=params[2])return {rows:[]};budgets.set(key,count+1);return {rows:[{count:count+1}]};
    }
    if(sql.startsWith('SELECT id,payload'))return {rows:cache.has(params[0])?[cache.get(params[0])]:[]};
    if(sql.startsWith('INSERT INTO aw_prospect_cache')){const record={id:params[0],payload:JSON.parse(params[2]),created_at:'2026-10-13T12:00:00Z'};cache.set(params[1],record);return {rows:[record]};}
    if(sql.startsWith('INSERT INTO aw_prospect_limits'))return {rows:throttled?[]:[{key:params[0]}]};
    if(sql.startsWith('INSERT INTO aw_prospect_usage'))return {rows:legacyExhausted?[]:[{count:1}]};
    if(sql.startsWith('SELECT payload'))return {rows:[...cache.values()].filter(x=>x.id===params[0])};
    if(sql.startsWith('SELECT id FROM aw_quotes'))return {rows:duplicate?[{id:'12'}]:[]};
    if(sql.startsWith('INSERT INTO aw_quotes'))return {rows:[{id:'99'}],rowCount:1};
    return {rows:[],rowCount:0};
  };
  const client={query:execute,release(){}};
  const app=createApp({auth:()=>({api:{getSession:async()=>session?{user:{id:'u1',email:'owner@example.com'}}:null}}),access:async()=>({active:true,role,name:'Owner'}),db:()=>({query:execute,connect:async()=>client}),prospectingFetch:fetcher,prospectingEnv:env});
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
  return {url:`http://127.0.0.1:${server.address().port}`,calls,cache,budgets};
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
test('Binding privado tem prioridade, autentica com token derivado e limita tamanho da consulta',async()=>{
  const secret='testing-only-authentication-secret-12345';
  const result=await searchExternal({...query,provider:'web',keyword:'x'.repeat(100),location:{...query.location,name:'r'.repeat(500)}},{env:{SEARXNG_INTERNAL_URL:'http://search.internal/private/route/',SEARXNG_URL:'https://ignored.example',BETTER_AUTH_SECRET:secret},fetcher:async(url,options)=>{
    assert.equal(url.hostname,'search.internal');assert.equal(url.pathname,'/private/route/search');assert.ok(url.searchParams.get('q').length<=500);
    assert.equal(options.headers.Authorization,'Bearer '+createHmac('sha256',secret).update('awdevelop:searxng:v1').digest('hex'));
    assert.ok(!options.headers.Authorization.includes(secret));return json({results:[]});
  }});
  assert.deepEqual(result,[]);
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

const googleEnv={GOOGLE_PLACES_API_KEY:'testing-only-google-key',BETTER_AUTH_SECRET:'testing-only-authentication-secret-12345'};
const googleQuery={...query,provider:'google'};
const place={id:'ChIJ_test',displayName:{text:'Empresa Google Teste'},formattedAddress:'Rua de teste, Rio de Janeiro',googleMapsUri:'https://maps.google.com/?cid=123',attributions:[{provider:'Fornecedor',providerUri:'https://example.com'}]};
test('Google sem chave fica desabilitado e não consome quota nem expõe configuração',async t=>{
  const f=await fixture(t);const config=await (await fetch(f.url+'/api/admin/prospecting/config')).json();assert.equal(config.googleEnabled,false);
  assert.equal((await search(f,googleQuery)).status,503);assert.equal(f.calls.length,0);
});
test('Busca Google usa máscara Pro, chave no header e não persiste conteúdo nem reutiliza cache',async t=>{
  let count=0;const f=await fixture(t,{env:googleEnv,fetcher:async(url,options)=>{count++;assert.equal(String(url),'https://places.googleapis.com/v1/places:searchText');assert.equal(options.headers['X-Goog-Api-Key'],googleEnv.GOOGLE_PLACES_API_KEY);assert.ok(!options.headers['X-Goog-FieldMask'].includes('Phone'));assert.ok(!options.headers['X-Goog-FieldMask'].includes('*'));const body=JSON.parse(options.body);assert.equal(body.pageSize,20);assert.equal(body.regionCode,'BR');assert.equal(body.locationBias.circle.center.latitude,query.location.lat);return json({places:[place,place]});}});
  for(let i=0;i<2;i++){const response=await search(f,googleQuery);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);const data=await response.json();assert.equal(data.cached,false);assert.equal(data.items.length,1);assert.equal(data.items[0].source,'Google Maps');assert.equal(data.items[0].phone,'');assert.ok(data.items[0].detailToken);assert.ok(!JSON.stringify(data).includes(googleEnv.GOOGLE_PLACES_API_KEY));}
  assert.equal(count,2);assert.ok(!f.calls.some(x=>x.sql.includes('aw_prospect_cache')));assert.ok(!JSON.stringify(f.calls).includes(place.displayName.text));
});
test('Detalhes Google exigem referência válida, consultam contatos sob demanda e nunca armazenam dados',async t=>{
  let count=0;const f=await fixture(t,{env:googleEnv,fetcher:async(url,options)=>{count++;if(count===1)return json({places:[place]});assert.equal(new URL(url).pathname,'/v1/places/ChIJ_test');assert.match(options.headers['X-Goog-FieldMask'],/internationalPhoneNumber,websiteUri/);return json({...place,internationalPhoneNumber:'+55 21 99999-9999',websiteUri:'https://empresa.example'});}});
  const result=await (await search(f,googleQuery)).json();const token=result.items[0].detailToken;
  const details=token=>fetch(f.url+'/api/admin/prospecting/google-details',{method:'POST',headers,body:JSON.stringify({token})});
  assert.equal((await details(token+'tampered')).status,409);assert.equal(count,1);
  const response=await details(token);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);const item=(await response.json()).item;assert.equal(item.phone,'+55 21 99999-9999');assert.equal(item.email,'');assert.equal(item.detailsLoaded,true);assert.ok(!f.calls.some(x=>x.sql.includes('aw_prospect_cache')));
  const imported=await fetch(f.url+'/api/admin/prospecting/import',{method:'POST',headers,body:JSON.stringify({searchId:result.searchId,key:item.key,name:item.name,phone:item.phone,email:'',website:item.website,service:'Site'})});assert.equal(imported.status,400);assert.ok(!f.calls.some(x=>x.sql.includes('aw_quotes')));
});
test('Referências Google expiram e são vinculadas ao usuário',async()=>{
  const {detailToken,verifyDetailToken}=await import('../server/google-places.js');const token=detailToken(place.id,'Restaurantes','owner@example.com',googleEnv,1000);
  assert.equal(verifyDetailToken(token,'owner@example.com',googleEnv,2000).placeId,place.id);
  assert.throws(()=>verifyDetailToken(token,'another@example.com',googleEnv,2000),/Refaça/);
  assert.throws(()=>verifyDetailToken(token,'owner@example.com',googleEnv,1000+15*60*1000),/Refaça/);
});
test('Google respeita limite e falha de fonte sem consulta ou dados armazenados',async t=>{
  const f=await fixture(t,{env:googleEnv,throttled:true,fetcher:async()=>{throw Error('Não deveria chamar');}});assert.equal((await search(f,googleQuery)).status,429);
  const denied=await fixture(t,{env:googleEnv,fetcher:async()=>new Response('{}',{status:403})});assert.equal((await search(denied,googleQuery)).status,502);assert.equal(denied.cache.size,0);
});

test('Google tem limites separados, limitados abaixo da franquia mesmo com configuração maior',async()=>{
  const {googleLimits}=await import('../server/google-budget.js');
  assert.deepEqual(googleLimits({}),{search:{daily:150,monthly:4500},details:{daily:30,monthly:900}});
  assert.equal(googleLimits({GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT:'999999'}).search.monthly,4500);
  assert.equal(googleLimits({GOOGLE_PLACES_DETAILS_MONTHLY_LIMIT:'700'}).details.monthly,700);
  assert.equal(googleLimits({GOOGLE_PLACES_SEARCH_DAILY_LIMIT:'0'}).search.daily,0);
  assert.throws(()=>googleLimits({GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT:'invalid'}),/Confira/);
});
test('Google continua disponível quando a antiga quota compartilhada foi esgotada',async t=>{
  let count=0;const f=await fixture(t,{env:googleEnv,legacyExhausted:true,fetcher:async()=>{count++;return json({places:[place]});}});
  assert.equal((await search(f,googleQuery)).status,200);assert.equal(count,1);
  assert.equal(f.budgets.get('month:search'),1);assert.equal(f.budgets.get('day:search'),1);
  assert.ok(!f.calls.some(x=>x.sql.startsWith('INSERT INTO aw_prospect_usage')));
  assert.ok(f.calls.some(x=>x.sql.includes("'America/Los_Angeles'")));assert.ok(f.calls.some(x=>x.sql.includes('WHERE aw_google_usage.count<$3')));
});
test('Teto mensal bloqueia antes do Google e teto diário não consome o saldo mensal',async t=>{
  for(const limits of [{googleMonthlyUsed:4500},{googleDailyUsed:150}]){
    let calls=0;const f=await fixture(t,{env:googleEnv,...limits,fetcher:async()=>{calls++;return json({places:[place]});}});
    const response=await search(f,googleQuery);assert.equal(response.status,429);assert.equal(calls,0);assert.equal(f.budgets.size,0);assert.equal(f.calls.at(-1).sql,'ROLLBACK');
  }
});
test('Última chamada disponível é aceita; a próxima fica bloqueada sem exceder a quota',async t=>{
  let calls=0;const f=await fixture(t,{env:googleEnv,googleMonthlyUsed:4499,fetcher:async()=>{calls++;return json({places:[place]});}});
  assert.equal((await search(f,googleQuery)).status,200);assert.equal((await search(f,googleQuery)).status,429);assert.equal(calls,1);assert.equal(f.budgets.get('month:search'),4500);
});
test('Detalhes esgotados não bloqueiam buscas; falhas externas preservam a reserva',async t=>{
  const f=await fixture(t,{env:googleEnv,fetcher:async()=>json({places:[place]})});const result=await (await search(f,googleQuery)).json();
  f.budgets.set('month:details',900);
  const response=await fetch(f.url+'/api/admin/prospecting/google-details',{method:'POST',headers,body:JSON.stringify({token:result.items[0].detailToken})});assert.equal(response.status,429);
  assert.equal((await search(f,googleQuery)).status,200);assert.equal(f.budgets.get('month:search'),2);
  const failed=await fixture(t,{env:googleEnv,fetcher:async()=>new Response('{}',{status:503})});assert.equal((await search(failed,googleQuery)).status,502);assert.equal(failed.budgets.get('month:search'),1);
});
test('Sem registrar orçamento no banco, nenhuma chamada Google é enviada',async t=>{
  let calls=0;const f=await fixture(t,{env:googleEnv,budgetOffline:true,fetcher:async()=>{calls++;return json({places:[place]});}});
  assert.equal((await search(f,googleQuery)).status,503);assert.equal(calls,0);assert.equal(f.calls.at(-1).sql,'ROLLBACK');
});
