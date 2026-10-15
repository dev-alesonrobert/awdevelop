import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminPage } from '../../core/admin-page';
import { Board, ContactQueue, ContactQueueItem, LeadDetail, LeadForm, Task, TeamMember } from '../../core/commercial-models';
@Injectable()
export class CrmPage extends AdminPage {
    private readonly route = inject(ActivatedRoute);
    readonly board = signal<Board>({ items: [], stats: [], next: null });
    readonly team = signal<TeamMember[]>([]);
    readonly detail = signal<LeadDetail | null>(null);
    readonly opened = signal(false);
    readonly activitySaved = signal(0);
    readonly taskSaved = signal(0);
    search = '';
    assignee = '';
    filters: Record<string, string> = { city: '', state: '', neighborhood: '', segment: '', priority: '', stage: '', service: '', origin: '', website: '', phone: '', email: '', minValue: '', maxValue: '', from: '', to: '', followup: '' };
    view: 'pipeline' | 'list' | 'today' = 'pipeline';
    readonly queue = signal<ContactQueue>({items:[],total:0,timezone:'America/Sao_Paulo'});
    queueScope: 'mine' | 'team' = 'team';
    async loadQueue() {
        const data=await this.request(this.http.get<ContactQueue>('/api/admin/crm/contact-queue',{params:{scope:this.queueScope}}));
        if(data)this.queue.set(data);
    }
    async showQueue() { this.view='today'; await this.loadQueue(); }
    async completeQueue(item:ContactQueueItem) {
        if(this.dirty()){this.message.set('Salve ou feche a ficha antes de concluir um retorno.');return;}
        await this.toggleTask({id:item.id,title:item.title,assignee:item.assignee||'',due_at:item.due_at||'',done:false,revision:item.revision});
    }
    private appliedFilters: Record<string, string> = {};
    resetFilters() { this.search = ''; this.assignee = ''; for (const key of Object.keys(this.filters)) this.filters[key] = ''; void this.load(); }
    private leadRequestId = crypto.randomUUID();
    private taskRequestId = crypto.randomUUID();
    private scopes = new Set<string>();
    async initialize() { const team = await this.request(this.http.get<{
        items: TeamMember[];
    }>('/api/admin/crm/team')); if (team)
        this.team.set(team.items); await this.load(); this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => { if(params.get('view')==='today')void this.showQueue(); const id = params.get('lead'); if (id && /^\d+$/.test(id) && id !== this.detail()?.lead.id)
        void this.open(id); }); }
    override changed(scope = 'lead') { this.scopes.add(scope); super.changed(); }
    private saved(scope: string) { this.scopes.delete(scope); if (!this.scopes.size)
        this.clean(); }
    private discard() { this.scopes.clear(); this.clean(); }
    async load(more = false) { if (this.busy()) return; const selected = { search: this.search, assignee: this.assignee, ...this.filters }; const params: Record<string, string> = more ? { ...this.appliedFilters } : selected; if (more && this.board().next)
        params['before'] = this.board().next!; const data = await this.request(this.http.get<Board>('/api/admin/crm/leads', { params })); if (data) {
        if (!more) this.appliedFilters = { ...selected };
        this.board.set(more ? { ...data, items: [...this.board().items, ...data.items] } : data); } }
    async open(id: string) { if (!this.canLeave())
        return; const result = await this.request(this.http.get<LeadDetail>('/api/admin/crm/leads/' + id)); if (result) {
        this.detail.set(result);
        this.opened.set(true);
        this.discard();
        this.taskRequestId = crypto.randomUUID();
    } }
    newLead() { if (!this.canLeave())
        return; this.detail.set(null); this.opened.set(false); this.discard(); this.leadRequestId = crypto.randomUUID(); queueMicrotask(() => { if (!this.destroyRef.destroyed)
        this.opened.set(true); }); }
    close() { if (!this.canLeave())
        return; this.opened.set(false); this.detail.set(null); this.discard(); }
    async save(form: LeadForm) { const current = this.detail()?.lead; const request = current ? this.http.patch<{
        revision: number;
    }>('/api/admin/crm/leads/' + current.id, { ...form, revision: current.revision }) : this.http.post<{
        id: string;
    }>('/api/admin/crm/leads', { ...form, requestId: this.leadRequestId }); const result = await this.request<{
        revision?: number;
        id?: string;
    }>(request); if (!result)
        return; this.saved('lead'); const id = current?.id ?? (result.id ?? ''); if (id)
        await this.refreshDetail(id); await this.load(); this.message.set('Oportunidade salva.'); }
    private async refreshDetail(id = this.detail()?.lead.id) { if (!id)
        return; const detail = await this.request(this.http.get<LeadDetail>('/api/admin/crm/leads/' + id)); if (detail) {
        this.detail.set(detail);
        this.opened.set(true);
    } }
    async addActivity(form: {
        kind: string;
        body: string;
    }) { const id = this.detail()?.lead.id; if (!id)
        return; const result = await this.request(this.http.post<{
        ok: boolean;
    }>('/api/admin/crm/leads/' + id + '/events', form)); if (result) {
        this.saved('activity');
        this.activitySaved.update(x => x + 1);
        await this.refreshDetail();
        if(this.view==='today')await this.loadQueue();
        this.message.set('Contato registrado.');
    } }
    async addTask(form: {
        title: string;
        dueAt: string;
        assignee: string;
    }) { const id = this.detail()?.lead.id; if (!id)
        return; const result = await this.request(this.http.post<{
        ok: boolean;
    }>('/api/admin/crm/leads/' + id + '/tasks', { ...form, requestId: this.taskRequestId })); if (result) {
        this.taskRequestId = crypto.randomUUID();
        this.saved('task');
        this.taskSaved.update(x => x + 1);
        await this.refreshDetail();
        if(this.view==='today')await this.loadQueue();
        this.message.set('Tarefa agendada.');
    } }
    async toggleTask(task: Task) { const result = await this.request(this.http.patch<{
        revision: number;
    }>('/api/admin/crm/tasks/' + task.id, { done: !task.done, revision: task.revision })); if (result) {
        await this.refreshDetail();
        if(this.view==='today')await this.loadQueue();
        this.message.set('Tarefa atualizada.');
    } }
}
