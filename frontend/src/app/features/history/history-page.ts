import { Injectable, signal } from '@angular/core';
import { AdminPage } from '../../core/admin-page';
import { ContentDraft, LandingContent } from '../../core/content-models';
interface Publication {
    id: string;
    revision: number;
    created_at: string;
    editor_name: string;
}
@Injectable()
export class HistoryPage extends AdminPage {
    readonly items = signal<Publication[]>([]);
    readonly next = signal<string | null>(null);
    readonly snapshot = signal('');
    readonly snapshotId = signal('');
    async load(more = false) { const data = await this.request(this.http.get<{
        items: Publication[];
        next: string | null;
    }>('/api/admin/history', { params: more && this.next() ? { before: this.next()! } : {} })); if (data) {
        this.items.set(more ? [...this.items(), ...data.items] : data.items);
        this.next.set(data.next);
    } }
    async inspect(id: string) { const data = await this.request(this.http.get<{
        content: LandingContent;
    }>('/api/admin/history/' + id)); if (data) {
        this.snapshotId.set(id);
        this.snapshot.set(JSON.stringify(data.content, null, 2));
    } }
    async restore(id: string) { if (!window.confirm('Restaurar esta versão no rascunho? A publicação atual permanece até você publicar novamente.'))
        return; const draft = await this.request(this.http.get<ContentDraft>('/api/admin/content')); if (!draft)
        return; const result = await this.request(this.http.post<{
        revision: number;
    }>('/api/admin/history/' + id + '/restore', { revision: draft.revision })); if (result)
        this.message.set('Restaurado no rascunho (revisão ' + result.revision + '). Confira a prévia e publique no editor.'); }
}
