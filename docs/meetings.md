# Reuniões da equipe / JaaS

A seção /painel/meetings é protegida pela sessão administrativa existente. Qualquer membro ativo pode entrar com um convite; owner/admin criam salas e recebem papel de moderador. Editores entram como participantes. Não há acesso público ou convites de clientes nesta versão. Os links do painel contêm somente o UUID da sala, nunca o JWT ou credenciais. Salas não são persistidas: guarde o link para reencontrá-las.

## Ativação

1. O titular cria a conta no JaaS e confirma o plano Developer e sua franquia no console. Não habilitar upgrade automático ou recursos pagos.
2. Em API keys, criar o par de chaves e manter a chave privada em local seguro. O JaaS registra a chave pública.
3. No backend Vercel do projeto awdevelop-globe, ambiente Production, configurar JAAS_APP_ID (vpaas-magic-cookie- seguido de 32 caracteres hexadecimais), JAAS_API_KEY_ID (identificador completo appId/keyId) e JAAS_PRIVATE_KEY (PEM RSA de pelo menos 2048 bits; aceita quebras reais ou \\n). São variáveis exclusivas do servidor, nunca Angular ou repositório.
4. Republicar com essas variáveis e usar Verificar configuração. A validação local do formato não confirma a aceitação da chave no JaaS; testar uma chamada após ativar.
5. Validar quatro participantes reais, câmera, microfone, chat, moderação e tela compartilhada em computador. O compartilhamento no celular depende do navegador/SDK e não é garantido nesta versão web.

## Segurança e uso

POSTs reutilizam autenticação e proteção de origem do /api/admin. Tokens RS256 expiram em uma hora, identificam somente a sala solicitada (regex false), contêm nome de exibição e ID derivado estável, sem e-mail. Não gravar JWT em logs, URL, armazenamento do navegador ou histórico do banco. Cada participante pede seu próprio token. Reentrar em sala gera um novo token. A duração do token é a janela de ingresso, não um limite de duração da chamada.

O script do provedor só carrega ao clicar Entrar. Câmera e microfone começam desativados e a prévia permite escolher dispositivos. Sair ou destruir o componente descarta a instância; sair pela navegação exige confirmação. Filtros da toolbar ocultam recursos pagos; o bloqueio efetivo de gravação, livestream, transcrição, telefonia e upload também é assinado no JWT. Não há novo banco, gravação própria ou cache de credenciais.

Quatro pessoas é o uso previsto, não um limite rígido de concorrência. Não há contador de MAU conectado ao faturamento nesta versão. A franquia deve ser acompanhada no console JaaS: navegador/dispositivo e identificadores do provedor podem afetar sua contabilização. Ocultar recursos pagos não impede cobrança por ultrapassar o plano. Não prometer gratuidade ilimitada.
