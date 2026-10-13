import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { leadFiltersSchema, buildLeadFilters } from '../server/lead-filters.js';

test('Rejeita valores, datas e filtros inválidos antes de consultar o banco', () => {
  for (const query of [{minValue:'20',maxValue:'10'}, {minValue:'-1'}, {from:'2026-02-30'}, {from:'2026-10-13',to:'2026-10-01'}, {stage:'invalid'}, {website:'maybe'}, {priority:'urgent'}]) {
    assert.equal(leadFiltersSchema.safeParse(query).success, false);
  }
  assert.equal(leadFiltersSchema.parse({minValue:'0'}).minValue, 0);
});

test('Texto permanece em parâmetros, inclusive curingas e tentativas de SQL', () => {
  const search = "%' OR 1=1; --";
  const {where,values} = buildLeadFilters(leadFiltersSchema.parse({search,city:'Rio',stage:'new',website:'no',minValue:'0'}));
  assert.ok(!where.includes(search));
  assert.deepEqual(values, [search,'new','Rio',0]);
  assert.match(where, /strpos/);
  assert.match(where, /contact_website/);
  assert.match(where, /estimated_value>=\$4/);
});

test('Períodos incluem o último dia e usam o fuso brasileiro; contatos ignoram tarefas concluídas', () => {
  const {where} = buildLeadFilters(leadFiltersSchema.parse({from:'2026-10-01',to:'2026-10-13',followup:'today'}));
  assert.match(where, /date\+1/);
  assert.match(where, /America\/Sao_Paulo/);
  assert.match(where, /t.done=false/);
  assert.match(buildLeadFilters(leadFiltersSchema.parse({followup:'none'})).where,/NOT EXISTS/);
});

test('API usa os mesmos filtros para lista e totais; cursor afeta apenas a página', async t => {
  const calls = [];
  const app = createApp({
    auth: () => ({api:{getSession:async()=>({user:{id:'u1',email:'owner@example.com'}})}}),
    access: async () => ({active:true,role:'owner',name:'Owner'}),
    db: () => ({query:async(sql,params)=>{calls.push({sql,params});return {rows:[],rowCount:0};}})
  });
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/crm/leads?city=Rio&stage=proposal&before=99&phone=yes`);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{items:[],stats:[],next:null});
  assert.equal(calls.length,2);
  assert.deepEqual(calls[0].params,[...calls[1].params,'99']);
  for (const call of calls) { assert.match(call.sql,/crm_stage=\$1/); assert.match(call.sql,/lower\(city\)/); assert.match(call.sql,/COALESCE\(phone/); }
  const invalid = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/crm/leads?minValue=20&maxValue=10`);
  assert.equal(invalid.status,400);
  assert.equal(calls.length,2);
});
