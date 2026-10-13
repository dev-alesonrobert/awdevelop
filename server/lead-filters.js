import { z } from 'zod';

const presence = z.enum(['', 'yes', 'no']).default('');
const amount = z.union([z.literal(''), z.coerce.number().finite().min(0).max(100000000)]).default('');
const date = z.union([z.literal(''), z.iso.date()]).default('');
export const leadFiltersSchema = z.object({
  search: z.string().trim().max(100).default(''),
  assignee: z.union([z.literal(''), z.email()]).default(''),
  stage: z.enum(['', 'new', 'contact', 'meeting', 'proposal', 'negotiation', 'won', 'lost']).default(''),
  service: z.string().trim().max(150).default(''),
  origin: z.string().trim().max(120).default(''),
  city: z.string().trim().max(120).default(''), state: z.string().trim().max(2).default(''), neighborhood: z.string().trim().max(120).default(''), segment: z.string().trim().max(120).default(''), priority: z.enum(['', 'low', 'medium', 'high']).default(''),
  website: presence, phone: presence, email: presence,
  minValue: amount, maxValue: amount, from: date, to: date,
  followup: z.enum(['', 'overdue', 'today', 'pending', 'none']).default(''),
  before: z.string().regex(/^\d+$/).max(18).optional()
}).refine(q => q.minValue === '' || q.maxValue === '' || q.minValue <= q.maxValue, {message: 'Valor mínimo deve ser menor ou igual ao máximo.'})
  .refine(q => !q.from || !q.to || q.from <= q.to, {message: 'Período de cadastro inválido.'});

export function buildLeadFilters(q) {
  const clauses = [], values = [];
  const bind = value => { values.push(value); return `$${values.length}`; };
  // Literal substring matching: user input never becomes a SQL wildcard or SQL code.
  if (q.search) {
    const term = bind(q.search);
    clauses.push(`(strpos(lower(name),lower(${term}))>0 OR strpos(lower(company),lower(${term}))>0 OR strpos(lower(email),lower(${term}))>0 OR strpos(phone,${term})>0)`);
  }
  for (const [key, column] of [['assignee','assignee'], ['stage','crm_stage'], ['priority','priority']]) {
    if (q[key]) clauses.push(`${column}=${bind(q[key])}`);
  }
  for (const key of ['service', 'origin', 'city', 'state', 'neighborhood', 'segment']) if (q[key]) clauses.push(`strpos(lower(${key}),lower(${bind(q[key])}))>0`);
  for (const [key, column] of [['website','contact_website'], ['phone','phone'], ['email','email']]) {
    if (q[key]) clauses.push(`trim(COALESCE(${column},''))${q[key] === 'yes' ? '<>' : '='}''`);
  }
  if (q.minValue !== '') clauses.push(`estimated_value>=${bind(q.minValue)}`);
  if (q.maxValue !== '') clauses.push(`estimated_value<=${bind(q.maxValue)}`);
  if (q.from) clauses.push(`created_at>=(${bind(q.from)}::date::timestamp AT TIME ZONE 'America/Sao_Paulo')`);
  if (q.to) clauses.push(`created_at<((${bind(q.to)}::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')`);
  if (q.followup) {
    let condition = '';
    if (q.followup === 'overdue') condition = ' AND t.due_at<now()';
    if (q.followup === 'today') condition = " AND (t.due_at AT TIME ZONE 'America/Sao_Paulo')::date=(now() AT TIME ZONE 'America/Sao_Paulo')::date";
    clauses.push(`${q.followup === 'none' ? 'NOT ' : ''}EXISTS(SELECT 1 FROM aw_crm_tasks t WHERE t.quote_id=aw_quotes.id AND t.done=false${condition})`);
  }
  return {where: clauses.length ? clauses.join(' AND ') : 'TRUE', values};
}
