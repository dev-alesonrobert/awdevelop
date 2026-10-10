import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { TopbarComponent } from '../components/topbar/topbar.component';
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { DraftState } from '../../../core/draft-state';
import { Auth } from '../../../core/auth';
import { apiMessage } from '../../../core/api';
@Component({
    selector: 'aw-shell', imports: [SidebarComponent, TopbarComponent, RouterOutlet], templateUrl: './shell.component.html', styleUrl: './shell.component.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
    readonly auth = inject(Auth);
    private readonly draftState = inject(DraftState);
    private readonly router = inject(Router);
    readonly busy = signal(false);
    readonly message = signal('');
    async logout() {
        if (this.busy())
            return;
        if (this.draftState.working()) {
            this.message.set('Aguarde o salvamento ou envio de imagem antes de sair.');
            return;
        }
        if (this.draftState.pending() && !window.confirm('Sair e descartar as alterações não salvas?'))
            return;
        this.busy.set(true);
        try {
            await this.auth.signOut();
            this.draftState.pending.set(false);
            await this.router.navigateByUrl('/painel/login');
        }
        catch (e) {
            this.message.set(apiMessage(e));
        }
        finally {
            this.busy.set(false);
        }
    }
}
