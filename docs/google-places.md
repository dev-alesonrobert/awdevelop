# Google Places no buscador AW Develop

## Ativação

1. Crie um projeto no Google Cloud, vincule faturamento e ative **Places API (New)**.
2. Crie uma chave destinada ao backend e restrinja suas APIs a Places API (New). Restrições por domínio são para clientes no navegador e não protegem esta chamada de servidor; restrições por IP exigem uma saída de rede estável e previamente configurada.
3. No projeto Vercel `awdevelop-globe`, cadastre `GOOGLE_PLACES_API_KEY` como segredo em Production. Não use prefixo público nem coloque a chave no repositório ou no chat. Preview só deve receber chave de teste dedicada quando necessário.
4. Publique novamente para aplicar a variável. `BETTER_AUTH_SECRET` existente também é necessário para as referências assinadas dos resultados.
5. Configure cotas no Google Cloud e alertas de orçamento. Alertas não interrompem gastos por si só. O painel permite até 150 buscas Google/dia e 4.500/mês, e 30 consultas de detalhes/dia e 900/mês. As outras fontes compartilham 200 chamadas/dia. O intervalo entre operações continua em 2 segundos. A franquia do Google é por SKU e conta de faturamento; outros projetos ou clientes dessa conta não estão cobertos pelo contador do painel. Não é uma garantia de cobrança zero para toda a conta Google.
6. No painel, selecione **Google Maps**, região e segmento. A primeira página tem até 20 resultados; não há paginação automática.

## Comportamento e custos

Text Search usa apenas IDs, nome, endereço, link Google Maps e atribuições (SKU Pro). Telefone e site são consultados somente com **Ver detalhes**, usando Place Details Enterprise. E-mail não é fornecido pela API. Não solicitamos fotos, avaliações, resumos de IA ou campos por wildcard.

A chave é transmitida apenas no header entre o backend e `places.googleapis.com`. Resultados não usam o cache SQL; respostas HTTP são `private, no-store`. As referências de detalhes são assinadas, vinculadas ao usuário e expiram em 15 minutos. O motor SearXNG remove a variável da chave de seu ambiente antes de carregar mecanismos externos.

Os dados Google não são importados para o CRM. Use dados obtidos diretamente com a empresa em um cadastro independente. A interface identifica Google Maps e exibe atribuições retornadas. `/termos` e `/privacidade` são públicos.

## Validação necessária após ativação

Sem uma chave real, os testes usam respostas simuladas. Após cadastrar a variável, confira uma busca autenticada em produção e uma consulta de detalhes; valide faturamento e restrições no console Google Cloud. Sem chave, a opção permanece desabilitada e nenhuma consulta Google é realizada.

Referências oficiais:
- https://developers.google.com/maps/documentation/places/web-service/get-api-key
- https://developers.google.com/maps/documentation/places/web-service/text-search
- https://developers.google.com/maps/documentation/places/web-service/place-details
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.google.com/maps/billing-and-pricing/pricing


## Proteção da franquia Google

Os limites mensais deixam margem abaixo das franquias consultadas em 13/10/2026: 5.000 Text Search Pro e 1.000 Place Details Enterprise. O mês acompanha America/Los_Angeles; o dia do painel acompanha America/Sao_Paulo.

`aw_google_usage` contém somente período, operação e contador. A reserva mensal e diária ocorre numa transação antes de chamar o Google. Incrementos condicionais na mesma chave protegem chamadas concorrentes de várias instâncias. Se o orçamento não puder ser registrado, a chamada externa não é enviada. Falhas externas não devolvem saldo, pois não é possível confirmar se o Google faturou a tentativa.

Na primeira migração, todas as chamadas externas antigas do mês são contadas conservadoramente contra cada tipo Google, com mais 60 chamadas reservadas para a transição. As migrações seguintes não reiniciam esses valores. Os períodos futuros começam novos contadores. Isso pode reduzir o saldo disponível no primeiro mês.

Para descontar uso externo conhecido da mesma conta, configure limites menores com `GOOGLE_PLACES_SEARCH_MONTHLY_LIMIT` e `GOOGLE_PLACES_DETAILS_MONTHLY_LIMIT`. Os equivalentes `*_DAILY_LIMIT` controlam o dia. Zero bloqueia o tipo de operação. Valores maiores são limitados aos tetos de 4.500/900 por mês e 150/30 por dia. Valores inválidos bloqueiam a configuração. Não aumente esses tetos para contornar a franquia.

O contador do painel não consulta o faturamento Google Cloud. Antes de usar a mesma conta em outros aplicativos/projetos, desconte esse uso do orçamento do painel e confira a franquia atual.
