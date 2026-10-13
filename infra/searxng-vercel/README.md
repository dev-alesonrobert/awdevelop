# SearXNG na Vercel

Serviço container privado configurado pelo `vercel.json`, acessível apenas ao serviço `web` por binding. Não há rota pública do motor de busca, outro domínio, VPS ou chave Google.

A Vercel injeta `SEARXNG_INTERNAL_URL` no backend. As chamadas são autenticadas com um HMAC separado, derivado do segredo de autenticação já existente. O segredo original não é transmitido na requisição. O wrapper remove as credenciais do banco e da Vercel do ambiente antes de carregar os mecanismos de busca.

Containers e Services estão em beta em todos os planos e seguem a cobrança de Functions e Service Requests. Não são serviços gratuitos ilimitados. O motor pode sofrer bloqueios dos mecanismos e partidas a frio.

https://vercel.com/docs/functions/runtimes/container
https://vercel.com/docs/services

A configuração Docker para VPS permanece em `infra/searxng` como alternativa. Quando existe binding Vercel, ele tem prioridade sobre `SEARXNG_URL` externo.
