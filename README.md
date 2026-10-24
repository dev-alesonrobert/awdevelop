<p align="center">
  <img src="dist/assets/logo-dark.png" alt="AWDevelop" width="280">
</p>

<h1 align="center">AWDevelop</h1>

<p align="center">
  Site institucional · Painel administrativo · CRM comercial
</p>

<p align="center">
  <a href="https://awdevelop-globe.vercel.app/">Site</a> ·
  <a href="https://awdevelop-globe.vercel.app/painel/">Painel Angular</a> ·
  <a href="https://awdevelop-globe.vercel.app/admin/">Painel completo</a>
</p>

---

A plataforma da **AWDevelop** reúne a apresentação da empresa, a edição do conteúdo da landing page e o acompanhamento comercial dos pedidos de orçamento. O site usa uma identidade visual escura e roxa, portfólio em banners rotativos e um globo animado.

O painel permite editar conteúdo sem alterar o código, organizar seções, publicar versões e acompanhar oportunidades no CRM.

> **Estado atual do código:** frontend migrado para Angular: site público, login, primeiro acesso, visão geral, conteúdo, portfólio, seções, imagens, histórico, administradores, orçamentos, notificações e CRM. A API e os dados existentes foram preservados. A recuperação de senha por e-mail ainda depende de domínio e configuração de remetente.

## Tecnologias

| Camada | Tecnologia | Uso |
| --- | --- | --- |
| Frontend | Angular 22.2.2, TypeScript 6.0.3 e RxJS | Interface, rotas, formulários e integração com a API |
| Referência anterior | HTML, CSS e JavaScript | Código histórico mantido para comparação e testes de regressão; não servido pelo novo build |
| Backend | Node.js e Express 5.3.0 | API e regras de negócio |
| Autenticação | Better Auth 1.7.7 | Login, cookies de sessão e encerramento de acesso |
| Validação | Zod 4.6.5 | Validação de dados recebidos |
| Banco de dados | Neon Postgres e pg | Conteúdo, usuários, versões, orçamentos e CRM |
| Imagens | Vercel Blob | Armazenamento das imagens enviadas pelo painel |
| Hospedagem | Vercel | Frontend e função Node.js da API |
| Testes | Node.js Test Runner e LinkeDOM | Regras de negócio e comportamento da interface |

As versões instaladas estão fixadas em `package-lock.json`.

## Funcionalidades

### Site institucional

- Identidade visual dark com a paleta roxa da AWDevelop.
- Portfólio em banners rotativos e globo animado.
- Conteúdo público baseado na versão publicada.
- Formulário de orçamento integrado ao banco de dados.
- Layout responsivo para desktop e celular.

### Conteúdo e publicação

- Edição de textos, projetos, contato e configurações.
- Rascunhos separados do conteúdo público.
- Prévia autenticada antes da publicação.
- Histórico de publicações com autor, data e revisão.
- Restauração de versões para o rascunho; publicar continua sendo uma ação separada.
- Biblioteca de imagens PNG, JPG e WebP, com limite de 4 MB por arquivo.
- Salvamento automático opcional após três segundos sem alterações; falhas e conflitos pausam o autosave.
- Proteção contra sobrescrita quando duas pessoas editam a mesma revisão.

### Seções da página

A tela Angular `/painel/sections` permite:

- Mover seções para cima ou para baixo.
- Retirar e reincluir seções originais, preservando seu conteúdo.
- Criar blocos personalizados com texto, imagem e botão HTTPS.
- Desfazer alterações antes de salvar.
- Salvar o rascunho, abrir a prévia e publicar conforme a permissão da conta.

A página aceita de uma a vinte seções. Nesta tela, o salvamento é manual. A interface avisa ao sair com alterações não salvas e preserva os dados locais quando detecta conflito.

### Orçamentos e CRM

- Caixa de orçamentos com busca, filtros, status e anotações internas.
- Contato por links de e-mail e WhatsApp.
- Kanban comercial com sete etapas.
- Cadastro manual de oportunidades com e-mail ou telefone.
- Empresa, origem, responsável, valor previsto e data esperada de fechamento.
- Histórico de atividades, conversas, reuniões e propostas.
- Tarefas com prazo, responsável, conclusão e reabertura.
- Indicadores agregados e paginação.
- Validação, prevenção de pedidos duplicados e proteção básica contra abuso no formulário público.

### Notificações e acessos

