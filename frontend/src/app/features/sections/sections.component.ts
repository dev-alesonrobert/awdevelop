import { PageHeadingComponent } from '../../shared/page-heading/page-heading.component';
import { SectionCardComponent } from './components/section-card/section-card.component';
import { SectionAddComponent } from './components/section-add/section-add.component';
import { SectionToolbarComponent } from './components/section-toolbar/section-toolbar.component';
import { Component, ChangeDetectionStrategy, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../../core/auth';
import { DraftState } from '../../core/draft-state';
import { apiMessage } from '../../core/api';
import { ContentDocument, DraftResponse, SavedResponse, LandingSection, initialSections, sectionCatalog, sectionLabel } from './models';
@Component({
    selector: 'aw-sections', imports: [PageHeadingComponent, SectionCardComponent, SectionAddComponent, SectionToolbarComponent], templateUrl: './sections.component.html', styleUrl: './sections.component.scss', changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectionsComponent {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly draftState = inject(DraftState);
    private readonly destroyRef = inject(DestroyRef);
    readonly auth = inject(Auth);
    readonly sections = signal<LandingSection[]>([]);
    readonly dirty = this.draftState.pending;
    readonly busy = this.draftState.working;
    readonly loaded = signal(false);
    readonly revision = signal(0);
    readonly publishedRevision = signal(0);
    readonly message = signal('');
    readonly undoCount = signal(0);
    readonly label = sectionLabel;
    addType = 'custom';
    private document: ContentDocument = {};
    private undoStack: LandingSection[][] = [];
    constructor() {
        this.destroyRef.onDestroy(() => {
            this.dirty.set(false);
            this.busy.set(false);
        });
        void this.load();
    }
    contentLink(id: string) {
        return '/painel/content?tab=' + ({
            portfolio: 'portfolio', contato: 'contact'
        }[id as 'portfolio' | 'contato'] || 'home');
    }
    available() {
        return sectionCatalog.filter(s => !this.sections().some(x => x.id === s.id));
    }
    async load() {
        if (this.busy())
            return;
        this.busy.set(true);
        this.message.set('');
        try {
            const data = await firstValueFrom(this.http.get<DraftResponse>('/api/admin/content'));
            if (this.destroyRef.destroyed)
                return;
            this.document = data.draft;
            this.sections.set(structuredClone(data.draft.sections ?? initialSections()));
            this.revision.set(data.revision);
            this.publishedRevision.set(data.published_revision);
            this.dirty.set(false);
            this.undoStack = [];
            this.undoCount.set(0);
            this.loaded.set(true);
        }
        catch (e) {
            this.error(e);
        }
        finally {
            this.busy.set(false);
        }
    }
    async reload() {
        if (this.dirty() && !window.confirm('Recarregar e descartar alterações não salvas?'))
            return;
        await this.load();
    }
    private change(next: LandingSection[]) {
        this.undoStack.push(structuredClone(this.sections()));
        if (this.undoStack.length > 30)
            this.undoStack.shift();
        this.undoCount.set(this.undoStack.length);
        this.sections.set(next);
        this.dirty.set(true);
        this.message.set('Alteração no rascunho. Salve para abrir a prévia.');
    }
    move(index: number, step: number) {
        if (this.busy())
            return;
        const to = index + step, next = [...this.sections()];
        if (to < 0 || to >= next.length)
            return;
        [next[index], next[to]] = [next[to], next[index]];
        this.change(next);
    }
    remove(index: number) {
        if (this.busy() || this.sections().length === 1)
            return;
        const item = this.sections()[index];
        if (!window.confirm('Excluir “' + this.label(item) + '” do rascunho? O site só muda depois de publicar.'))
            return;
        this.change(this.sections().filter((_, i) => i !== index));
    }
    add() {
        if (this.busy() || this.sections().length >= 20)
            return;
        let item: LandingSection;
        if (['custom', 'image'].includes(this.addType)) {
            item = {
                id: 'custom-' + crypto.randomUUID(), type: 'custom', title: 'Nova seção', description: '', image: '', alt: '', button: '', url: ''
            };
            if (this.addType === 'image')
                this.message.set('Inclua a imagem e sua descrição no novo bloco.');
        }
        else {
            if (!this.available().some(s => s.id === this.addType))
                return;
            item = {
                id: this.addType, type: 'builtin'
            };
            this.addType = 'custom';
        }
        this.change([...this.sections(), item]);
    }
    edit(id: string, key: 'title' | 'description' | 'image' | 'alt' | 'button' | 'url', value: string) {
        if (this.busy())
            return;
        this.sections.update(items => items.map(s => s.id === id && s.type === 'custom' ? {
            ...s, [key]: value
        } : s));
        this.dirty.set(true);
    }
    undo() {
        if (this.busy())
            return;
        const previous = this.undoStack.pop();
        if (previous) {
            this.sections.set(previous);
            this.dirty.set(true);
            this.undoCount.set(this.undoStack.length);
            this.message.set('Alteração desfeita. Salve o rascunho para manter esta versão.');
        }
    }
    async upload(id: string, event: Event) {
        const field = event.target as HTMLInputElement, file = field.files?.[0];
        if (!file || this.busy())
            return;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
            this.message.set('Use PNG, JPG ou WebP até 4 MB.');
            field.value = '';
            return;
        }
        this.busy.set(true);
        this.message.set('Enviando imagem…');
        try {
            const data = await firstValueFrom(this.http.post<{
                url: string;
            }>('/api/admin/upload', file, {
                headers: {
                    'Content-Type': file.type
                }
            }));
            this.sections.update(items => items.map(s => s.id === id && s.type === 'custom' ? {
                ...s, image: data.url
            } : s));
            this.dirty.set(true);
            this.message.set('Imagem enviada. Preencha sua descrição e salve o rascunho.');
        }
        catch (e) {
            this.error(e);
        }
        finally {
            this.busy.set(false);
            field.value = '';
        }
    }
    async save() {
        if (this.busy() || !this.loaded() || !this.dirty())
            return;
        this.busy.set(true);
        try {
            const content = {
                ...this.document, sections: structuredClone(this.sections())
            };
            const data = await firstValueFrom(this.http.put<SavedResponse>('/api/admin/content', {
                revision: this.revision(), content
            }));
            this.document = content;
            this.revision.set(data.revision);
            this.publishedRevision.set(data.published_revision);
            this.dirty.set(false);
            this.undoStack = [];
            this.undoCount.set(0);
            this.message.set('Rascunho salvo. Abra a prévia antes de publicar.');
        }
        catch (e) {
            this.error(e);
        }
        finally {
            this.busy.set(false);
        }
    }
    async publish() {
        if (this.busy() || this.dirty() || this.auth.profile()?.role === 'editor')
            return;
        if (!window.confirm('Publicar esta ordem e conteúdo das seções no site?'))
            return;
        this.busy.set(true);
        try {
            const data = await firstValueFrom(this.http.post<{
                published_revision: number;
            }>('/api/admin/publish', {
                revision: this.revision()
            }));
            this.publishedRevision.set(data.published_revision);
            this.message.set('Seções publicadas. O site já está atualizado.');
        }
        catch (e) {
            this.error(e);
        }
        finally {
            this.busy.set(false);
        }
    }
    preview(event: Event) {
        if (this.dirty() || this.busy()) {
            event.preventDefault();
            this.message.set('Salve o rascunho antes de abrir a prévia.');
        }
    }
    canLeave() {
        if (!this.auth.profile())
            return true;
        return !this.busy() && (!this.dirty() || window.confirm('Sair desta tela e descartar as alterações não salvas?'));
    }
    leaveLegacy(event: Event) {
        if (!this.canLeave())
            event.preventDefault();
    }
    @HostListener('window:beforeunload', ['$event'])
    beforeUnload(event: BeforeUnloadEvent) {
        if (this.dirty() || this.busy()) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
    private error(e: unknown) {
        if (this.destroyRef.destroyed)
            return;
        if (e instanceof HttpErrorResponse && e.status === 401) {
            this.auth.profile.set(null);
            this.dirty.set(false);
            void this.router.navigateByUrl('/painel/login');
        }
        else {
            const fields = e instanceof HttpErrorResponse && Array.isArray(e.error?.fields) ? e.error.fields.map((x: {
                path: string;
                message: string;
            }) => x.path + ': ' + x.message).join(' · ') : '';
            this.message.set(apiMessage(e) + (fields ? ' ' + fields : '') + (e instanceof HttpErrorResponse && e.status === 409 ? ' Suas alterações foram mantidas nesta tela. Recarregue para consultar a versão mais recente.' : ''));
        }
    }
}
