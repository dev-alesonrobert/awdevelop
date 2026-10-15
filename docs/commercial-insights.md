# Indicadores comerciais e uso das integrações
A visão geral mostra a distribuição atual de todos os leads por etapa, valor estimado por etapa, leads com interação comercial registrada, negócios ganhos e taxa de ganho entre ganhos e perdidos. Não há período de corte nem inferência de passagem entre etapas. Sem negócios encerrados, a taxa aparece como traço.

Os saldos são os contadores persistentes do painel, não uma consulta de faturamento. Google acompanha limites diários de Brasília e mensais do Pacífico; as datas de renovação são convertidas para Brasília na interface. O orçamento de IA compartilha a função aiDailyLimit com a reserva real de chamadas. O painel não chama provedores nem consome cotas ao atualizar estes indicadores.
Tentativas contabilizadas e a reserva conservadora de uso anterior fazem parte dos valores exibidos. Outros usos da mesma conta Google devem ser considerados separadamente.

O endpoint /api/admin/crm/insights é comercial, autenticado e somente leitura. A publicação valida a SQL real em uma transação com fixtures revertidas, sem migração de tabelas.
