import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Config, ImportForm, Location, SearchQuery, SearchResponse, Prospect, CrmStatus } from './prospecting.models';
import { Board } from '../../core/commercial-models';
import { Offer, ApproachMessages, ApproachResult } from './approach/approach.models';
@Injectable({ providedIn: 'root' })
export class ProspectingService {
    private readonly http = inject(HttpClient);
    private readonly base = '/api/admin/prospecting';
    config() { return this.http.get<Config>(this.base + '/config'); }
    locations(q: string) { return this.http.get<{
        items: Location[];
    }>(this.base + '/locations', { params: { q } }); }
    search(query: SearchQuery) { return this.http.post<SearchResponse>(this.base + '/search', query); }
    googleDetails(token: string) { return this.http.post<{
        item: Prospect;
    }>(this.base + '/google-details', { token }); }
    save(searchId: string, key: string, form: ImportForm) { return this.http.post<{
        id: string;
        duplicate: boolean;
    }>(this.base + '/import', { searchId, key, ...form }); }
    statuses(keys: string[]) { return this.http.post<{
        items: CrmStatus[];
    }>(this.base + '/crm-status', { keys }); }
    pipeline() { return this.http.get<Board>('/api/admin/crm/leads'); }
    approachConfig() { return this.http.get<{aiEnabled:boolean}>(this.base + '/approach-config'); }
    approach(searchId: string, prospect: Prospect, offer: Offer) {
        return this.http.post<ApproachResult>(this.base + '/approach', {
            ...offer, searchId, key: prospect.key,
            ...(prospect.source === 'Google Maps' && offer.mode === 'template' ? {googleName: prospect.name} : {}),
        });
    }
    saveApproach(id: string, messages: ApproachMessages) {
        return this.http.post<{ok:boolean}>('/api/admin/crm/leads/' + id + '/events', {
            kind: 'note', body: 'Rascunho de abordagem (não indica envio)\n\nPrimeiro contato:\n' + messages.message + '\n\nFollow-up:\n' + messages.followup,
        });
    }
}
