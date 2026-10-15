import { Stage } from './models';
export const stages: {
    id: Stage;
    label: string;
}[] = [
    { id: 'new', label: 'Novo' }, { id: 'contact', label: 'Em contato' }, { id: 'meeting', label: 'Reunião' },
    { id: 'proposal', label: 'Proposta' }, { id: 'negotiation', label: 'Negociação' }, { id: 'won', label: 'Ganho' }, { id: 'lost', label: 'Perdido' }
];
export interface TeamMember {
    email: string;
    name: string;
}
export interface LeadCard {
    city: string;
    state: string;
    neighborhood: string;
    segment: string;
    priority: 'low' | 'medium' | 'high';
    instagram: string;
    email: string;
    phone: string;
    contact_website: string;
    created_at: string;
    id: string;
    name: string;
    company: string;
    service: string;
    crm_stage: Stage;
    assignee: string | null;
    estimated_value: number | string;
    expected_close: string | null;
    revision: number;
    origin: string;
}
export interface Lead extends LeadCard {
    email: string;
    phone: string;
    contact_website: string;
    idea: string;
    created_at: string;
}
export interface LeadForm {
    city: string;
    state: string;
    neighborhood: string;
    segment: string;
    priority: 'low' | 'medium' | 'high';
    instagram: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    website: string;
    service: string;
    idea: string;
    origin: string;
    crmStage: Stage;
    assignee: string;
    value: number;
    expectedClose: string;
}
export interface Activity {
    id: string;
    actor: string;
    kind: string;
    body: string;
    created_at: string;
}
export interface Task {
    id: string;
    title: string;
    assignee: string;
    due_at: string;
    done: boolean;
    revision: number;
}
export interface LeadDetail {
    lead: Lead;
    events: Activity[];
    tasks: Task[];
}
export interface Board {
    items: LeadCard[];
    stats: {
        crm_stage: Stage;
        count: number;
        value: number | string;
    }[];
    next: string | null;
}
export type QuoteStatus = 'new' | 'talking' | 'proposal' | 'won' | 'lost';
export interface Quote {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    service: string;
    idea: string;
    stage: string;
    timeline: string;
    status: QuoteStatus;
    notes: string;
    revision: number;
    created_at: string;
}
export const quoteStatuses: {
    id: QuoteStatus;
    label: string;
}[] = [{ id: 'new', label: 'Novo' }, { id: 'talking', label: 'Em conversa' }, { id: 'proposal', label: 'Proposta' }, { id: 'won', label: 'Ganho' }, { id: 'lost', label: 'Perdido' }];
export function whatsapp(phone: string) { const digits = phone.replace(/\D/g, ''); return /^\d{10,15}$/.test(digits) ? 'https://wa.me/' + (digits.length <= 11 ? '55' : '') + digits : ''; }

export interface DuplicateLead {
 id: string; name: string; company: string; assignee: string | null; crm_stage: string;
 reasons: string[]; last_contact_at: string | null;
}
export interface ContactQueueItem {
 kind: 'task' | 'first'; id: string; lead_id: string; name: string; company: string;
 title: string; due_at: string | null; assignee: string | null; revision: number;
 bucket: 'overdue' | 'today' | 'first';
}
export interface ContactQueue { items: ContactQueueItem[]; total: number; timezone: string; }
