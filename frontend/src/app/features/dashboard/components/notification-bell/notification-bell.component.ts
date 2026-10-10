import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../../../../core/auth';
import { apiMessage } from '../../../../core/api';
import { NotificationSummary } from '../../../../core/models';
@Component({ selector: 'aw-notification-bell', imports: [RouterLink, DatePipe], templateUrl: './notification-bell.component.html', styleUrl: './notification-bell.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class NotificationBellComponent {
    private readonly http = inject(HttpClient);
    private readonly auth = inject(Auth);
    private readonly destroyRef = inject(DestroyRef);
    readonly summary = signal<NotificationSummary | null>(null);
    readonly opened = signal(false);
    readonly message = signal('');
    readonly busy = signal(false);
    readonly toggle = (x: boolean) => !x;
    constructor() { const timer = setInterval(() => { if (!document.hidden)
        void this.refresh(); }, 20000); this.destroyRef.onDestroy(() => clearInterval(timer)); void this.refresh(); }
    async refresh() { if (this.busy() || this.auth.profile()?.role === 'editor')
        return; this.busy.set(true); try {
        const data = await firstValueFrom(this.http.get<NotificationSummary>('/api/admin/notifications'));
        if (!this.destroyRef.destroyed)
            this.summary.set(data);
    }
    catch (e) {
        if (!this.destroyRef.destroyed)
            this.message.set(apiMessage(e));
    }
    finally {
        this.busy.set(false);
    } }
    async read() { const through = this.summary()?.latest; if (!through)
        return; this.busy.set(true); try {
        await firstValueFrom(this.http.post('/api/admin/notifications/read', { through }));
        this.busy.set(false);
        await this.refresh();
    }
    catch (e) {
        this.message.set(apiMessage(e));
    }
    finally {
        this.busy.set(false);
    } }
}
