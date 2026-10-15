import { Injectable, signal } from '@angular/core';
import { AdminPage } from '../../core/admin-page';
import { Quote, QuoteStatus } from '../../core/commercial-models';
@Injectable()
export class QuotesPage extends AdminPage {
    readonly items = signal<Quote[]>([]);
    readonly selected = signal<Quote | null>(null);
    readonly next = signal<string | null>(null);
    search = '';
    status = 'all';
    private followupPending = false;
    private proposalPending = false;
    followupChanged() { this.followupPending = true; this.changed(); }
    proposalChanged(pending: boolean) {
        this.proposalPending = pending;
        if (pending || this.followupPending) this.changed(); else this.clean();
    }
    proposalWorking(working: boolean) { this.busy.set(working); this.draftState.working.set(working); }
    private resetEdits() { this.followupPending = false; this.proposalPending = false; this.clean(); }
    async load(more = false) { if (this.dirty() && !this.canLeave())
        return; const params: Record<string, string> = { search: this.search, status: this.status }; if (more && this.next())
        params['before'] = this.next()!; const result = await this.request(this.http.get<{
        items: Quote[];
        next: string | null;
    }>('/api/admin/quotes', { params })); if (result) {
        this.items.set(more ? [...this.items(), ...result.items] : result.items);
        this.next.set(result.next);
        if (!more) {
            this.selected.set(null);
            this.resetEdits();
        }
    } }
    open(quote: Quote) { if (this.selected()?.id === quote.id || !this.canLeave())
        return; this.selected.set(structuredClone(quote)); this.resetEdits(); }
    async save(value: {
        status: QuoteStatus;
        notes: string;
    }) { const q = this.selected(); if (!q)
        return; const result = await this.request(this.http.patch<{
        revision: number;
    }>('/api/admin/quotes/' + q.id, { ...value, revision: q.revision })); if (result) {
        const updated = { ...q, ...value, revision: result.revision };
        this.selected.set(updated);
        this.items.update(items => items.map(x => x.id === q.id ? updated : x));
        this.followupPending = false;
        if (this.proposalPending) this.changed(); else this.clean();
        this.message.set('Acompanhamento salvo.');
    } }
}
