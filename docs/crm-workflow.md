# Rotina de contatos
A visão geral oferece o atalho **Contatos de hoje**. No CRM, a mesma fila aparece ao lado de Funil e Lista.
A fila considera o dia em America/Sao_Paulo e separa tarefas atrasadas, tarefas do dia e leads na etapa Novo sem interação comercial nem tarefa pendente. Tarefas concluídas e negócios ganhos/perdidos não entram. O escopo pode ser a equipe ou o usuário autenticado. Até 100 pendências são exibidas por vez; o total informa quando há mais.

O histórico aceita anotação, ligação, reunião, proposta, WhatsApp, e-mail, abordagem enviada e resposta recebida. O autor vem da sessão; registrar um evento não envia mensagens nem altera a etapa automaticamente. Ações da fila reutilizam tarefas e suas revisões existentes.

Antes do salvamento manual e da importação pela interface, a revisão consulta coincidências por e-mail, telefone normalizado, domínio empresarial ou empresa com cidade. Sites sociais compartilhados não identificam uma empresa. O aviso mostra motivos, responsável e último contato. O usuário pode abrir a ficha existente ou confirmar que deseja salvar outra oportunidade.
A comparação é exata após normalização, não uma busca aproximada. Não há fusão ou exclusão automática, nem restrição de unicidade nova. Cadastros simultâneos podem gerar oportunidades distintas; a proteção existente por chave da fonte continua ativa.

Validação de SQL: scripts/verify-management-db.js usa dados descartáveis em uma transação revertida ao final; nenhuma comunicação externa é enviada.
