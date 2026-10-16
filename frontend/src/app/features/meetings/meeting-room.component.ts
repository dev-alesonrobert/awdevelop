import {ChangeDetectionStrategy,Component,DestroyRef,ElementRef,NgZone,inject,input,output,signal,viewChild} from '@angular/core';
import {JaasLoader,type JaasInstance} from './jaas-loader.service';
import type {MeetingSession} from './meetings.models';

@Component({selector:'aw-meeting-room',templateUrl:'./meeting-room.component.html',styleUrl:'./meeting-room.component.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class MeetingRoomComponent {
 readonly session=input.required<MeetingSession>();
 readonly closed=output<void>();
 readonly failed=output<string>();
 readonly loading=signal(true);
 private readonly host=viewChild.required<ElementRef<HTMLElement>>('host');
 private readonly loader=inject(JaasLoader);
 private readonly destroy=inject(DestroyRef);
 private readonly zone=inject(NgZone);
 private api?:JaasInstance;
 constructor(){this.destroy.onDestroy(()=>this.api?.dispose());}
 async ngAfterViewInit() {
  try {
   const session=this.session();await this.loader.load(session.appId);
   if(this.destroy.destroyed)return;
   this.zone.runOutsideAngular(()=>{
    this.api=new window.JitsiMeetExternalAPI!('8x8.vc',{
     roomName:`${session.appId}/${session.room}`,jwt:session.jwt,parentNode:this.host().nativeElement,width:'100%',height:'100%',
     configOverwrite:{startWithAudioMuted:true,startWithVideoMuted:true,prejoinConfig:{enabled:true},disableDeepLinking:true,
      toolbarButtons:['microphone','camera','desktop','chat','tileview','participants-pane','raisehand','settings','fullscreen','hangup','security'],
      hideConferenceSubject:true,disableInviteFunctions:true},
    });
    this.api.addListener('readyToClose',()=>this.zone.run(()=>this.closed.emit()));
   });
   this.loading.set(false);
  }catch(error){if(!this.destroy.destroyed)this.failed.emit(error instanceof Error?error.message:'Não foi possível abrir a reunião.');}
 }
}
