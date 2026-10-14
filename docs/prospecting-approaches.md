# Abordagens personalizadas

Cada card de Buscar leads oferece Criar abordagem. O editor permite informar remetente, serviço, benefício, objetivo e tom. Gera uma primeira mensagem de WhatsApp e um follow-up, permite editar e copiar ambos e abrir uma conversa com a primeira mensagem preenchida. Nenhuma mensagem é enviada automaticamente.

Quando o resultado já está vinculado ao CRM, Salvar rascunho no CRM grava uma nota no histórico, identificada como rascunho e sem registrar envio. Alterações não salvas usam a proteção de saída do painel.

## Modos

Modelo personalizado funciona sem um provedor externo. Usa o nome da empresa e a oferta informada, sem inventar informações sobre presença digital ou interesse. A interface identifica o resultado como sem IA.

Com IA usa AI SDK 7.0.140 pelo Vercel AI Gateway e permanece desabilitado até a configuração explícita do servidor. O modelo recebe nome da empresa, segmento, cidade, existência de site informado na fonte e os campos da oferta. Telefones, e-mails, descrições livres e URLs não são enviados. Em resultados Google, a IA usa somente os campos da oferta informados pelo usuário, sem nome, segmento, localização, site ou referência do resultado. Após a geração, o painel acrescenta automaticamente a saudação com o nome da empresa na mensagem e no follow-up, e a apresentação com o remetente na primeira mensagem. Essa composição ocorre no navegador, sem enviar o nome Google ao modelo. No modelo sem IA, o nome é usado de forma transitória. Dados Google não são persistidos nem enviados ao modelo.

A IA não foi ativada ou chamada em produção nesta implementação. Não há um modelo escolhido automaticamente nem criação de credenciais.

## Ativação

Na configuração privada do backend, definir:

- `PROSPECTING_AI_ENABLED=true`
- `AI_GATEWAY_API_KEY`: credencial privada do Gateway, configurada pelo responsável no provedor de hospedagem.
- `AI_GATEWAY_MODEL`: identificador exato `provider/model` do catálogo atual em `https://ai-gateway.vercel.sh/v1/models`, com suporte a texto e saída estruturada.
- `PROSPECTING_AI_DAILY_LIMIT`: opcional, padrão 20 gerações por dia para toda a equipe, teto de 200.

Não inserir a chave no frontend, no repositório ou no chat. O serviço roda em um container; esta integração usa chave explícita do Gateway.

A migração idempotente cria `aw_ai_usage`. A reserva diária usa a data de São Paulo e ocorre antes da chamada, com limite atômico no banco. Tentativas com erro continuam consumindo a reserva; não há repetição automática. Cooldown de 30 segundos por conta, timeout de 25 segundos e limite de 900 tokens de saída por tentativa. A API não revela erros internos ou credenciais do provedor.

## Validação

Build Angular e testes de backend e componentes renderizados. Testes de IA usam um gerador simulado, sem chamada externa ou gasto de créditos. Conferem autenticação, origem, entradas inválidas, resultados expirados, separação Google, limites, contexto mínimo, falhas, cópia, edição, escape de HTML e gravação do rascunho.

Validação visual em navegador e chamada real ao Gateway continuam pendentes até haver um navegador disponível e uma integração ativa.
