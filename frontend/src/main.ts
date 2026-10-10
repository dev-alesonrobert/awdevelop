import { sessionInterceptor } from './app/core/session-interceptor';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
registerLocaleData(localePt, 'pt-BR');
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
bootstrapApplication(AppComponent, {
    providers: [provideHttpClient(withInterceptors([sessionInterceptor])), provideRouter(routes)]
}).catch(() => {
    document.body.textContent = 'Não foi possível abrir o site. Recarregue a página.';
});
