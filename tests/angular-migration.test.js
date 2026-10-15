import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import {constructorParametersDownlevelTransform} from '@angular/compiler-cli/private/tooling';
import '@angular/compiler';
import {Injector,runInInjectionContext} from '@angular/core';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {Router,ActivatedRoute} from '@angular/router';
import {TestBed} from '@angular/core/testing';
import {BrowserTestingModule,platformBrowserTesting} from '@angular/platform-browser/testing';
import {parseHTML} from 'linkedom';
const {document}=parseHTML('<html><body></body></html>');document.cookie='';globalThis.document=document;globalThis.window=document.defaultView;globalThis.Node=window.Node;globalThis.HTMLElement=window.HTMLElement;window.confirm=()=>true;
globalThis.location={hash:'#test-invite-token-not-real',pathname:'/painel/setup',search:''};globalThis.history={replaceState:()=>{}};
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return [...this.options].find(x=>x.selected)?.value??'';},set(value){for(const x of this.options)x.selected=x.value===value;}});
const create=document.createElement.bind(document);document.createElement=(name,...args)=>{const el=create(name,...args);if(name==='fieldset')Object.defineProperty(el,'disabled',{get(){return this.hasAttribute('disabled');},set(v){this.toggleAttribute('disabled',!!v);}});return el;};
TestBed.initTestEnvironment(BrowserTestingModule,platformBrowserTesting());
const names=['features/dashboard/overview/overview.component','features/dashboard/components/commercial-insights/commercial-insights.component','features/dashboard/components/integration-usage/integration-usage.component','features/dashboard/components/metric-card/metric-card.component','features/dashboard/components/notification-card/notification-card.component','shared/page-heading/page-heading.component','core/duplicate.service','shared/duplicate-review/duplicate-review.component','features/sections/models','features/landing/landing.component','features/landing/hero/hero.component','features/landing/focus-strip/focus-strip.component','features/landing/portfolio/portfolio.component','features/landing/process/process.component','features/landing/services/services.component','features/landing/globe/globe.component','features/landing/globe/globe-renderer','features/landing/invitation/invitation.component','features/landing/about/about.component','features/landing/faq/faq.component','core/auth','core/api','core/draft-state','core/admin-page','core/commercial-models','features/content/content-editor','features/crm/crm-page','features/history/history-page','features/quotes/quotes-page','features/auth/setup/setup.component','shared/brand/brand.component','features/crm/lead-editor/lead-editor.component','features/landing/quote-form/quote-form.component','features/dashboard/components/notification-bell/notification-bell.component'];
const directory=new URL('../.angular/migration-tests/',import.meta.url);await mkdir(directory,{recursive:true});const sources=new Map();
for(const name of names){const sourcePath=fileURLToPath(new URL('../frontend/src/app/'+name+'.ts',import.meta.url));let text=await readFile(sourcePath,'utf8');const template=text.match(/templateUrl\s*:\s*['"]([^'"]+)['"]/);if(template)text=text.replace(template[0],'template:'+JSON.stringify(await readFile(path.resolve(path.dirname(sourcePath),template[1]),'utf8')));text=text.replace(/styleUrl\s*:\s*['"][^'"]+['"]/g,'styles:[]');sources.set(sourcePath,text);}
const options={module:ts.ModuleKind.ES2022,moduleResolution:ts.ModuleResolutionKind.Bundler,target:ts.ScriptTarget.ES2022,experimentalDecorators:true,skipLibCheck:true,resolveJsonModule:true,esModuleInterop:true};const host=ts.createCompilerHost(options),originalRead=host.readFile;host.readFile=p=>sources.get(p)??originalRead(p);const program=ts.createProgram([...sources.keys()],options,host);
for(const name of names){let result='';const sourcePath=fileURLToPath(new URL('../frontend/src/app/'+name+'.ts',import.meta.url));program.emit(program.getSourceFile(sourcePath),(_p,text)=>{result=text;},undefined,false,{before:[constructorParametersDownlevelTransform(program)]});result=result.replace(/from ['"]((?:\.\.\/|\.\/)[^'"]+)['"]/g,(_,value)=>value.endsWith('.json')?'from '+JSON.stringify(pathToFileURL(path.resolve(path.dirname(sourcePath),value)).href)+' with {type:"json"}':'from "./'+value.split('/').at(-1)+'.mjs"');await writeFile(new URL(name.split('/').at(-1)+'.mjs',directory),result);}
const {Auth}=await import('../.angular/migration-tests/auth.mjs');
const {DraftState}=await import('../.angular/migration-tests/draft-state.mjs');
const {ContentEditor}=await import('../.angular/migration-tests/content-editor.mjs');
const {CrmPage}=await import('../.angular/migration-tests/crm-page.mjs');
const {HistoryPage}=await import('../.angular/migration-tests/history-page.mjs');
const {QuotesPage}=await import('../.angular/migration-tests/quotes-page.mjs');
const {SetupComponent}=await import('../.angular/migration-tests/setup.component.mjs');
const {QuoteFormComponent}=await import('../.angular/migration-tests/quote-form.component.mjs');
const {LeadEditorComponent}=await import('../.angular/migration-tests/lead-editor.component.mjs');
const defaults=JSON.parse(await readFile(new URL('../dist/content-default.json',import.meta.url),'utf8'));
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(t,type){TestBed.configureTestingModule({providers:[Auth,DraftState,type,provideHttpClient(),provideHttpClientTesting(),{provide:Router,useValue:{navigateByUrl:()=>Promise.resolve(true)}},{provide:ActivatedRoute,useValue:{snapshot:{queryParamMap:{get:()=>null}}}}]});const auth=TestBed.inject(Auth);auth.profile.set({email:'owner@example.com',name:'Owner',role:'owner'});const http=TestBed.inject(HttpTestingController);const page=TestBed.inject(type);t.after(()=>{TestBed.resetTestingModule();http.match(r=>r.method==='DELETE'&&r.url.startsWith('/api/admin/presence/')).forEach(r=>r.flush({}));http.verify();});return{page,http};}
test('Editor Angular preserva textos em conflito, pausa autosave e não publica rascunho',async t=>{const{page:p,http}=fixture(t,ContentEditor);http.expectOne('/api/admin/presence').flush({items:[]});const loading=p.load();http.expectOne('/api/admin/content').flush({draft:structuredClone(defaults),revision:7,published_revision:5});await loading;p.autosave.set(true);p.edit('hero','title','Texto do cliente');const saving=p.save();const put=http.expectOne('/api/admin/content');assert.equal(put.request.body.content.hero.title,'Texto do cliente');assert.equal(put.request.body.revision,7);put.flush({error:'Rascunho mudou'},{status:409,statusText:'Conflict'});await saving;assert.equal(p.content().hero.title,'Texto do cliente');assert.equal(p.dirty(),true);assert.equal(p.autosave(),false);http.expectNone('/api/admin/publish');});
const lead={id:'8',name:'Cliente',company:'Empresa',email:'cliente@example.com',phone:'',contact_website:'',service:'Site',origin:'Site',crm_stage:'new',assignee:null,estimated_value:'2000',expected_close:null,idea:'Site para a empresa',revision:3,created_at:'2026-10-10T10:00:00Z'};
const form={name:'Cliente editado',company:'Empresa',email:'cliente@example.com',phone:'',website:'',service:'Site',origin:'Site',crmStage:'proposal',assignee:'',value:3000,expectedClose:'',idea:'Nova necessidade'};
test('CRM Angular usa revisão da ficha e mantém edição quando há conflito',async t=>{const{page:p,http}=fixture(t,CrmPage);const opening=p.open('8');http.expectOne('/api/admin/crm/leads/8').flush({lead,events:[],tasks:[]});await opening;p.changed();const saving=p.save(form);const req=http.expectOne('/api/admin/crm/leads/8');assert.equal(req.request.method,'PATCH');assert.equal(req.request.body.revision,3);assert.equal(req.request.body.value,3000);req.flush({error:'Ficha mudou'},{status:409,statusText:'Conflict'});await saving;assert.equal(p.dirty(),true);assert.equal(p.detail().lead.revision,3);assert.match(p.message(),/Ficha mudou/);});
test('Atividade salva não descarta campos ainda não salvos da ficha Angular',async t=>{const{page:p,http}=fixture(t,CrmPage);p.detail.set({lead,events:[],tasks:[]});p.changed('lead');p.changed('activity');const adding=p.addActivity({kind:'call',body:'Cliente quer revisar a proposta'});http.expectOne('/api/admin/crm/leads/8/events').flush({ok:true});await tick();http.expectOne('/api/admin/crm/leads/8').flush({lead,events:[{id:'1',body:'Cliente quer revisar a proposta'}],tasks:[]});await adding;assert.equal(p.dirty(),true);assert.equal(p.activitySaved(),1);});
test('Restauração Angular consulta revisão atual e muda somente o rascunho',async t=>{const{page:p,http}=fixture(t,HistoryPage);const restoring=p.restore('4');http.expectOne('/api/admin/content').flush({draft:defaults,revision:11,published_revision:10});await tick();const req=http.expectOne('/api/admin/history/4/restore');assert.deepEqual(req.request.body,{revision:11});req.flush({revision:12});await restoring;http.expectNone('/api/admin/publish');assert.match(p.message(),/12/);});
test('Orçamento Angular conserva seleção e notas após conflito',async t=>{const{page:p,http}=fixture(t,QuotesPage);p.selected.set({...lead,status:'new',notes:'',stage:'',timeline:''});p.changed();const saving=p.save({status:'proposal',notes:'Proposta de R$ 3000'});const req=http.expectOne('/api/admin/quotes/8');assert.equal(req.request.body.revision,3);req.flush({error:'Pedido mudou'},{status:409,statusText:'Conflict'});await saving;assert.equal(p.selected().id,'8');assert.equal(p.dirty(),true);});
test('Primeiro acesso Angular envia confirmação correta e apaga senha após sucesso',async t=>{const{page:p,http}=fixture(t,SetupComponent);p.form.setValue({password:'test-only-password-12',confirmPassword:'test-only-password-12'});const creating=p.submit();const req=http.expectOne('/api/setup');assert.equal(req.request.body.confirmation,'test-only-password-12');assert.equal(req.request.body.confirmPassword,undefined);req.flush({ok:true});await creating;assert.equal(p.available(),false);assert.equal(p.form.controls.password.value,'');await p.submit();http.expectNone('/api/setup');});
test('Formulário Angular público mantém UUID e payload em uma tentativa de reenvio',async t=>{const{page:p,http}=fixture(t,QuoteFormComponent);p.form.setValue({service:'Site institucional',idea:'Criar um site para a empresa',stage:'Quero começar do zero',timeline:'Ainda estou planejando',company:'Empresa',name:'Cliente',email:'cliente@example.com',phone:'',consent:true,website:''});p.review();const send=p.send();const first=http.expectOne('/api/quotes'),body=first.request.body;first.error(new Event('error'));await send;const retry=p.send();const second=http.expectOne('/api/quotes');assert.deepEqual(second.request.body,body);second.flush({ok:true});await retry;assert.equal(p.form.controls.email.value,'');assert.equal(p.reviewing(),false);});
test('Ficha Angular renderizada preserva edição do lead quando chegam novas atividades',async t=>{const{http}=fixture(t,LeadEditorComponent);const component=TestBed.createComponent(LeadEditorComponent);component.componentRef.setInput('detail',{lead,events:[],tasks:[]});component.detectChanges();await tick();component.detectChanges();const field=component.nativeElement.querySelector('input');field.value='Nome ainda não salvo';field.dispatchEvent(new window.Event('input',{bubbles:true}));component.detectChanges();await tick();assert.equal(component.componentInstance.form.name,'Nome ainda não salvo');component.componentRef.setInput('detail',{lead,events:[{id:'1',actor:'Owner',kind:'call',body:'Novo contato',created_at:lead.created_at}],tasks:[]});component.detectChanges();await tick();component.detectChanges();assert.equal(component.componentInstance.form.name,'Nome ainda não salvo');assert.match(component.nativeElement.textContent,/Novo contato/);component.destroy();});
const {NotificationBellComponent}=await import('../.angular/migration-tests/notification-bell.component.mjs');
test('Sino Angular abre sem marcar leitura; confirmação usa somente o cursor exibido',async t=>{const{page:p,http}=fixture(t,NotificationBellComponent);const summary={count:2,latest:'19',items:[{id:'19',name:'Cliente',service:'Site',created_at:'2026-10-10T10:00:00Z'}],taskCount:0,tasks:[]};http.expectOne('/api/admin/notifications').flush(summary);await tick();p.opened.set(true);http.expectNone('/api/admin/notifications/read');const read=p.read();const req=http.expectOne('/api/admin/notifications/read');assert.deepEqual(req.request.body,{through:'19'});req.flush({ok:true});await tick();http.expectOne('/api/admin/notifications').flush({...summary,count:0,latest:'0',items:[]});await read;assert.equal(p.summary().count,0);});
const {LandingComponent}=await import('../.angular/migration-tests/landing.component.mjs');
test('Prévia Angular sem sessão não revela fallback público como rascunho',async t=>{location.search='?preview=1';t.after(()=>{location.search='';});const{page:p,http}=fixture(t,LandingComponent);http.expectOne('/api/admin/content').flush({error:'Sem sessão'},{status:401,statusText:'Unauthorized'});await tick();assert.equal(p.content(),null);assert.match(p.message(),/Entre no painel/);http.expectNone('/api/content');});
test('Página Angular aplica ordem de seções publicada e remove navegação de contato excluído',async t=>{location.search='';const{page:p,http}=fixture(t,LandingComponent);http.expectOne('/api/content').flush({content:{...defaults,sections:[{id:'sobre',type:'builtin'},{id:'portfolio',type:'builtin'}]}});await tick();assert.deepEqual(p.sections().map(x=>x.id),['sobre','portfolio']);assert.equal(p.active('contato'),false);assert.deepEqual(p.navigation().map(x=>x.id),['sobre','portfolio']);});

