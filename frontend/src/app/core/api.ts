import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {Insights} from './insights.models';
import { NotificationSummary, Pipeline } from './models';
export function apiMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
        if (error.status === 401)
            return 'Sua sessão terminou. Entre novamente.';
        if (error.status === 403)
            return 'Sua conta não possui acesso a esta área.';
        if (error.status === 0)
            return 'Não foi possível conectar. Confira sua conexão.';
        return typeof error.error?.error === 'string' ? error.error.error : 'Não foi possível concluir agora. Tente novamente.';
    }
    return 'Não foi possível concluir agora. Tente novamente.';
}
@Injectable({
    providedIn: 'root'
})
export class CommercialApi {
    private readonly http = inject(HttpClient);
    notifications() {
        return this.http.get<NotificationSummary>('/api/admin/notifications');
    }
    insights() { return this.http.get<Insights>('/api/admin/crm/insights'); }
    pipeline() {
        return this.http.get<Pipeline>('/api/admin/crm/leads');
    }
}
