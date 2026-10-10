import catalog from '../../../../../dist/section-catalog.json';
export const sectionCatalog = catalog;
export type LandingSection = {
    id: string;
    type: 'builtin';
} | {
    id: string;
    type: 'custom';
    title: string;
    description: string;
    image: string;
    alt: string;
    button: string;
    url: string;
};
export interface ContentDocument {
    sections?: LandingSection[];
    [key: string]: unknown;
}
export interface DraftResponse {
    draft: ContentDocument;
    revision: number;
    published_revision: number;
}
export interface SavedResponse {
    revision: number;
    published_revision: number;
}
export const initialSections = (): LandingSection[] => sectionCatalog.map(s => ({
    id: s.id, type: 'builtin'
}));
export const sectionLabel = (s: LandingSection) => s.type === 'custom' ? s.title : sectionCatalog.find(x => x.id === s.id)?.label || s.id;
export interface SectionEdit {
    key: 'title' | 'description' | 'image' | 'alt' | 'button' | 'url';
    value: string;
}
