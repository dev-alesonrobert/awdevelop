import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminPage } from '../../core/admin-page';
import { ContentDraft, LandingContent, Project } from '../../core/content-models';
@Injectable()
export class ContentEditor extends AdminPage {
    readonly content = signal<LandingContent | null>(null);
    readonly revision = signal(0);
    readonly published = signal(0);
    readonly autosave = signal(false);
    readonly presence = signal<string[]>([]);
    readonly labels: Record<string, string> = { title: 'Título', accent: 'Destaque / cor roxa', description: 'Descrição', button: 'Texto do botão', note: 'Nota do portfólio', category: 'Categoria', summary: 'Resumo', image: 'Imagem (assets ou HTTPS)', alt: 'Descrição da imagem', url: 'Link HTTPS', brand: 'Nome da marca', logo: 'Logo', background: 'Cor de fundo', email: 'E-mail', whatsapp: 'WhatsApp (somente números com DDI)', instagram: 'Instagram HTTPS', linkedin: 'LinkedIn HTTPS' };
    private readonly tabId = crypto.randomUUID();
    private timer: ReturnType<typeof setTimeout> | undefined;
    constructor() { super(); const interval = setInterval(() => { if (!document.hidden)
        void this.heartbeat(); }, 25000); this.destroyRef.onDestroy(() => { clearInterval(interval); clearTimeout(this.timer); void firstValueFrom(this.http.delete('/api/admin/presence/' + this.tabId)).catch(() => { }); }); void this.heartbeat(); }
    async heartbeat() { try {
        const result = await firstValueFrom(this.http.post<{
            items: {
                name: string;
            }[];
        }>('/api/admin/presence', { tabId: this.tabId }));
        if (!this.destroyRef.destroyed)
            this.presence.set([...new Set(result.items.map(x => x.name))]);
    }
    catch { /* Presence is informational; saving remains available. */ } }
    async load() { const data = await this.request(this.http.get<ContentDraft>('/api/admin/content')); if (data) {
        this.content.set(data.draft);
        this.revision.set(data.revision);
        this.published.set(data.published_revision);
        this.clean();
    } }
    async reload() { if (this.canLeave()) {
        clearTimeout(this.timer);
        await this.load();
    } }
    private update(change: (content: LandingContent) => void) { if (this.busy() || !this.content())
        return; const next = structuredClone(this.content()!); change(next); this.content.set(next); this.changed(); clearTimeout(this.timer); this.timer = setTimeout(() => { if (this.autosave() && !this.destroyRef.destroyed)
        void this.save(); }, 3000); }
    edit(group: 'hero' | 'portfolio' | 'contact' | 'settings', key: string, value: string | number | boolean) { this.update(c => { Object.assign(c[group], { [key]: value }); }); }
    block(key: string, value: string) { this.update(c => { c.blocks[key] = value; }); }
    project(index: number, key: string, value: string | string[] | boolean) { this.update(c => { Object.assign(c.portfolio.projects[index], { [key]: value }); }); }
    tags(index: number, value: string) { this.project(index, 'tags', value.split(',').map(x => x.trim()).filter(Boolean)); }
    move(index: number, step: number) { this.update(c => { const list = c.portfolio.projects, to = index + step; if (to >= 0 && to < list.length)
        [list[index], list[to]] = [list[to], list[index]]; }); }
    add() { this.update(c => { if (c.portfolio.projects.length < 20)
        c.portfolio.projects.push({ id: 'projeto-' + crypto.randomUUID(), title: 'Novo projeto', category: 'SITE', summary: '', description: '', image: 'assets/forma.webp', alt: 'Prévia do projeto', tags: [], concept: true, url: '' }); }); }
    remove(index: number) { if (window.confirm('Excluir este projeto do rascunho?'))
        this.update(c => { if (c.portfolio.projects.length > 1)
            c.portfolio.projects.splice(index, 1); }); }
    uploading(value: boolean) { this.busy.set(value); this.draftState.working.set(value); }
    async save() { if (!this.dirty() || !this.content())
        return; clearTimeout(this.timer); const data = await this.request(this.http.put<{
        revision: number;
        published_revision: number;
    }>('/api/admin/content', { revision: this.revision(), content: structuredClone(this.content()) })); if (data) {
        this.revision.set(data.revision);
        this.published.set(data.published_revision);
        this.clean();
        this.message.set('Rascunho salvo. Confira a prévia antes de publicar.');
    }
    else
        this.autosave.set(false); }
    preview(event: Event) { if (this.dirty() || this.busy()) {
        event.preventDefault();
        this.message.set('Salve o rascunho antes de abrir a prévia.');
    } }
    async publish() { if (this.dirty() || this.auth.profile()?.role === 'editor' || !window.confirm('Publicar o rascunho atual no site?'))
        return; const data = await this.request(this.http.post<{
        published_revision: number;
    }>('/api/admin/publish', { revision: this.revision() })); if (data) {
        this.published.set(data.published_revision);
        this.message.set('Site publicado.');
    } }
}
