import {Injectable} from '@angular/core';

export interface JaasInstance {
 addListener(event:string,callback:()=>void):void;
 dispose():void;
}
export interface JaasOptions {
 roomName:string;jwt:string;parentNode:HTMLElement;width:string;height:string;
 configOverwrite:Record<string,unknown>;
}
declare global {interface Window {JitsiMeetExternalAPI?:new(domain:string,options:JaasOptions)=>JaasInstance;}}

@Injectable({providedIn:'root'})
export class JaasLoader {
 private pending?:Promise<void>;
 load(appId:string):Promise<void> {
  if(!/^vpaas-magic-cookie-[a-f0-9]{32}$/.test(appId))return Promise.reject(new Error('Configuração inválida.'));
  if(window.JitsiMeetExternalAPI)return Promise.resolve();
  if(this.pending)return this.pending;
  this.pending=new Promise<void>((resolve,reject)=>{
   const script=document.createElement('script');
   const finish=(success:boolean)=>{
    clearTimeout(timeout);script.onload=null;script.onerror=null;
    if(success&&window.JitsiMeetExternalAPI)resolve();
    else {script.remove();this.pending=undefined;reject(new Error('Não foi possível carregar a sala. Confira sua conexão e tente novamente.'));}
   };
   const timeout=setTimeout(()=>finish(false),20000);
   script.src=`https://8x8.vc/${appId}/external_api.js`;script.async=true;
   script.onload=()=>finish(true);script.onerror=()=>finish(false);document.head.appendChild(script);
  });
  return this.pending;
 }
}
