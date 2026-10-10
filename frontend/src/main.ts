import {registerLocaleData} from '@angular/common';
import localePt from '@angular/common/locales/pt';
registerLocaleData(localePt,'pt-BR');
import {bootstrapApplication} from '@angular/platform-browser';
import {provideHttpClient,withInterceptors} from '@angular/common/http';
import {provideRouter} from '@angular/router';
import {App} from './app/app';
import {routes} from './app/app.routes';
bootstrapApplication(App,{providers:[provideHttpClient(withInterceptors([(req,next)=>next(req.clone({withCredentials:true}))])),provideRouter(routes)]}).catch(()=>{document.body.textContent='Não foi possível abrir o painel. Recarregue a página.';});