const {DuplicateReviewComponent}=await import('../.angular/migration-tests/duplicate-review.component.mjs');
test('Revisão de duplicidade mantém a ficha sem salvar até uma confirmação explícita',async t=>{
 const {http}=fixture(t,DuplicateReviewComponent);
 const component=TestBed.createComponent(DuplicateReviewComponent);
 component.componentRef.setInput('identity',{name:'Empresa',email:'contato@example.com'});
 const guard=component.componentInstance;let approved=0;guard.approved.subscribe(()=>approved++);
 const check=guard.review(true);http.expectOne('/api/admin/crm/duplicates').flush({items:[{id:'7',name:'Empresa',reasons:['E-mail']}]});await check;
 assert.equal(approved,0);assert.equal(guard.matches().length,1);
 guard.acknowledged=true;
 const retry=guard.review(true);http.expectOne('/api/admin/crm/duplicates').flush({items:[{id:'7',name:'Empresa',reasons:['E-mail']}]});await retry;
 assert.equal(approved,1);
 component.componentRef.setInput('identity',{name:'Outra empresa',email:'outro@example.com'});
 const changed=guard.review(true);http.expectOne('/api/admin/crm/duplicates').flush({items:[{id:'8',name:'Outra',reasons:['E-mail']}]});await changed;
 assert.equal(approved,1);assert.equal(guard.acknowledged,false);component.destroy();
});
test('Falha na verificação de duplicidade não aprova o salvamento',async t=>{
 const {http}=fixture(t,DuplicateReviewComponent);const component=TestBed.createComponent(DuplicateReviewComponent);
 component.componentRef.setInput('identity',{name:'Empresa'});let approved=0;component.componentInstance.approved.subscribe(()=>approved++);
 const check=component.componentInstance.review(true);http.expectOne('/api/admin/crm/duplicates').flush({error:'Falha'},{status:503,statusText:'Unavailable'});await check;
 assert.equal(approved,0);assert.match(component.componentInstance.message(),/Tente novamente/);component.destroy();
});
test('Fila Angular consulta o escopo selecionado e preserva a ficha com edição pendente',async t=>{
 const {page:p,http}=fixture(t,CrmPage);p.queueScope='mine';const loading=p.loadQueue();
 const request=http.expectOne('/api/admin/crm/contact-queue?scope=mine');request.flush({items:[],total:0,timezone:'America/Sao_Paulo'});await loading;
 p.dirty.set(true);await p.completeQueue({id:'7',lead_id:'9',kind:'task',title:'Retorno',assignee:'owner@example.com',revision:0,due_at:'2026-10-15T10:00:00Z',bucket:'today'});
 http.expectNone('/api/admin/crm/tasks/7');assert.match(p.message(),/Salve ou feche/);
});

