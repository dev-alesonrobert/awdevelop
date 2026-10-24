import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import ts from 'typescript';
import {constructorParametersDownlevelTransform} from '@angular/compiler-cli/private/tooling';
import {fileURLToPath} from 'node:url';
import '@angular/compiler';
import {Injector,runInInjectionContext} from '@angular/core';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {Router} from '@angular/router';
import {TestBed} from '@angular/core/testing';
import {BrowserTestingModule,platformBrowserTesting} from '@angular/platform-browser/testing';
import {parseHTML} from 'linkedom';
const {document}=parseHTML('<html><body></body></html>');document.cookie='';globalThis.document=document;
globalThis.window=document.defaultView;
globalThis.Node=document.defaultView.Node;
globalThis.HTMLElement=document.defaultView.HTMLElement;
window.confirm=()=>true;
// LinkeDOM exposes select.value as a getter; Angular's value accessor needs the browser setter.
Object.defineProperty(document.defaultView.HTMLSelectElement.prototype,'value',{
 configurable:true,
 get(){return [...this.options].find(option=>option.selected)?.value??'';},
 set(value){for(const option of this.options)option.selected=option.value===value;},
});
// LinkeDOM's generic fieldset also omits the native disabled property.
const createElement=document.createElement.bind(document);
document.createElement=(name,...args)=>{
 const element=createElement(name,...args);
 if(name==='fieldset')Object.defineProperty(element,'disabled',{get(){return this.hasAttribute('disabled');},set(value){this.toggleAttribute('disabled',!!value);}});
 return element;
};
TestBed.initTestEnvironment(BrowserTestingModule,platformBrowserTesting());
const directory=new URL('../.angular/sections-tests/',import.meta.url);await mkdir(directory,{recursive:true});
const templates=new Map();
for(const name of ['features/sections/sections.component','features/sections/components/section-card/section-card.component','features/sections/components/section-add/section-add.component','features/sections/components/section-toolbar/section-toolbar.component','shared/page-heading/page-heading.component']){
 templates.set(name.split('/').at(-1)+'.html',await readFile(new URL('../frontend/src/app/'+name+'.html',import.meta.url),'utf8'));
}
// Apply the same signal-input/output JIT transform used by the Angular CLI.
const sources=new Map();
const names=['core/auth','core/api','core/draft-state','features/sections/models','features/sections/sections.component','features/sections/components/section-card/section-card.component','features/sections/components/section-add/section-add.component','features/sections/components/section-toolbar/section-toolbar.component','shared/page-heading/page-heading.component'];
for(const name of names){
 let source=await readFile(new URL('../frontend/src/app/'+name+'.ts',import.meta.url),'utf8');
 source=source.replace(/templateUrl\s*:\s*['"]([^'"]+)['"]/g,(_,path)=>'template: '+JSON.stringify(templates.get(path.replace(/^\.\//,'')))).replace(/styleUrl\s*:\s*['"][^'"]+['"]/g,'styles: []');
 sources.set(fileURLToPath(new URL('../frontend/src/app/'+name+'.ts',import.meta.url)),source);
}
const options={module:ts.ModuleKind.ES2022,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,skipLibCheck:true,resolveJsonModule:true,esModuleInterop:true};
const host=ts.createCompilerHost(options),originalRead=host.readFile;
host.readFile=path=>sources.get(path)??originalRead(path);
const program=ts.createProgram([...sources.keys()],options,host);
for(const name of names){
 let compiled='';
 program.emit(program.getSourceFile(fileURLToPath(new URL('../frontend/src/app/'+name+'.ts',import.meta.url))),(_path,text)=>{compiled=text;},undefined,false,{before:[constructorParametersDownlevelTransform(program)]});
 compiled=compiled.replace(/from ['"]((?:\.\.\/|\.\/)[^'"]+)['"]/g,(_,path)=>{
  if(path.endsWith('.json'))return 'from '+JSON.stringify(new URL('../dist/section-catalog.json',import.meta.url).href)+' with {type:"json"}';
  return 'from "./'+path.split('/').at(-1)+'.mjs"';
 });
 await writeFile(new URL(name.split('/').at(-1)+'.mjs',directory),compiled);
}
const {SectionsComponent:Sections}=await import('../.angular/sections-tests/sections.component.mjs');
const {Auth}=await import('../.angular/sections-tests/auth.mjs');
const {DraftState}=await import('../.angular/sections-tests/draft-state.mjs');
const initial=JSON.parse(await readFile(new URL('../dist/content-default.json',import.meta.url),'utf8'));
const tick=()=>new Promise(r=>setImmediate(r));
async function fixture(t,{role='owner'}={}){
  const navigations=[];TestBed.configureTestingModule({providers:[Auth,DraftState,provideHttpClient(),provideHttpClientTesting(),{provide:Router,useValue:{navigateByUrl:url=>{navigations.push(url);return Promise.resolve(true);}}}]});
  const auth=TestBed.inject(Auth);auth.profile.set({name:'Owner',email:'owner@example.com',role});
  const http=TestBed.inject(HttpTestingController),component=runInInjectionContext(TestBed.inject(Injector),()=>new Sections());
  http.expectOne('/api/admin/content').flush({draft:structuredClone(initial),revision:5,published_revision:4});await tick();
  t.after(()=>{http.verify();TestBed.resetTestingModule();window.confirm=()=>true;});return {component,http,navigations,auth};
}
test('Mover, excluir e reincluir seções preserva conteúdo e salva apenas o rascunho',async t=>{
  const {component:c,http}=await fixture(t);const portfolioIndex=c.sections().findIndex(s=>s.id==='portfolio');c.move(portfolioIndex,1-portfolioIndex);assert.equal(c.sections()[1].id,'portfolio');
  c.remove(c.sections().findIndex(s=>s.id==='servicos'));assert.ok(c.available().some(s=>s.id==='servicos'));
  c.addType='servicos';c.add();assert.equal(c.sections().at(-1).id,'servicos');assert.equal(c.sections().filter(s=>s.id==='servicos').length,1);
  const save=c.save(),req=http.expectOne('/api/admin/content');assert.equal(req.request.method,'PUT');assert.equal(req.request.body.revision,5);
  assert.deepEqual(req.request.body.content.blocks,initial.blocks);assert.deepEqual(req.request.body.content.portfolio,initial.portfolio);assert.equal(req.request.body.content.sections[1].id,'portfolio');
  req.flush({revision:6,published_revision:4});await save;assert.equal(c.dirty(),false);http.expectNone('/api/admin/publish');
});
test('Adicionar, editar e desfazer bloco personalizado; conflito mantém mudanças locais',async t=>{
  const {component:c,http}=await fixture(t);c.add();const id=c.sections().at(-1).id;c.edit(id,'title','Novo serviço');
  const save=c.save(),req=http.expectOne('/api/admin/content');assert.equal(req.request.body.content.sections.at(-1).title,'Novo serviço');
  req.flush({error:'O rascunho mudou.'},{status:409,statusText:'Conflict'});await save;assert.equal(c.dirty(),true);assert.equal(c.sections().at(-1).title,'Novo serviço');assert.equal(c.revision(),5);
  c.undo();assert.equal(c.sections().some(s=>s.id===id),false);
});
test('Editor não publica; prévia e saída bloqueiam alterações não salvas',async t=>{
  const {component:c,http}=await fixture(t,{role:'editor'});c.move(0,1);await c.publish();http.expectNone('/api/admin/publish');
  let prevented=false;c.preview({preventDefault:()=>{prevented=true;}});assert.equal(prevented,true);
  window.confirm=()=>false;assert.equal(c.canLeave(),false);
});
test('Publicação usa revisão salva e exige confirmação',async t=>{
  const {component:c,http}=await fixture(t);window.confirm=()=>false;await c.publish();http.expectNone('/api/admin/publish');
  window.confirm=()=>true;const publishing=c.publish();const req=http.expectOne('/api/admin/publish');assert.equal(req.request.body.revision,5);req.flush({published_revision:5});await publishing;assert.equal(c.publishedRevision(),5);
});

test('Componentes renderizados propagam adicionar, editar, mover e salvar sem publicar',async t=>{
  const navigations=[];
  TestBed.configureTestingModule({providers:[Auth,DraftState,provideHttpClient(),provideHttpClientTesting(),{provide:Router,useValue:{navigateByUrl:url=>{navigations.push(url);return Promise.resolve(true);}}}]});
  const auth=TestBed.inject(Auth);auth.profile.set({name:'Owner',email:'owner@example.com',role:'owner'});
  const http=TestBed.inject(HttpTestingController);
  const rendered=TestBed.createComponent(Sections);
  t.after(()=>{http.verify();rendered.destroy();TestBed.resetTestingModule();window.confirm=()=>true;});
  http.expectOne('/api/admin/content').flush({draft:structuredClone(initial),revision:5,published_revision:4});await tick();rendered.detectChanges();
  const view=rendered.nativeElement;
  const button=text=>[...view.querySelectorAll('button')].find(x=>x.textContent.includes(text));
  assert.equal(view.querySelector('aw-section-card:first-child button[aria-label$="para cima"]').disabled,true);
  button('Adicionar seção').click();rendered.detectChanges();
  const title=view.querySelector('aw-section-card:last-child input');
  title.value='Serviço personalizado';title.dispatchEvent(new document.defaultView.Event('input',{bubbles:true}));await tick();rendered.detectChanges();
  view.querySelector('aw-section-card:last-child button[aria-label$="para cima"]').click();rendered.detectChanges();
  button('Salvar rascunho').click();
  const req=http.expectOne('/api/admin/content');
  assert.equal(req.request.method,'PUT');assert.equal(req.request.body.content.sections.at(-2).title,'Serviço personalizado');
  req.flush({revision:6,published_revision:4});await tick();rendered.detectChanges();
  assert.equal(rendered.componentInstance.dirty(),false);http.expectNone('/api/admin/publish');
});

