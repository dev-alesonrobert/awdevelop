export type Role = 'owner' | 'admin' | 'editor';
export interface Profile {
    email: string;
    name: string;
    role: Role;
}
export interface Session {
    user: {
        id: string;
        email: string;
        name: string;
    };
}
export interface NotificationSummary {
    count: number;
    latest: string;
    items: {
        id: string;
        name: string;
        service: string;
        created_at: string;
    }[];
    taskCount: number;
    tasks: {
        id: string;
        quote_id: string;
        title: string;
        name: string;
        due_at: string;
    }[];
}
export type Stage = 'new' | 'contact' | 'meeting' | 'proposal' | 'negotiation' | 'won' | 'lost';
export interface Pipeline {
    items: {
        id: string;
        name: string;
        company: string;
        service: string;
        crm_stage: Stage;
        estimated_value: string;
    }[];
    stats: {
        crm_stage: Stage;
        count: number;
        value: string;
    }[];
    next: string | null;
}