const {OverviewComponent}=await import('../.angular/migration-tests/overview.component.mjs');
test('Visão geral usa agregados comerciais sem baixar fichas de leads nem chamar provedores',async t=>{
 const {page:p,http}=fixture(t,OverviewComponent);
 http.expectOne('/api/admin/notifications').flush({count:0,latest:'0',items:[],taskCount:0,tasks:[]});
 const data={commercial:{total:253,openValue:1000,contacted:6,won:2,lost:1,closed:3,winRate:66.7,stages:[]},usage:[],updatedAt:'2026-10-15T11:00:00Z'};
 http.expectOne('/api/admin/crm/insights').flush(data);await tick();
 assert.equal(p.total(),253);assert.equal(p.openValue(),1000);assert.equal(p.insights().commercial.winRate,66.7);
 http.expectNone('/api/admin/crm/leads');http.expectNone('/api/admin/prospecting/search');
});

test('Proposta e acompanhamento preservam proteções independentes de alterações',async t=>{
 const {page:p,http}=fixture(t,QuotesPage);
 p.open({...lead,status:'new',notes:'',stage:'',timeline:''});
 p.followupChanged();p.proposalChanged(true);p.proposalChanged(false);
 assert.equal(p.dirty(),true,'baixar proposta não descarta anotações pendentes');
 p.proposalChanged(true);
 const saving=p.save({status:'proposal',notes:'Acompanhamento revisado'});
 http.expectOne('/api/admin/quotes/8').flush({revision:4});await saving;
 assert.equal(p.dirty(),true,'salvar acompanhamento não descarta proposta não baixada');
 p.open(p.selected());assert.equal(p.dirty(),true,'reabrir o mesmo pedido preserva o formulário');
 p.proposalWorking(true);assert.equal(p.canLeave(),false);assert.equal(p.draftState.working(),true);
 p.proposalWorking(false);p.proposalChanged(false);assert.equal(p.dirty(),false);
});