- Sino com contador de pedidos não lidos por pessoa.
- Atualização a cada vinte segundos enquanto o painel está aberto e visível.
- Avisos de tarefas pendentes atribuídas à conta atual quando chegam ao prazo.
- Gestão de membros, convites, funções e bloqueios pelo proprietário.
- Convites vinculados ao e-mail, com validade de sete dias e uso único.
- Botão de saída com encerramento da sessão no servidor.

Abrir o sino não marca pedidos como lidos. A leitura é individual e não altera a etapa comercial.

## Permissões

| Perfil | Acesso |
| --- | --- |
| Proprietário | Conteúdo, publicação, CRM e gestão de membros e convites |
| Administrador | Conteúdo, publicação, imagens, orçamentos e CRM |
| Editor | Rascunhos e imagens; sem publicação, CRM ou gestão de contas |

O cadastro público está desativado. Contas bloqueadas perdem acesso mesmo que ainda tenham um cookie de sessão.

## Estrutura do projeto

| Caminho | Responsabilidade |
| --- | --- |
| `frontend/src/app/core/` | API, autenticação, modelos e estado compartilhado |
| `frontend/src/app/features/auth/` | Login e primeiro acesso por convite |
| `frontend/src/app/features/landing/` | Site público, seções, carrossel, globo e formulário de orçamento |
| `frontend/src/app/features/content/` | Editor de conteúdo, rascunho, autosave, presença e publicação |
| `frontend/src/app/features/media/` | Biblioteca de imagens |
| `frontend/src/app/features/history/` | Histórico, prévia e restauração |
| `frontend/src/app/features/members/` | Convites e permissões |
| `frontend/src/app/features/quotes/` | Caixa de orçamentos e acompanhamento |
| `frontend/src/app/features/crm/` | Funil, ficha, contatos e tarefas |
| `frontend/src/app/features/dashboard/` | Navegação e visão geral |
| `frontend/src/app/features/sections/` | Gerenciamento de seções |
| `frontend/src/app/shared/` | Elementos compartilhados, incluindo a marca |
| `dist/` | Assets, catálogo, conteúdo de referência e implementação anterior preservada |
| `dist/angular/` | Site e painel compilados; saída gerada, não versionada |
| `server/` | Aplicação Express, autenticação, conteúdo, CRM e banco |
| `api/index.js` | Entrada da função da API na Vercel |
| `scripts/` | Desenvolvimento, migrações e verificações |
| `tests/` | Testes automatizados |
| `angular.json` | Configuração do frontend Angular |
| `vercel.json` | Build, rotas e cabeçalhos da hospedagem |

O build copia as imagens de `dist/assets/` e gera a aplicação em `dist/angular/`. Os arquivos anteriores de HTML/CSS/JS em `dist/` são referência para testes e manutenção da migração. A Vercel serve apenas `dist/angular/`, além da função da API.

## Organização dos componentes Angular

Cada componente tem uma pasta própria com arquivos `*.component.ts`, `*.component.html` e `*.component.scss`. Os componentes são standalone, usam `OnPush` e expõem dados e eventos por signal inputs e outputs.

| Área | Componentes |
| --- | --- |
| Aplicação | AppComponent |
| Autenticação | LoginComponent e SetupComponent |
| Layout | ShellComponent, SidebarComponent, TopbarComponent e NotificationBellComponent |
| Visão geral | OverviewComponent, MetricCardComponent e NotificationCardComponent |
| Estrutura da página | SectionsComponent, SectionToolbarComponent, SectionCardComponent e SectionAddComponent |
| Site público | LandingComponent, HeroComponent, FocusStripComponent, PortfolioComponent, ProcessComponent, ServicesComponent, GlobeComponent, InvitationComponent, AboutComponent, FaqComponent e QuoteFormComponent |
| Conteúdo e gestão | ContentComponent, MediaComponent, HistoryComponent e MembersComponent |
| Comercial | QuotesComponent, QuoteDetailComponent, CrmComponent, PipelineComponent, LeadCardComponent e LeadEditorComponent |
| Compartilhados | BrandComponent, PageHeadingComponent e MediaPickerComponent |

São 38 componentes standalone. Os componentes de apresentação recebem dados e emitem eventos. Serviços de funcionalidade (`ContentEditor`, `HistoryPage`, `MembersPage`, `QuotesPage` e `CrmPage`) coordenam consultas, revisão otimista e salvamento. `AdminPage` centraliza ciclo de requisição e proteção de alterações; `sessionInterceptor` encerra o acesso visual ao receber 401 nas rotas privadas. Componentes especializados de formulário, imagens e notificações encapsulam seus próprios ciclos de vida.

