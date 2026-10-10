import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const script=await readFile(new URL('../dist/content.js',import.meta.url),'utf8');
const initial=JSON.parse(await readFile(new URL('../dist/content-default.json',import.meta.url),'utf8'));
async function render(content,{preview=false,fail=false}={}){
  const {document}=parseHTML(html);const window={};
  vm.runInNewContext(script,{document,window,location:{search:preview?'?preview=1':''},URLSearchParams,AbortController,setTimeout,clearTimeout,fetch:async()=>({ok:!fail,json:async()=>preview?{draft:content}:{content}})});
  await new Promise(resolve=>setImmediate(resolve));
  return {document,window};
}
test('Renderiza quatro banners e aplica textos sem interpretar HTML',async()=>{
  const content=structuredClone(initial);content.portfolio.projects.push({...content.portfolio.projects[0],id:'extra',title:'Quarto projeto'});content.portfolio.projects[0].title='<img src=x onerror=alert(1)>';
  const {document}=await render(content);assert.equal(document.querySelectorAll('.portfolio-banner').length,4);assert.equal(document.querySelectorAll('[data-slide]').length,4);assert.equal(document.querySelector('.banner-info h3').textContent,content.portfolio.projects[0].title);assert.equal(document.querySelector('.banner-info h3 img'),null);assert.equal(document.querySelector('.portfolio-banner').hidden,false);
});
test('A prévia sem sessão não exibe a versão pública como se fosse rascunho',async()=>{
  const {document}=await render(initial,{preview:true,fail:true});assert.equal(document.querySelector('.hero'),null);assert.match(document.body.textContent,/Não foi possível abrir o rascunho/);
});
test('Quando a API pública falha, preserva a landing page original',async()=>{
  const {document,window}=await render(initial,{fail:true});assert.ok(document.querySelector('.hero'));assert.equal(document.querySelectorAll('.portfolio-banner').length,3);assert.equal(window.awContent,undefined);
});
test('Reordena a página, oculta seções excluídas e mantém widgets compatíveis',async()=>{
  const content={...initial,sections:[{id:'contato',type:'builtin'},{id:'portfolio',type:'builtin'},{id:'inicio',type:'builtin'}]};
  const {document}=await render(content);const visible=[...document.querySelector('main').children].filter(x=>!x.hidden).map(x=>x.id);
  assert.deepEqual(visible,['contato','portfolio','inicio']);assert.equal(document.querySelector('#servicos').hidden,true);
  assert.equal(document.querySelector('nav a[href="#servicos"]').hidden,true);
  assert.ok(document.querySelector('#aw-globe'));assert.ok(document.querySelector('#brief-form'));
  assert.deepEqual([...document.querySelector('#navigation').children].filter(x=>!x.hidden).map(x=>x.getAttribute('href')),['#contato','#portfolio']);
});
test('Adiciona texto e imagem sem interpretar HTML e remove links para contato excluído',async()=>{
  const custom={id:'custom-novo',type:'custom',title:'<script>Texto</script>',description:'<img src=x onerror=alert(1)>',image:'assets/forma.webp',alt:'Imagem demonstrativa',button:'Conhecer',url:'https://example.com'};
  const {document}=await render({...initial,sections:[custom,{id:'portfolio',type:'builtin'}]});
  const section=document.querySelector('#custom-novo');assert.equal(section.querySelector('h1').textContent,custom.title);assert.equal(section.querySelector('script'),null);assert.equal(section.querySelectorAll('img').length,1);
  assert.equal(section.querySelector('a').getAttribute('href'),custom.url);assert.equal(document.querySelector('#contato').hidden,true);
  assert.equal(document.querySelector('#dialog-contact').hidden,true);assert.equal(document.querySelector('header .brand').getAttribute('href'),'/');
});
test('Reincluir o globo respeita a opção de animação oculta',async()=>{
  const {document}=await render({...initial,settings:{...initial.settings,globe:false},sections:[{id:'conexoes',type:'builtin'},{id:'inicio',type:'builtin'}]});
  assert.equal(document.querySelector('#conexoes').hidden,true);assert.equal(document.querySelector('#inicio').hidden,false);
});
