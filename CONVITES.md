# Convites da equipa (revisores)

**Admin → Equipa → Convidar revisor** (nome + e-mail). O painel mostra o link e o código para enviares por **WhatsApp** (mensagem já preenchida, link e código em mensagens separadas) ou copiares; o e-mail com o link é opcional. O link e o código só aparecem no momento da criação (guardam-se apenas as impressões digitais); para outros, usa «Nova carta». Nenhum nome fica no código: quem tem acesso vive na tabela `staff_roles`, e o admin (`ADMIN_EMAILS`) pode retirá-lo em «Remover acesso».

## Como a pessoa certa (e só ela) entra
1. **Link** com 256 bits aleatórios, de uso único (só se guarda a impressão digital). Fora dos motores de busca e sem *referrer*.
2. **Código de abertura** (`XXXX-XXXX`) enviado com o link, ou à parte se o admin desmarcar «Enviar o código no mesmo e-mail». 5 erros bloqueiam a carta; o admin desbloqueia reenviando uma carta nova.
3. **E-mail fixo**: a conta só pode ser criada com o e-mail do convite.
4. **Verificação de e-mail (Resend)**: o papel só é dado depois de a pessoa confirmar o e-mail.
5. **Passos só para a frente**, guardados no servidor (recarregar não recua). Ao concluir, a carta é destruída: o link passa a mostrar «Esta carta já não existe».

## Configuração
- `RESEND_API_KEY` e `EMAIL_FROM` (domínio verificado no Resend). Sem elas, em desenvolvimento o e-mail aparece no terminal.
- `BETTER_AUTH_SECRET` (já obrigatório) também assina os códigos.
- `pnpm migrate` aplica `0013_staff_invites.sql`.

## O que o revisor pode fazer
Só `/admin/questoes`: ver, editar, pré-visualizar, publicar e arquivar. Criar, importar, duplicar, eliminar, ações em lote e todas as outras áreas são do admin.

## Notas
- A verificação por e-mail passa a ser enviada a todos os novos registos e inicia sessão ao confirmar; não bloqueia quem já tem conta.
- Quem já tem conta verificada com o e-mail do convite não cria outra: entra nela e volta a abrir a carta, que se conclui sozinha.
