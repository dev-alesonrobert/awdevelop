import { Component, ChangeDetectionStrategy, inject, signal, input, output, DestroyRef, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { LeadDetail, LeadForm, TeamMember, Task, stages, whatsapp } from '../../../core/commercial-models';
@Component({ selector: 'aw-lead-editor', imports: [FormsModule, DatePipe], templateUrl: './lead-editor.component.html', styleUrl: './lead-editor.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class LeadEditorComponent {
    readonly detail = input<LeadDetail | null>(null);
    readonly team = input<TeamMember[]>([]);
    readonly busy = input(false);
    readonly saved = output<LeadForm>();
    readonly closed = output<void>();
    readonly changed = output<'lead' | 'activity' | 'task'>();
    readonly activitySaved = input(0);
    readonly taskSaved = input(0);
    private currentId = '';
    readonly activity = output<{
        kind: string;
        body: string;
    }>();
    readonly task = output<{
        title: string;
        dueAt: string;
        assignee: string;
    }>();
    readonly toggleTask = output<Task>();
    readonly stages = stages;
    readonly wa = whatsapp;
    form: LeadForm = { name: '', company: '', email: '', phone: '', website: '', service: 'Site institucional', origin: 'Cadastro manual', crmStage: 'new', assignee: '', value: 0, expectedClose: '', idea: '' };
    readonly textFields = ['name', 'company', 'email', 'phone', 'website', 'service', 'origin'] as const;
    readonly labels = { name: 'Nome', company: 'Empresa', email: 'E-mail', phone: 'Telefone', website: 'Site HTTPS', service: 'Serviço', origin: 'Origem' };
    note = { kind: 'note', body: '' };
    followup = { title: '', dueAt: '', assignee: '' };
    constructor() { effect(() => { this.activitySaved(); this.note = { kind: 'note', body: '' }; }); effect(() => { this.taskSaved(); this.followup = { title: '', dueAt: '', assignee: '' }; }); effect(() => { const lead = this.detail()?.lead; if (!lead && this.currentId) {
        this.currentId = '';
        this.form = { name: '', company: '', email: '', phone: '', website: '', service: 'Site institucional', origin: 'Cadastro manual', crmStage: 'new', assignee: '', value: 0, expectedClose: '', idea: '' };
        this.note = { kind: 'note', body: '' };
        this.followup = { title: '', dueAt: '', assignee: '' };
    } if (lead && lead.id !== this.currentId) {
        this.note = { kind: 'note', body: '' };
        this.followup = { title: '', dueAt: '', assignee: '' };
        this.currentId = lead.id;
        this.form = { name: lead.name, company: lead.company, email: lead.email, phone: lead.phone, website: lead.contact_website || '', service: lead.service, origin: lead.origin, crmStage: lead.crm_stage, assignee: lead.assignee || '', value: Number(lead.estimated_value), expectedClose: lead.expected_close?.slice(0, 10) || '', idea: lead.idea };
    } }); }
    submit() { this.saved.emit({ ...this.form, value: Number(this.form.value) }); }
    addTask() { if (!this.followup.dueAt)
        return; this.task.emit({ ...this.followup, dueAt: new Date(this.followup.dueAt).toISOString() }); }
}
