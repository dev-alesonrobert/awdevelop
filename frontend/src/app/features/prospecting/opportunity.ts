import type { Prospect } from './prospecting.models';

export interface Opportunity {
  score: number | null;
  level: 'high' | 'medium' | 'low' | 'pending';
  label: string;
  reasons: string[];
}

/** A transparent triage heuristic, not a prediction of buying intent. */
export function opportunity(prospect: Prospect): Opportunity {
  if (prospect.source === 'Google Maps' && !prospect.detailsLoaded) {
    return { score: null, level: 'pending', label: 'Aguardando detalhes', reasons: ['Consulte os detalhes para avaliar site e contato.'] };
  }
  const reasons: string[] = [];
  let score = 0;
  if (!prospect.website) { score += 45; reasons.push('Site não informado na fonte'); }
  else { reasons.push('Site informado: avaliar possíveis melhorias'); }
  if (prospect.phone || prospect.email) { score += 35; reasons.push('Telefone ou e-mail disponível'); }
  else { reasons.push('Contato ainda precisa ser localizado'); }
  if (prospect.instagram) { score += 10; reasons.push('Instagram informado'); }
  if (prospect.address) { score += 10; reasons.push('Endereço disponível'); }
  const level = score >= 80 ? 'high' : score >= 45 ? 'medium' : 'low';
  return { score, level, label: level === 'high' ? 'Alta prioridade' : level === 'medium' ? 'Média prioridade' : 'Baixa prioridade', reasons };
}