`frontend/src/styles.scss` importa somente tema, estilos básicos de elementos e utilitários compartilhados, organizados em `frontend/src/styles/`. Layouts, cards, navegação, responsividade e estilos de cada tela ficam no SCSS do componente, com encapsulamento padrão do Angular. O mixin `panels.card` compartilha a aparência dos cards sem expor seletores globais.

O Angular CLI está configurado para gerar componentes com HTML externo, SCSS externo e `OnPush`. Para criar um componente, use `npx ng generate component <caminho>` dentro da estrutura da funcionalidade. Não coloque estilos específicos de telas no arquivo global.

Todas as telas ativas usam componentes Angular com HTML e SCSS externos e encapsulados. Os mixins `panels` e `admin` compartilham padrões visuais sem estilos de página no arquivo global. As funcionalidades são carregadas por rotas lazy. O globo cancela animações e observers ao sair; carrossel, notificações e presença limpam seus timers.

## Executar localmente

### Requisitos

- Node.js compatível com `^22.22.3 || ^24.15.0 || ^26.0.0`.
- npm.
- Banco Postgres configurado.
- Variáveis de ambiente da aplicação.
- Armazenamento Blob configurado para usar o upload de imagens.

### Instalação

```bash
git clone https://github.com/dev-alesonrobert/awdevelop.git
cd awdevelop
npm ci
```

O repositório é privado: a conta usada para clonar precisa ter acesso.

Crie um arquivo `.env` na raiz e configure as variáveis abaixo com credenciais do seu ambiente de desenvolvimento. Não use credenciais de produção para testes locais.

| Variável | Finalidade |
| --- | --- |
| `DATABASE_URL` | Conexão com o Postgres |
| `BETTER_AUTH_SECRET` | Segredo de autenticação com pelo menos 32 caracteres |
| `BETTER_AUTH_URL` | Origem da aplicação; no modo local compilado, `http://localhost:3000` |
| `ADMIN_EMAIL` | E-mail do proprietário inicial |
| `PARTNER_ADMIN_EMAIL` | E-mail do administrador inicial |
| `ADMIN_SETUP_TOKEN` | Convite privado inicial do proprietário |
| `PARTNER_ADMIN_SETUP_TOKEN` | Convite privado inicial do administrador |
| `BLOB_STORE_ID` | Identificação do armazenamento Blob |

Na Vercel, o Blob utiliza autenticação OIDC. O upload local precisa de credenciais próprias do ambiente; somente definir o identificador do armazenamento não fornece autenticação.

### Banco e aplicação compilada

```bash
npm run migrate
npm run build:angular
npm run dev
```

- Site: `http://localhost:3000/`
- Painel: `http://localhost:3000/painel/`

A migração é idempotente: não substitui conteúdo existente, não reativa membros bloqueados e não reabre convites consumidos.

### Desenvolvimento Angular

```bash
npm run dev:angular
```

Abra `http://localhost:4200/painel/`. Este comando inicia a API na porta 3001 e o Angular na porta 4200, com proxy e origem de autenticação ajustada para esse processo.

Para gerar o site e o painel Angular e servi-los junto à API local:

```bash
npm run build:angular
npm run dev
```

O site compilado estará em `http://localhost:3000/` e o painel em `http://localhost:3000/painel/`.

## Primeiro acesso

O convite inicial usa o formato `/admin/setup.html#TOKEN`. O token é privado, vinculado ao e-mail e consumido após a criação da conta. A pessoa convidada define e confirma uma senha de 12 a 128 caracteres.

O token é removido da barra de endereço ao carregar a página. Um convite consumido não permite redefinir a senha de uma conta existente. Convites adicionais são gerados pelo proprietário no painel e compartilhados por um canal privado.

## Testes e comandos

| Comando | Ação |
| --- | --- |
| `npm run dev` | Inicia a aplicação local na porta 3000 |
| `npm run dev:angular` | Inicia Angular e API local com proxy |
| `npm run build:angular` | Compila site público e painel Angular |
| `npm run migrate` | Executa as migrações do banco |
| `npm test` | Executa os testes automatizados |
| `npm run create-owner` | Provisiona a conta inicial pelo terminal interativo, após configurar e migrar o banco |

