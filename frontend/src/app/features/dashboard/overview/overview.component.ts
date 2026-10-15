import {CommercialInsightsComponent} from '../components/commercial-insights/commercial-insights.component';
import {IntegrationUsageComponent} from '../components/integration-usage/integration-usage.component';
import {Insights} from '../../../core/insights.models';
import { PageHeadingComponent } from '../../../shared/page-heading/page-heading.component';
import { MetricCardComponent } from '../components/metric-card/metric-card.component';
import { NotificationCardComponent } from '../components/notification-card/notification-card.component';
import { Component, ChangeDetectionStrategy, DestroyRef, inject, signal, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, firstValueFrom, interval } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Auth } from '../../../core/auth';
import { CommercialApi, apiMessage } from '../../../core/api';
import { NotificationSummary } from '../../../core/models';
@Component({
    selector: 'aw-overview', imports: [CommercialInsightsComponent, IntegrationUsageComponent, CurrencyPipe, PageHeadingComponent, MetricCardComponent, NotificationCardComponent], templateUrl: './overview.component.html', styleUrl: './overview.component.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class OverviewComponent {
    private readonly auth = inject(Auth);
    private readonly api = inject(CommercialApi);
    private readonly router = inject(Router);
    private readonly destroy = inject(DestroyRef);
    readonly commercial = this.auth.profile()?.role !== 'editor';
    readonly busy = signal(false);
    readonly message = signal('');
    readonly notifications = signal<NotificationSummary | null>(null);
    readonly insights = signal<Insights | null>(null);
    readonly total = computed(() => this.insights()?.commercial.total ?? 0);
    readonly openValue = computed(() => this.insights()?.commercial.openValue ?? 0);
    constructor() {
        this.destroy.onDestroy(() => {
            this.notifications.set(null);
            this.insights.set(null);
        });
        if (this.commercial) {
            void this.refresh();
            interval(20000).pipe(takeUntilDestroyed()).subscribe(() => {
                if (!document.hidden)
                    void this.refresh();
            });
        }
    }
    async refresh() {
        if (this.busy() || !this.commercial)
            return;
        this.busy.set(true);
        try {
            const data = await firstValueFrom(forkJoin({
                notifications: this.api.notifications(), insights: this.api.insights()
            }));
            if (this.destroy.destroyed)
                return;
            this.notifications.set(data.notifications);
            this.insights.set(data.insights);
            this.message.set('');
        }
        catch (e) {
            if (this.destroy.destroyed)
                return;
            this.message.set(apiMessage(e));
            if (e instanceof HttpErrorResponse && e.status === 401) {
                this.auth.profile.set(null);
                await this.router.navigateByUrl('/painel/login');
            }
        }
        finally {
            if (!this.destroy.destroyed)
                this.busy.set(false);
        }
    }
}
