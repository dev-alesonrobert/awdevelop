import type { Quote } from '../../../core/commercial-models';

export interface ProposalDraft {
  client: string;
  company: string;
  title: string;
  scope: string;
  deadline: string;
  amount: number | null;
  conditions: string;
  validUntil: string;
}

export function initialProposal(quote: Quote): ProposalDraft {
  return {
    client: quote.name, company: quote.company, title: quote.service,
    scope: quote.idea, deadline: '', amount: null, conditions: '', validUntil: '',
  };
}

export function localDate(now = new Date()): string {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

export function proposalError(draft: ProposalDraft, today = localDate()): string {
  const fields: [keyof ProposalDraft, string, number][] = [
    ['client', 'responsável pelo cliente', 160], ['title', 'título', 160],
    ['scope', 'escopo', 6000], ['deadline', 'prazo', 300], ['conditions', 'condições de pagamento', 3000],
  ];
  for (const [field, label, max] of fields) {
    const value = String(draft[field] ?? '').trim();
    if (!value) return `Preencha o campo ${label}.`;
    if (value.length > max) return `O campo ${label} aceita até ${max} caracteres.`;
  }
  if (draft.company.length > 160) return 'A empresa aceita até 160 caracteres.';
  if (typeof draft.amount !== 'number' || !Number.isFinite(draft.amount) || draft.amount <= 0 || draft.amount > 99999999.99 || Math.abs(draft.amount * 100 - Math.round(draft.amount * 100)) > 0.00001)
    return 'Informe um investimento válido, maior que zero e com até duas casas decimais.';
  const date = new Date(draft.validUntil + 'T12:00:00');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.validUntil) || Number.isNaN(date.getTime()) || localDate(date) !== draft.validUntil || draft.validUntil < today)
    return 'Informe uma validade igual ou posterior a hoje.';
  return '';
}
