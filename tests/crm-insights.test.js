import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.js';
import {summarizeCommercial,summarizeUsage,quota} from '../server/crm-insights.js';
import {aiDailyLimit} from '../server/usage-policy.js';
const clock={updated_at:'2026-10-15T11:00:00Z',day_reset:'2026-10-16T03:00:00Z',month_reset:'2026-11-01T07:00:00Z',search_day:15,search_month:100,details_day:3,details_month:20,ai_day:4,other_day:8};
async function fixture(t,{role='owner',session=true,fail=false}={}) {
 const calls=[];const query=async(sql,params)=>{calls.push({sql,params});if(fail)throw Error('unavailable');return {rows:sql.includes('GROUP BY q.crm_stage')?[{crm_stage:'new',count:250,value:'1200.00',contacted:2}]:[clock]};};
 const app=createApp({auth:()=>({api:{getSession:async()=>session?{user:{id:'u1',email:'owner@example.com'}}:null}}),access:async()=>({active:true,role,name:'Owner'}),db:()=>({query})});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 return{url:'http://127.0.0.1:'+server.address().port,calls};
}
test('Resumo usa todos os leads, exclui negócios abertos da taxa e não presume conversões de etapas',()=>{
 const result=summarizeCommercial([{crm_stage:'new',count:250,value:'1000',contacted:4},{crm_stage:'won',count:2,value:'6000',contacted:2},{crm_stage:'lost',count:1,value:'1000',contacted:0}]);
 assert.equal(result.total,253);assert.equal(result.openValue,1000);assert.equal(result.contacted,6);assert.equal(result.winRate,66.7);assert.equal(result.closed,3);
 assert.equal(summarizeCommercial([]).winRate,null);assert.equal(summarizeCommercial([]).total,0);
});
test('Saldo respeita limites efetivos, nunca é negativo e mantém consumo histórico acima do teto',()=>{
 assert.deepEqual(quota(901,900,'next'),{used:901,limit:900,remaining:0,percent:100,resetsAt:'next'});
 assert.equal(quota(0,0,'next').percent,100);
 const result=summarizeUsage(clock,{GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT:'250',PROSPECTING_AI_DAILY_LIMIT:'35'});
 assert.equal(result[0].monthly.limit,250);assert.equal(result[0].monthly.remaining,150);assert.equal(result[2].daily.limit,35);assert.equal(result[2].daily.remaining,31);
 assert.equal(result[1].daily.resetsAt,clock.day_reset);assert.equal(result[0].monthly.resetsAt,clock.month_reset);
 assert.equal(aiDailyLimit({PROSPECTING_AI_DAILY_LIMIT:'999'}),200);
});
test('Indicadores e saldos exigem sessão comercial',async t=>{
 for(const options of [{session:false},{role:'editor'}]){
 const f=await fixture(t,options);assert.equal((await fetch(f.url+'/api/admin/crm/insights')).status,options.session===false?401:403);assert.equal(f.calls.length,0);
 }
});
test('Consulta de indicadores apenas lê o banco e não expõe credenciais',async t=>{
 const f=await fixture(t);const response=await fetch(f.url+'/api/admin/crm/insights');const data=await response.json();
 assert.equal(response.status,200);assert.equal(data.commercial.total,250);assert.equal(data.usage[0].daily.used,15);assert.equal(data.updatedAt,clock.updated_at);
 assert.equal(f.calls.length,2);for(const call of f.calls)assert.doesNotMatch(call.sql,/\b(INSERT|DELETE|UPDATE)\s/i);
 assert.doesNotMatch(JSON.stringify(data),/API_KEY|BETTER_AUTH_SECRET|token|password/);
});
test('Falha na leitura não apresenta saldo zerado como se fosse atual',async t=>{
 const f=await fixture(t,{fail:true});const response=await fetch(f.url+'/api/admin/crm/insights');assert.equal(response.status,503);assert.equal((await response.json()).usage,undefined);
});
