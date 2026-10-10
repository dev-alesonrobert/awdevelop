import {Component,ChangeDetectionStrategy,DestroyRef,HostListener,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HttpClient,HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {Auth} from '../../core/auth';
import {DraftState} from '../../core/draft-state';
import {apiMessage} from '../../core/api';
import {ContentDocument,DraftResponse,SavedResponse,LandingSection,initialSections,sectionCatalog,sectionLabel} from './models';

@Component({imports:[FormsModule],template:`
<section class="page-heading"><p class="eyebrow">CONTEÚDO / ESTRUTURA</p><h1>A página, na sua ordem.</h1>
<p class="muted">Mova as seções, adicione conteúdo e revise antes de publicar.</p></section>
<div class="section-actions">
  <button (click)="save()" [disabled]="busy()||!dirty()||!loaded()">{{busy()?'Aguarde…':'Salvar rascunho'}}</button>
  <a class="secondary section-action-link" href="/?preview=1" target="_blank" rel="noopener" (click)="preview($event)">Ver rascunho ↗</a>
  @if(auth.profile()?.role!=='editor'){<button class="secondary" (click)="publish()" [disabled]="busy()||dirty()||!loaded()||revision()===publishedRevision()">Publicar</button>}
  <button class="secondary" (click)="undo()" [disabled]="busy()||!undoCount()">Desfazer</button>
  <button class="secondary" (click)="reload()" [disabled]="busy()">Recarregar</button>
</div>
<p class="muted" role="status">{{loaded()?(dirty()?'Alterações não salvas':'Rascunho salvo'):'Carregando rascunho…'}}
@if(loaded()){ · Revisão {{revision()}} · Publicado: {{publishedRevision()}}}</p>
<p class="message" role="status" aria-live="polite">{{message()}}</p>
@if(loaded()){
<div class="section-editor-grid">
<div class="section-list" aria-label="Seções na ordem da página">
@for(section of sections();track section.id;let index=$index){
<article class="card section-card">
<div class="section-card-heading"><div><span class="eyebrow">{{index+1}} / {{section.type==='builtin'?'SEÇÃO ORIGINAL':'SEÇÃO PERSONALIZADA'}}</span><h2>{{label(section)}}</h2></div>
<div class="section-controls">
<button class="secondary" (click)="move(index,-1)" [disabled]="busy()||index===0" [attr.aria-label]="'Mover '+label(section)+' para cima'">↑</button>
<button class="secondary" (click)="move(index,1)" [disabled]="busy()||index===sections().length-1" [attr.aria-label]="'Mover '+label(section)+' para baixo'">↓</button>
<button class="secondary section-delete" (click)="remove(index)" [disabled]="busy()||sections().length===1" [attr.aria-label]="'Excluir '+label(section)">Excluir</button>
</div></div>
@if(section.type==='custom'){
<fieldset [disabled]="busy()"><legend class="sr-only">Conteúdo de {{section.title}}</legend>
<label>Título<input [ngModel]="section.title" (ngModelChange)="edit(section.id,'title',$event)" maxlength="200" required></label>
<label>Texto<textarea [ngModel]="section.description" (ngModelChange)="edit(section.id,'description',$event)" rows="4" maxlength="4000"></textarea></label>
<div class="section-fields"><label>Imagem (URL HTTPS ou assets/)<input [ngModel]="section.image" (ngModelChange)="edit(section.id,'image',$event)" maxlength="2048" placeholder="https://…"></label>
<label>Descrição da imagem<input [ngModel]="section.alt" (ngModelChange)="edit(section.id,'alt',$event)" maxlength="200" [required]="!!section.image"></label></div>
<label>Enviar imagem · PNG, JPG ou WebP até 4 MB<input type="file" accept="image/png,image/jpeg,image/webp" (change)="upload(section.id,$event)"></label>
<div class="section-fields"><label>Texto do botão (opcional)<input [ngModel]="section.button" (ngModelChange)="edit(section.id,'button',$event)" maxlength="200"></label>
<label>Link do botão (HTTPS)<input [ngModel]="section.url" (ngModelChange)="edit(section.id,'url',$event)" type="url" maxlength="2048" placeholder="https://…"></label></div>
</fieldset>
} @else {<p class="muted">Os textos e imagens desta seção continuam em <a [href]="contentLink(section.id)" (click)="leaveLegacy($event)">Conteúdo do site ↗</a>.</p>}
</article>
}</div>
<aside class="card section-add"><h2>Adicionar seção</h2><p class="muted">O novo bloco entra no fim da página. Use as setas para escolher a posição.</p>
<label>Tipo<select [(ngModel)]="addType" [disabled]="busy()"><option value="custom">Texto e botão</option><option value="image">Texto com imagem</option>
@for(item of available();track item.id){<option [value]="item.id">{{item.label}} · reincluir</option>}</select></label>
<button (click)="add()" [disabled]="busy()||sections().length>=20">+ Adicionar seção</button>
<p class="muted">{{sections().length}} de 20 seções. Excluir uma seção original preserva seus textos para reinclusão.</p>
<a href="/admin/?section=history" (click)="leaveLegacy($event)">Histórico e restauração ↗</a>
</aside>
</div>}
`,changeDetection:ChangeDetectionStrategy.OnPush})
export class Sections {
  private readonly http=inject(HttpClient);
  private readonly router=inject(Router);
  private readonly draftState=inject(DraftState);
  private readonly destroyRef=inject(DestroyRef);
  readonly auth=inject(Auth);
  readonly sections=signal<LandingSection[]>([]);
  readonly dirty=this.draftState.pending;
  readonly busy=this.draftState.working;
  readonly loaded=signal(false);
  readonly revision=signal(0);
  readonly publishedRevision=signal(0);
  readonly message=signal('');
  readonly undoCount=signal(0);
  readonly label=sectionLabel;
  addType='custom';
  private document:ContentDocument={};
  private undoStack:LandingSection[][]=[];
  constructor(){this.destroyRef.onDestroy(()=>{this.dirty.set(false);this.busy.set(false);});void this.load();}
  contentLink(id:string){return '/admin/?section='+({portfolio:'portfolio',contato:'contact'}[id as 'portfolio'|'contato']||'home');}
  available(){return sectionCatalog.filter(s=>!this.sections().some(x=>x.id===s.id));}
  async load(){
    if(this.busy())return;this.busy.set(true);this.message.set('');
    try{const data=await firstValueFrom(this.http.get<DraftResponse>('/api/admin/content'));if(this.destroyRef.destroyed)return;
      this.document=data.draft;this.sections.set(structuredClone(data.draft.sections??initialSections()));
      this.revision.set(data.revision);this.publishedRevision.set(data.published_revision);this.dirty.set(false);
      this.undoStack=[];this.undoCount.set(0);this.loaded.set(true);
    }catch(e){this.error(e);}finally{this.busy.set(false);}
  }
  async reload(){if(this.dirty()&&!window.confirm('Recarregar e descartar alterações não salvas?'))return;await this.load();}
  private change(next:LandingSection[]){this.undoStack.push(structuredClone(this.sections()));if(this.undoStack.length>30)this.undoStack.shift();this.undoCount.set(this.undoStack.length);this.sections.set(next);this.dirty.set(true);this.message.set('Alteração no rascunho. Salve para abrir a prévia.');}
  move(index:number,step:number){if(this.busy())return;const to=index+step,next=[...this.sections()];if(to<0||to>=next.length)return;[next[index],next[to]]=[next[to],next[index]];this.change(next);}
  remove(index:number){if(this.busy()||this.sections().length===1)return;const item=this.sections()[index];if(!window.confirm('Excluir “'+this.label(item)+'” do rascunho? O site só muda depois de publicar.'))return;this.change(this.sections().filter((_,i)=>i!==index));}
  add(){if(this.busy()||this.sections().length>=20)return;
    let item:LandingSection;
    if(['custom','image'].includes(this.addType)){item={id:'custom-'+crypto.randomUUID(),type:'custom',title:'Nova seção',description:'',image:'',alt:'',button:'',url:''};if(this.addType==='image')this.message.set('Inclua a imagem e sua descrição no novo bloco.');}
    else{if(!this.available().some(s=>s.id===this.addType))return;item={id:this.addType,type:'builtin'};this.addType='custom';}
    this.change([...this.sections(),item]);
  }
  edit(id:string,key:'title'|'description'|'image'|'alt'|'button'|'url',value:string){if(this.busy())return;this.sections.update(items=>items.map(s=>s.id===id&&s.type==='custom'?{...s,[key]:value}:s));this.dirty.set(true);}
  undo(){if(this.busy())return;const previous=this.undoStack.pop();if(previous){this.sections.set(previous);this.dirty.set(true);this.undoCount.set(this.undoStack.length);this.message.set('Alteração desfeita. Salve o rascunho para manter esta versão.');}}
  async upload(id:string,event:Event){const field=event.target as HTMLInputElement,file=field.files?.[0];if(!file||this.busy())return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>4*1024*1024){this.message.set('Use PNG, JPG ou WebP até 4 MB.');field.value='';return;}
    this.busy.set(true);this.message.set('Enviando imagem…');
    try{const data=await firstValueFrom(this.http.post<{url:string}>('/api/admin/upload',file,{headers:{'Content-Type':file.type}}));this.sections.update(items=>items.map(s=>s.id===id&&s.type==='custom'?{...s,image:data.url}:s));this.dirty.set(true);this.message.set('Imagem enviada. Preencha sua descrição e salve o rascunho.');}catch(e){this.error(e);}finally{this.busy.set(false);field.value='';}
  }
  async save(){if(this.busy()||!this.loaded()||!this.dirty())return;this.busy.set(true);
    try{const content={...this.document,sections:structuredClone(this.sections())};const data=await firstValueFrom(this.http.put<SavedResponse>('/api/admin/content',{revision:this.revision(),content}));
      this.document=content;this.revision.set(data.revision);this.publishedRevision.set(data.published_revision);this.dirty.set(false);this.undoStack=[];this.undoCount.set(0);this.message.set('Rascunho salvo. Abra a prévia antes de publicar.');
    }catch(e){this.error(e);}finally{this.busy.set(false);}
  }
  async publish(){if(this.busy()||this.dirty()||this.auth.profile()?.role==='editor')return;if(!window.confirm('Publicar esta ordem e conteúdo das seções no site?'))return;this.busy.set(true);
    try{const data=await firstValueFrom(this.http.post<{published_revision:number}>('/api/admin/publish',{revision:this.revision()}));this.publishedRevision.set(data.published_revision);this.message.set('Seções publicadas. O site já está atualizado.');}catch(e){this.error(e);}finally{this.busy.set(false);}
  }
  preview(event:Event){if(this.dirty()||this.busy()){event.preventDefault();this.message.set('Salve o rascunho antes de abrir a prévia.');}}
  canLeave(){if(!this.auth.profile())return true;return !this.busy()&&(!this.dirty()||window.confirm('Sair desta tela e descartar as alterações não salvas?'));}
  leaveLegacy(event:Event){if(!this.canLeave())event.preventDefault();}
  @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if(this.dirty()||this.busy()){event.preventDefault();event.returnValue='';}}
  private error(e:unknown){if(this.destroyRef.destroyed)return;if(e instanceof HttpErrorResponse&&e.status===401){this.auth.profile.set(null);this.dirty.set(false);void this.router.navigateByUrl('/login');}else{
    const fields=e instanceof HttpErrorResponse&&Array.isArray(e.error?.fields)?e.error.fields.map((x:{path:string,message:string})=>x.path+': '+x.message).join(' · '):'';
    this.message.set(apiMessage(e)+(fields?' '+fields:'')+(e instanceof HttpErrorResponse&&e.status===409?' Suas alterações foram mantidas nesta tela. Recarregue para consultar a versão mais recente.':''));
  }}
}
