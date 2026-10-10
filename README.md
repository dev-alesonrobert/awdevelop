# Painel awdevelop

Landing page com painel em /admin/, Express, Better Auth, Neon Postgres e Vercel Blob. A identidade dark e roxa, o globo e o portfólio rotativo permanecem no site.

## Migração Angular — primeira etapa

Frontend Angular 22.2.2 e TypeScript 6.0.3 em frontend/. A rota /painel/ oferece login, sessão, saída, navegação por permissão e visão geral real do CRM. A tela Angular /painel/sections gerencia a estrutura da landing page. O editor e as operações completas do CRM permanecem em /admin/; a landing page permanece na raiz. Os links entre as duas interfaces compartilham o cookie de sessão e abrem a seção desejada. A migração completa ainda não terminou.

Comandos: npm run build:angular compila para dist/painel; npm run dev:angular inicia API local em 3001 e Angular em http://localhost:4200/painel/, com proxy e BETTER_AUTH_URL definido apenas para esse processo local. npm run dev continua atendendo a versão existente em 3000. Produção usa sempre URLs relativas e não inclui segredos no frontend.

Organização: core (API, modelos, autenticação e guarda), shared (marca e componentes comuns), features/auth (formulário tipado de login) e features/dashboard (layout e visão geral). Próximas etapas: migração das telas de conteúdo, imagens/histórico/acessos, CRM completo e landing page.

## Recursos

- CRM comercial integrado aos mesmos registros de orçamento: Kanban com sete etapas, cadastro manual com e-mail ou telefone, empresa, site, origem, responsável, valor previsto e fechamento esperado. Alterar a etapa na ficha move a oportunidade no Kanban. Busca, filtro por responsável, indicadores agregados e paginação.
- Histórico comercial com observações, conversas, reuniões e propostas registradas; fichas e tarefas usam revisão para impedir sobrescrita concorrente.
- Tarefas com prazo no horário de Brasília, responsável, conclusão e reabertura. O sino inclui tarefas com prazo atingido ou vencido atribuídas à conta atual, enquanto estiverem pendentes. Não envia mensagens automaticamente.

- Editor de início, portfólio, contato e configurações. Salvar rascunho não altera o site público; a prévia exige autenticação. Publicar grava uma versão no histórico.
- Histórico paginado de publicações, com data, autor, revisão e consulta do conteúdo. Restaurar altera apenas o rascunho; o administrador precisa revisar e publicar.
- Biblioteca de imagens compartilhada, com upload PNG/JPG/WebP de até 4 MB e seleção das imagens já cadastradas para logo e projetos. Imagens são públicas; controles do painel exigem sessão.
- Sino de notificações no cabeçalho para proprietário e administradores, com contador por conta e prévia dos cinco últimos pedidos não lidos. Atualiza a cada 20 segundos enquanto o painel está aberto e visível. Abrir o sino não marca leitura; Ver orçamentos ou Marcar como lidas registra somente os pedidos existentes até a revisão exibida. A leitura persiste no banco, é independente entre pessoas e não muda o status comercial. Não há push com o navegador fechado nem envio de e-mail.
- Caixa de orçamentos integrada ao formulário da landing page. Busca, filtros, status Novo/Em conversa/Proposta/Ganho/Perdido, contato por e-mail ou WhatsApp e anotações internas. Os pedidos são persistidos no banco; não há envio automático de e-mail. UUID e hash evitam duplicação em tentativas repetidas; limite por e-mail e hora e campo antispam reduzem abuso.
- Proprietário gerencia membros, funções, convites e bloqueios. Administradores editam, publicam e acompanham orçamentos; editores alteram rascunhos e imagens. Convites vinculados ao e-mail expiram em 7 dias e só podem ser usados uma vez. O painel gera um link privado para copiar; não o envia por e-mail. Bloquear um membro encerra suas sessões e invalida seus convites pendentes.
- Aviso de outras abas ou pessoas editando, atualizado a cada 25 segundos. Revisões protegem contra sobrescrita concorrente.
- Salvamento automático de rascunho após 3 segundos sem alterações. Não publica. Conflitos pausam o salvamento automático e preservam os campos locais para revisão.
- Botão Sair visível também no celular, com encerramento da sessão no servidor.

