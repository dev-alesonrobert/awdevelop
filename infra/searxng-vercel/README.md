# SearXNG privado na Vercel

O projeto usa três serviços: `web` entrega o frontend Angular, `backend` executa a API Express em container e `search` executa o SearXNG. As rotas públicas `/api/:path*` chegam ao backend com o prefixo original. As demais rotas chegam ao frontend.

Somente o backend recebe o binding `SEARXNG_INTERNAL_URL`. O motor não possui rota pública e exige um HMAC derivado do segredo de autenticação existente. O segredo original não é enviado na requisição. Antes de carregar os mecanismos, o gateway remove credenciais do banco e da Vercel do ambiente.

O Dockerfile da API fica na raiz porque a Vercel usa a pasta do Dockerfile como contexto. Ele fixa npm 11.9.0, compatível com o lockfile, e inicia `api/container.mjs` na porta 80. O Dockerfile do motor fica em `infra/searxng-vercel` e usa imagem SearXNG fixada por digest.

A pesquisa preserva revisão manual, cache, deduplicação e cotas da API. Resultados são sugestões públicas, não uma confirmação de dados comerciais.

Containers e Services estão em beta e seguem as cotas e a cobrança da Vercel. Mecanismos externos podem bloquear consultas; partidas a frio podem aumentar a latência.

Referências: https://vercel.com/docs/functions/runtimes/container e https://vercel.com/docs/services

A alternativa para VPS permanece em `infra/searxng`. Um binding Vercel tem prioridade sobre `SEARXNG_URL` externo.
