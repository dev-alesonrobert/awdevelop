import { Injectable, signal } from '@angular/core';
import { AdminPage } from '../../core/admin-page';
interface Member {
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'editor';
    active: boolean;
    registered: boolean;
}
@Injectable()
export class MembersPage extends AdminPage {
    readonly items = signal<Member[]>([]);
    readonly inviteUrl = signal('');
    form = { name: '', email: '', role: 'editor' };
    async load() { const data = await this.request(this.http.get<{
        items: Member[];
    }>('/api/admin/members')); if (data)
        this.items.set(data.items); }
    async invite() { const data = await this.request(this.http.post<{
        url: string;
        expiresDays: number;
    }>('/api/admin/invites', this.form)); if (data) {
        this.inviteUrl.set(data.url);
        this.form = { name: '', email: '', role: 'editor' };
        this.clean();
        await this.load();
        this.message.set('Convite criado. Copie e compartilhe com a pessoa.');
    } }
    async copy() { try {
        await navigator.clipboard.writeText(this.inviteUrl());
        this.message.set('Convite copiado.');
    }
    catch {
        this.message.set('Selecione o link e copie manualmente.');
    } }
    async update(member: Member, role: string, active: boolean) { if (member.role === 'owner' || !window.confirm('Atualizar o acesso de ' + member.name + '?' + (!active ? ' As sessões serão encerradas.' : '')))
        return; const result = await this.request(this.http.patch<{
        ok: boolean;
    }>('/api/admin/members', { email: member.email, role, active })); if (result) {
        await this.load();
        this.message.set('Acesso atualizado.');
    } }
}
