# Radar e funil na prospecção

A tela `/painel/prospecting` permite alternar entre a busca e o funil comercial existente. Ao abrir uma ficha do funil, o usuário acessa o CRM para editar a etapa, registrar contatos e agendar tarefas.

## Radar

A prioridade é uma regra de triagem transparente, calculada na interface:

- Site não informado na fonte: 45 pontos.
- Telefone ou e-mail informado: 35 pontos.
- Instagram informado: 10 pontos.
- Endereço informado: 10 pontos.

Alta prioridade: 80–100; média: 45–79; baixa: 0–44. A pontuação não comprova ausência de site, qualidade do negócio ou intenção de contratar. Resultados do Google sem detalhes permanecem pendentes, sem pontuação, e não entram nos filtros de ausência de site ou contato. Não há consultas pagas automáticas.

Filtros: contato, site, prioridade e registros já salvos. Ordenação: prioridade, nome ou fonte. Os indicadores do Radar contabilizam a busca inteira, antes dos demais filtros.

## CRM

O endpoint comercial `POST /api/admin/prospecting/crm-status` recebe até 100 chaves e retorna apenas identificador, chave de origem e etapa dos registros correspondentes. Exige o acesso administrativo e os controles de origem existentes. A interface divide listas maiores em lotes, mantém o identificador após importação e oferece acesso à ficha existente. A deduplicação transacional da importação foi preservada.

A correspondência automática usa a chave da fonte. Leads manuais ou de outra fonte podem ser identificados pela deduplicação existente durante a importação; sua etapa fica disponível na ficha do CRM.

O funil carrega até 100 leads recentes e os indicadores gerais do CRM. Há acesso ao CRM completo para filtros e paginação. Não foram criados novos estágios nem tabelas.

## Validação

- `npm run build:angular`: aprovado.
- `npm test`: 114 testes aprovados, sem falhas ou skips.
- Novos testes: prioridade, Google pendente, correspondência ao CRM, deduplicação de chaves, exclusão das chaves Google, permissões e limites de entrada.
- Banco real e validação visual em navegador: não executados neste ambiente. O navegador Playwright não estava instalado e seu download retornou arquivo inválido.

Esta etapa não inclui geração com IA, enriquecimento de Instagram, campanhas ou webhooks.