A última execução verificada em **10/10/2026** terminou com **71 testes aprovados**. A suíte cobre conteúdo, sessão, permissões, convites de uso único, restauração, concorrência, notificações, CRM, gerenciamento de seções e a integração renderizada entre os componentes do editor.

`scripts/verify-management-db.js` executa verificações adicionais no Postgres com registros descartáveis dentro de uma transação e `ROLLBACK` ao final. O verificador legado `scripts/verify-db.js` exige `AW_RUN_INITIAL_DB_CHECKS=1` e não integra o build atual.

## Hospedagem

O frontend e a API estão hospedados na **Vercel**. O banco está no **Neon Postgres** e as imagens enviadas ficam no **Vercel Blob**.

| Endereço | Interface |
| --- | --- |
| `/` | Landing page pública |
| `/painel/` | Painel Angular |
| `/admin/` | Compatibilidade: redireciona para o painel Angular |
| `/painel/login` | Login |
| `/painel/setup` e `/admin/setup.html#CONVITE` | Primeiro acesso; convite removido da barra de endereço |
| `/painel/content`, `/painel/sections`, `/painel/media`, `/painel/history` | Edição, estrutura, imagens e versões |
| `/painel/crm`, `/painel/quotes`, `/painel/members` | Gestão comercial e acessos conforme a permissão |
| `/api/*` | API Node.js |

O build configurado executa:

```bash
npm run build:angular && npm run migrate && npm test && node scripts/verify-management-db.js
```

Publique o projeto completo. Enviar apenas a pasta `dist/` não inclui a API. Configure as variáveis privadas no ambiente da Vercel antes da implantação.

## Status e próximas etapas

| Área | Status |
| --- | --- |
| Landing page, portfólio e globo | Implementados |
| Edição, rascunhos, histórico e restauração | Implementados |
| Orçamentos, CRM e notificações no painel | Implementados |
| Login, sessão, visão geral e seções em Angular | Implementados |
| Migração de todas as telas ativas para Angular | Implementada no código |
| Recuperação de senha por e-mail | Pendente |
| Resend e validação do remetente | Pendente; requer domínio próprio |
| Notificações push com navegador fechado | Não implementadas |

O envio automático de e-mails ainda não está disponível. Convites são compartilhados por link privado; os pedidos de orçamento são persistidos no banco. Os testes cobrem contratos da API, login, edição renderizada, conflitos, restauração, convite, notificações e reenvio de orçamento. A validação visual completa em navegador autenticado continua pendente.

## Segurança e manutenção

- Não versione `.env`, senhas, tokens ou chaves.
- Mantenha credenciais somente no ambiente apropriado.
- Revisões protegem rascunhos, oportunidades e tarefas contra sobrescrita concorrente.
- Bloquear um membro encerra suas sessões e invalida seus convites pendentes.
- Publicação e restauração são ações distintas para permitir revisão do conteúdo.
- As imagens cadastradas são públicas; evite arquivos com informações privadas.
- O repositório é privado. O campo de licença do pacote está definido como ISC, mas não há arquivo `LICENSE`; revise a licença antes de distribuir o código.

---

**AWDevelop** · Plataforma institucional e comercial da empresa.

## Landing page Motion + painel administrativo

A rota pública `/` agora carrega a landing page Motion. O painel continua em Angular nas rotas `/painel/*`; autenticação, CRM, orçamentos, mídia e histórico mantêm suas APIs existentes.

- `frontend/motion/`: experiência pública React e Framer Motion, carregada apenas na rota pública.
- `frontend/src/app/features/motion-landing/`: integração com o Angular Router, conteúdo e metadados.
- `scripts/build-motion.mjs`: gera o módulo estático antes da compilação Angular (`npm run build:angular`).
- `server/content-normalizer.js`: atualiza apenas valores de referência antigos; conteúdo personalizado pelo administrador é preservado. Não altera registros do banco.
- Textos, projetos, imagens, cores, ordem de seções e prévias usam `/api/content` e `/api/admin/content`. O formulário envia solicitações para `/api/quotes`, com consentimento e chave de idempotência, e elas aparecem no painel.
- A prévia `/?preview=1` exige sessão administrativa e bloqueia o envio de solicitações. `/painel/login` permanece disponível no rodapé.

Validação: `npm run build:angular` e `npm test`. As configurações de banco, autenticação e serviços da Vercel são preservadas; nenhum segredo é incluído no frontend.
