# Pesquisa web da AW Develop

A busca OpenStreetMap está integrada ao painel. A pesquisa web usa o serviço privado SearXNG na Vercel, descrito em `../searxng-vercel`. Esta pasta contém a alternativa para VPS; sem binding Vercel ou endpoint externo, a pesquisa web fica desabilitada. Não usamos instâncias públicas de terceiros nem simulamos resultados.

## Instalação em um servidor com Docker

1. Copie esta pasta para um servidor com Docker Compose. Configure dois valores aleatórios diferentes em um `.env` local: `SEARXNG_SECRET` e `SEARXNG_TOKEN`, cada um com pelo menos 32 caracteres. Gere cada valor com `openssl rand -hex 32`. Não adicione esse arquivo ao Git.
2. Execute `docker compose up -d`. A imagem do SearXNG está fixada no digest consultado em 13/10/2026; revise a imagem antes de atualizar. O serviço interno não expõe portas públicas.
3. Configure seu proxy HTTPS para encaminhar um subdomínio à porta local `127.0.0.1:8088`. O gateway exige o header `Authorization: Bearer <token>` em todas as chamadas.
4. Na Vercel, no projeto `awdevelop-globe`, configure `SEARXNG_URL` com a origem HTTPS desse subdomínio e `SEARXNG_TOKEN` como segredo, usando o mesmo token do gateway. Configure produção e prévia separadamente, sem expor segredos no navegador.
5. Teste `/search?q=restaurantes%20Botafogo&format=json` com o header de autenticação em um cliente de API e confirme resposta JSON com `results`. Faça novo deploy da AW Develop. A opção Pesquisa web será habilitada automaticamente.

O gateway foi validado com respostas de teste. A instalação Docker e os mecanismos de busca reais precisam ser validados no servidor escolhido; este ambiente não possui Docker nem uma conta de hospedagem para criar esse serviço. O SearXNG pode receber bloqueios dos mecanismos de busca, mesmo em infraestrutura própria.

## Provedores OpenStreetMap

O piloto faz consultas manuais com cache: localidades por 30 dias, negócios por 24 horas. Há limite global de 60 consultas externas por dia, intervalo de 2 segundos por fonte e resultados limitados por consulta. Não há autocomplete ou varredura automática.

As instâncias públicas de Overpass têm capacidade limitada e não são recomendadas como base permanente de aplicações comerciais. Para operação contínua, use um endpoint próprio ou contratado em `OVERPASS_URL`. Pode-se suspender a fonte sem alterar código com `PROSPECTING_OSM_DISABLED=true`. A fonte de geocodificação também pode ser trocada em `NOMINATIM_URL`.

Respeite as políticas dos serviços:

- https://dev.overpass-api.de/overpass-doc/en/preface/commons.html
- https://operations.osmfoundation.org/policies/nominatim/
- https://www.openstreetmap.org/copyright
- https://docs.searxng.org/dev/search_api.html

Não confunda “site não informado” com “empresa sem site”. As páginas da pesquisa web são sugestões para revisão e podem ser diretórios ou artigos. Dados privados e páginas protegidas não são consultados pelo sistema.
