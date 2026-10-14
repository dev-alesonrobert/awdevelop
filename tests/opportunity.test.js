import test from 'node:test';
import assert from 'node:assert/strict';
import { opportunity } from '../frontend/src/app/features/prospecting/opportunity.ts';
import { createApp } from '../server/app.js';

const prospect = { source: 'OpenStreetMap', website: '', phone: '21999999999', email: '', instagram: '', address: 'Rua Teste' };

test('Radar prioriza contato disponível sem afirmar ausência de site ou intenção de compra', () => {
  const result = opportunity(prospect);
  assert.equal(result.score, 90);
  assert.equal(result.level, 'high');
  assert.ok(result.reasons.includes('Site não informado na fonte'));
  assert.equal(opportunity({...prospect, website:'https://example.com'}).level, 'medium');
  assert.equal(opportunity({...prospect, website:'https://example.com', phone:'', address:''}).score, 0);
});

test('Google sem detalhes não recebe pontuação nem é tratado como empresa sem site', () => {
  const pending = opportunity({...prospect, source:'Google Maps', detailsLoaded:false});
  assert.equal(pending.score, null);
  assert.equal(pending.level, 'pending');
  assert.equal(pending.reasons.length, 1);
  assert.equal(opportunity({...prospect, source:'Google Maps', detailsLoaded:true}).level, 'high');
});

const origin = 'https://awdevelop-globe.vercel.app';
process.env.BETTER_AUTH_URL = origin;
async function fixture(t, role='owner') {
  const calls = [];
  const app = createApp({
    auth:()=>({api:{getSession:async()=>({user:{id:'test',email:'owner@example.com'}})}}),
    access:async()=>({active:true,role,name:'Owner'}),
    db:()=>({query:async(sql,params)=>{calls.push({sql,params});return {rows:[{id:'12',key:'osm:node:7',stage:'proposal'}]};}}),
  });
  const server = app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  return {calls, post:body=>fetch(`http://127.0.0.1:${server.address().port}/api/admin/prospecting/crm-status`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)})};
}

test('Status comercial usa chaves únicas, ignora Google e retorna ficha e etapa existentes', async t => {
  const f = await fixture(t);
  const response = await f.post({keys:['osm:node:7','osm:node:7','google:place']});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{items:[{id:'12',key:'osm:node:7',stage:'proposal'}]});
  assert.deepEqual(f.calls[0].params,[['osm:node:7']]);
  assert.match(f.calls[0].sql,/ANY\(\$1::text\[\]\)/);
  f.calls.length=0;
  assert.deepEqual(await (await f.post({keys:['google:place']})).json(),{items:[]});
  assert.equal(f.calls.length,0);
});

test('Status comercial recusa editor e entradas acima do limite antes de acessar banco', async t => {
  const editor=await fixture(t,'editor');
  assert.equal((await editor.post({keys:['osm:node:7']})).status,403);
  assert.equal(editor.calls.length,0);
  const owner=await fixture(t);
  assert.equal((await owner.post({keys:Array(101).fill('key')})).status,400);
  assert.equal((await owner.post({keys:['x'.repeat(121)]})).status,400);
  assert.equal(owner.calls.length,0);
});