## Recuperação de senha: pendente

O Resend foi escolhido, mas ainda não está provisionado. O instalador já passou pela aceitação dos termos da Vercel e do Resend. A configuração aguarda um domínio próprio do proprietário para validar o remetente. Não há recuperação por e-mail disponível nesta versão. Não compartilhe senhas ou chaves no chat. O fluxo será implementado após a integração, configuração de remetente autorizado e validação da entrega.

## Configuração e desenvolvimento

Execute npm ci e npm run dev. O endereço local é http://localhost:3000. O projeto de produção awdevelop-globe, na equipe awd-evelop, usa Neon awdevelop-content e Blob awdevelop-media. Não inclua .env, tokens, senhas ou chaves no Git ou em arquivos compartilhados.

Variáveis: DATABASE_URL (Neon), BETTER_AUTH_SECRET, BETTER_AUTH_URL (origem exata da aplicação), ADMIN_EMAIL (proprietário inicial), PARTNER_ADMIN_EMAIL (administrador inicial), ADMIN_SETUP_TOKEN e PARTNER_ADMIN_SETUP_TOKEN (convites iniciais privados), BLOB_STORE_ID (integração Blob). A aplicação na Vercel usa credenciais OIDC para o Blob. Nenhum segredo integra este pacote.

A migração é idempotente. Insere o conteúdo e os membros iniciais somente quando não existem; não substitui conteúdo nem reativa acessos bloqueados. Os hashes dos convites usados permanecem consumidos após novas implantações. O cadastro público é desativado. Primeiro acesso: /admin/setup.html#TOKEN; a pessoa convidada define e confirma a própria senha com 12 a 128 caracteres. O token é removido da barra ao carregar a página e não permite redefinir conta existente.

## Publicação e verificação

Publique o projeto completo; enviar apenas dist não inclui a API. vercel.json direciona /api/* para a função Node.js e serve os arquivos de dist. A construção executa npm run build:angular && npm run migrate && npm test && node scripts/verify-management-db.js.

Os 70 testes cobrem conteúdo, autorização, convites, restauração, orçamentos, concorrência, autosave e permissões da interface. As verificações adicionais no Postgres criam apenas linhas descartáveis dentro de uma transação, conferem consumo de convite, idempotência e revisão de orçamento, biblioteca, histórico, leitura das notificações, campos do CRM, atividades e tarefas com revisão, e executam ROLLBACK ao final. Não alteram conteúdo público, senhas ou contas reais e não enviam e-mails. scripts/verify-db.js é um verificador legado da instalação inicial, protegido por AW_RUN_INITIAL_DB_CHECKS=1, e não integra a construção atual.

A revisão visual autenticada e a entrega de e-mail ainda precisam de validação com a sessão do proprietário e o serviço de e-mail provisionado.

## Gerenciamento de seções

Em Seções da página, use ↑ e ↓ para ordenar, Excluir para retirar do rascunho e Adicionar seção para incluir um bloco de texto, imagem e botão HTTPS ou reincluir uma seção original. Até 20 seções, com pelo menos uma na página. As seções originais preservam seus textos e imagens quando retiradas; blocos personalizados excluídos podem ser recuperados com Desfazer antes de salvar ou restaurando uma publicação anterior.

Salvar rascunho é manual nesta tela. Ver rascunho exige que as alterações estejam salvas. Publicar exige a confirmação do administrador ou proprietário e a revisão salva; editores não publicam. Conflitos entre telas ou pessoas preservam as alterações locais e exigem recarregamento, sem sobrescrever a revisão mais recente. A tela avisa ao sair com mudanças não salvas. O editor anterior mantém o campo sections ao editar textos, imagens ou cores.

O backend valida IDs, duplicação, quantidade, HTTPS, texto do botão e descrição de imagem. sections é opcional para compatibilidade com documentos e publicações anteriores; sua ausência representa a ordem original. Nenhuma migração de banco é necessária: os documentos JSONB e o histórico já armazenam a estrutura completa. A página pública exibe somente a ordem publicada, oculta links para seções retiradas e respeita a opção de ocultar o globo.
