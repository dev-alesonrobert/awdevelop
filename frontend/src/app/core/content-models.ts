import { LandingSection } from '../features/sections/models';
export interface Project {
    [key: string]: string | string[] | boolean;
    id: string;
    title: string;
    category: string;
    summary: string;
    description: string;
    image: string;
    alt: string;
    tags: string[];
    concept: boolean;
    url: string;
}
export interface LandingContent {
    [key: string]: unknown;
    sections?: LandingSection[];
    hero: {
        [key: string]: string;
        title: string;
        accent: string;
        description: string;
        button: string;
    };
    portfolio: {
        [key: string]: string | Project[];
        title: string;
        description: string;
        note: string;
        projects: Project[];
    };
    contact: {
        [key: string]: string;
        title: string;
        description: string;
        email: string;
        whatsapp: string;
        instagram: string;
        linkedin: string;
    };
    settings: {
        [key: string]: string | number | boolean;
        brand: string;
        logo: string;
        title: string;
        description: string;
        accent: string;
        background: string;
        globe: boolean;
        rotationSeconds: number;
    };
    blocks: Record<string, string>;
}
export interface ContentDraft {
    draft: LandingContent;
    revision: number;
    published_revision: number;
}
