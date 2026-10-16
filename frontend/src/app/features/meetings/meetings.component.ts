import {ChangeDetectionStrategy,Component,DestroyRef,HostListener,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute,Router} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {apiMessage} from '../../core/api';
import {PageHeadingComponent} from '../../shared/page-heading/page-heading.component';
import {MeetingsApi} from './meetings-api.service';
import {MeetingRoomComponent} from './meeting-room.component';
import {validRoom,type MeetingStatus,type MeetingSession} from './meetings.models';

@Component({selector:'aw-meetings',imports:[FormsModule,PageHeadingComponent,MeetingRoomComponent],templateUrl:'./meetings.component.html',styleUrl:'./meetings.component.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class MeetingsComponent {
 private readonly api=inject(MeetingsApi);
 private readonly route=inject(ActivatedRoute);
 private readonly router=inject(Router);
 private readonly destroy=inject(DestroyRef);
 readonly status=signal<MeetingStatus|null>(null);
 readonly session=signal<MeetingSession|null>(null);
 readonly busy=signal(false);
 readonly message=signal('');
 readonly room=signal('');
 invite='';
 constructor(){
  this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params=>{
   const room=params.get('room')||'';
   if(this.session()&&this.room()!==room)this.session.set(null);
   this.room.set(validRoom(room)?room:'');
   if(room&&!validRoom(room))this.message.set('Este convite é inválido. Solicite um novo link.');
  });
  void this.refresh();
 }
 async refresh(){
  if(this.busy())return;this.busy.set(true);
  try {const status=await firstValueFrom(this.api.status());if(!this.destroy.destroyed)this.status.set(status);}
  catch(error){if(!this.destroy.destroyed)this.message.set(apiMessage(error));}
  finally{if(!this.destroy.destroyed)this.busy.set(false);}
 }
 async create(){
  if(this.busy()||!this.status()?.configured||!this.status()?.canCreate)return;
  this.busy.set(true);this.message.set('');
  try {const result=await firstValueFrom(this.api.create());if(!this.destroy.destroyed)await this.router.navigate([],{relativeTo:this.route,queryParams:{room:result.room}});}
  catch(error){if(!this.destroy.destroyed)this.message.set(apiMessage(error));}
  finally{if(!this.destroy.destroyed)this.busy.set(false);}
 }
 async openInvite(){
  try {
   const url=new URL(this.invite,window.location.origin);
   const room=url.searchParams.get('room')||'';
   if(url.origin!==window.location.origin||url.pathname!=='/painel/meetings'||!validRoom(room))throw new Error();
   await this.router.navigate([],{relativeTo:this.route,queryParams:{room}});this.message.set('');
  }catch{this.message.set('Cole um convite válido do painel AW Develop.');}
 }
 get invitation(){return this.room()?`${window.location.origin}/painel/meetings?room=${this.room()}`:'';}
 async copy(){try{await navigator.clipboard.writeText(this.invitation);this.message.set('Convite copiado. Quem receber precisa entrar com uma conta da equipe.');}catch{this.message.set('Não foi possível copiar automaticamente. Selecione e copie o link abaixo.');}}
 async join(){
  if(this.busy()||this.session()||!this.status()?.configured||!this.room())return;
  this.busy.set(true);this.message.set('');
  try {const session=await firstValueFrom(this.api.join(this.room()));if(!this.destroy.destroyed)this.session.set(session);}
  catch(error){if(!this.destroy.destroyed)this.message.set(apiMessage(error));}
  finally{if(!this.destroy.destroyed)this.busy.set(false);}
 }
 leave(){this.session.set(null);this.message.set('Você saiu da sala.');}
 failed(error:string){this.session.set(null);this.message.set(error);}
 canLeave(){return !this.busy()&&(!this.session()||window.confirm('Sair desta tela encerra sua participação na reunião. Deseja continuar?'));}
 @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if(this.session()){event.preventDefault();event.returnValue='';}}
}
