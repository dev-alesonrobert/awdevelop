import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { randomUUID } from 'node:crypto';
const html=await readFile(new URL('../dist/admin/index.html',import.meta.url),'utf8');
const script=await readFile(new URL('../dist/admin/admin.js',import.meta.url),'utf8');
const initial=JSON.parse(await readFile(new URL('../dist/content-default.json',import.meta.url),'utf8'));
async function boot({role='owner',conflict=false}={}){
 const {document,window}=parseHTML(html);
 for(const form of document.querySelectorAll('form'))form.reset=()=>{};
 for(const klass of [window.HTMLInputElement,window.HTMLTextAreaElement]){klass.prototype.checkValidity=()=>true;klass.prototype.reportValidity=()=>true;}
 for(const field of document.querySelectorAll('input[type=checkbox]'))field.checked=field.hasAttribute('checked');
 const timers=new Map(),calls=[];let next=0;
 for(const field of document.querySelectorAll('input,textarea')){field.checkValidity=()=>true;field.reportValidity=()=>true;}
 const context={document,window,location:{search:""},crypto:{randomUUID},navigator:{clipboard:{writeText:async()=>{}}},URLSearchParams,FormData,confirm:()=>true,setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id),setInterval:()=>1,clearInterval:()=>{},fetch:async(path,options={})=>{
  calls.push({path,options});let body,ok=true,status=200;
  if(path==='/api/auth/get-session')body={user:{email:'owner@example.com'}};
  else if(path==='/api/admin/me')body={role,name:'Owner',email:'owner@example.com'};
  else if(path==='/api/admin/content'&&options.method==='PUT'){if(conflict){ok=false;status=409;body={error:'O rascunho mudou.'};}else body={revision:2,published_revision:0};}
  else if(path==='/api/admin/content')body={draft:structuredClone(initial),revision:1,published_revision:0};
  else if(path==='/api/admin/notifications')body={count:2,latest:'12',items:[{id:'12',name:'Cliente <script>',service:'Site institucional',created_at:'2026-10-10T10:00:00Z'}]};
  else if(path==='/api/admin/presence')body={items:[]};
  else body={items:[]};return {ok,status,json:async()=>body};
 }};
 await vm.runInNewContext('(async()=>{'+script+'})()',context);await new Promise(resolve=>setImmediate(resolve));
 return {document,window,timers,calls,edit(value){const field=document.querySelector('[data-path="hero.description"]');field.value=value;field.dispatchEvent(new window.Event('input',{bubbles:true}));},async tick(){const [id,fn]=[...timers.entries()].at(-1)||[];if(fn){timers.delete(id);fn();await new Promise(resolve=>setImmediate(resolve));}}};
}
test('Salvamento automático grava somente o rascunho e não publica',async()=>{
 const ui=await boot();ui.edit('Descrição editada automaticamente.');await ui.tick();
 const writes=ui.calls.filter(c=>c.options.method==='PUT');assert.equal(writes.length,1);assert.equal(JSON.parse(writes[0].options.body).content.hero.description,'Descrição editada automaticamente.');assert.equal(ui.calls.some(c=>c.path==='/api/admin/publish'),false);
});
test('Conflito pausa salvamento automático sem descartar texto digitado',async()=>{
 const ui=await boot({conflict:true});ui.edit('Minha alteração local.');await ui.tick();ui.edit('Minha próxima alteração local.');assert.equal(ui.timers.size,0);assert.match(ui.document.querySelector('#notice').textContent,/pausado/);assert.equal(ui.document.querySelector('[data-path="hero.description"]').value,'Minha próxima alteração local.');
});
test('Interface de editor oculta publicar, orçamentos e gestão de contas',async()=>{
 const ui=await boot({role:'editor'});assert.equal(ui.document.querySelector('#publish').hidden,true);assert.equal(ui.document.querySelector('[data-owner]').hidden,true);assert.equal(ui.document.querySelector('[data-publisher]').hidden,true);assert.equal(ui.document.querySelectorAll('#logout').length,1);assert.ok(ui.document.querySelector('.title-row #logout'));
});

test('Sino mostra contador, protege texto e abrir não marca como lido',async()=>{
 const ui=await boot();const bell=ui.document.querySelector('#notification-bell');
 assert.equal(ui.document.querySelector('#notification-badge').textContent,'2');assert.equal(ui.document.querySelector('#notification-badge').hidden,false);
 bell.click();await new Promise(resolve=>setImmediate(resolve));assert.equal(ui.document.querySelector('#notification-panel').hidden,false);assert.equal(bell.getAttribute('aria-expanded'),'true');
 assert.equal(ui.document.querySelector('#notification-items strong').textContent,'Cliente <script>');assert.equal(ui.document.querySelector('#notification-items script'),null);
 assert.equal(ui.calls.some(c=>c.path==='/api/admin/notifications/read'),false);
 ui.document.querySelector('#notification-read').click();await new Promise(resolve=>setImmediate(resolve));
 const call=ui.calls.find(c=>c.path==='/api/admin/notifications/read');assert.deepEqual(JSON.parse(call.options.body),{through:'12'});
});
test('Editor não consulta notificações comerciais',async()=>{
 const ui=await boot({role:'editor'});assert.equal(ui.document.querySelector('.notifications').hidden,true);assert.equal(ui.calls.some(c=>c.path==='/api/admin/notifications'),false);
});
test('Sair limpa notificações privadas do painel',async()=>{
 const ui=await boot();ui.document.querySelector('#logout').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(ui.document.querySelector('#notification-items').childElementCount,0);assert.equal(ui.document.querySelector('#notification-badge').hidden,true);assert.equal(ui.document.querySelector('#workspace').hidden,true);
});
