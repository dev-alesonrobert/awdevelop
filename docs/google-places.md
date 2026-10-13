# Google Places no buscador AW Develop

## Ativação

1. Crie um projeto no Google Cloud, vincule faturamento e ative **Places API (New)**.
2. Crie uma chave destinada ao backend e restrinja suas APIs a Places API (New). Restrições por domínio são para clientes no navegador e não protegem esta chamada de servidor; restrições por IP exigem uma saída de rede estável e previamente configurada.
3. No projeto Vercel `awdevelop-globe`, cadastre `GOOGLE_PLACES_API_KEY` como segredo em Production. Não use prefixo público nem coloque a chave no repositório ou no chat. Preview só deve receber chave de teste dedicada quando necessário.
4. Publique novamente para aplicar a variável. `BETTER_AUTH_SECRET` existente também é necessário para as referências assinadas dos resultados.
5. Configure cotas no Google Cloud e alertas de orçamento. Alertas não interrompem gastos por si só. A aplicação mantém a cota global existente de 60 chamadas externas/dia, incluindo detalhes, e intervalo de 2 segundos por operação. Outros projetos ou clientes com a mesma chave não estão cobertos por essa cota.
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
