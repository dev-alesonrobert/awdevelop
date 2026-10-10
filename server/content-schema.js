import { z } from 'zod';
import catalog from '../dist/section-catalog.json' with { type:'json' };

const text = z.string().trim().max(4000);
const short = z.string().trim().min(1).max(200);
const media = z.string().max(2048).refine(value => /^assets\/[a-zA-Z0-9_.-]+$/.test(value) || (() => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
})(), 'Use uma imagem dos assets ou uma URL HTTPS.');
const link = z.string().max(2048).refine(value => !value || (() => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
})(), 'Use uma URL HTTPS.');
const sectionId = z.enum(catalog.map(s=>s.id));
const builtinSection = z.object({id:sectionId,type:z.literal('builtin')}).strict();
const customSection = z.object({
  id:z.string().regex(/^custom-[a-z0-9-]{1,64}$/),type:z.literal('custom'),
  title:short,description:text,image:media.or(z.literal('')),alt:text.max(200),
  button: z.string().trim().max(200),url:link,
}).strict().refine(s=>!s.image||s.alt.trim().length>0,'Descreva a imagem para acessibilidade.')
  .refine(s=>Boolean(s.button)===Boolean(s.url),'Preencha o texto e o link do botão, ou deixe ambos vazios.');
export const sectionsSchema = z.array(z.union([builtinSection,customSection])).min(1).max(20)
  .refine(s=>new Set(s.map(x=>x.id)).size===s.length,'Cada seção deve ter um ID único.');
export const contentSchema = z.object({
  sections: sectionsSchema.optional(),
  hero: z.object({ title: short, accent: short, description: text, button: short }),
  portfolio: z.object({ title: short, description: text, note: text, projects: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]{1,64}$/), title: short, category: short,
    summary: text, description: text, image: media, alt: short,
    tags: z.array(short).max(8), concept: z.boolean(), url: link,
  })).min(1).max(20).refine(p => new Set(p.map(x => x.id)).size === p.length, 'IDs de projetos devem ser únicos.') }),
  contact: z.object({ title: short, description: text, email: z.email(), whatsapp: z.string().regex(/^(|[1-9][0-9]{9,14})$/), instagram: link, linkedin: link }),
  settings: z.object({ brand: short, logo: media, title: short, description: text,
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/), background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    globe: z.boolean(), rotationSeconds: z.number().int().min(4).max(30) }),
  blocks: z.record(z.string().regex(/^[a-z0-9-]{1,80}$/), text),
}).strict();

export const saveSchema = z.object({ revision: z.number().int().nonnegative(), content: contentSchema }).strict();
