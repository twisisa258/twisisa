# E-mails do Twisisa: como chegar à caixa de entrada (e não ao spam)

O código já envia mensagens com nome de remetente («Twisisa»), versão em texto, assunto claro, ligação por extenso e rodapé de identificação. O que decide o spam do Gmail está **fora do código**, no domínio. Fazer por esta ordem:

## 1. Autenticar o domínio (obrigatório)
No Resend → *Domains* → o domínio do remetente → copiar os registos para o DNS do domínio:
- **SPF** (TXT) e **DKIM** (TXT/CNAME): o Resend mostra-os; esperar que o estado fique *Verified*.
- **DMARC** (TXT em `_dmarc`), no mínimo: `v=DMARC1; p=none; rua=mailto:ajuda@o-teu-dominio.com`. Depois de uma semana sem falhas, subir para `p=quarantine`.
Sem SPF + DKIM + DMARC alinhados com o domínio do `EMAIL_FROM`, o Gmail trata a mensagem como suspeita, seja qual for o desenho.

## 2. Remetente
- `EMAIL_FROM` com o domínio verificado, por exemplo `Twisisa <nao-responder@o-teu-dominio.com>` (se só pores o endereço, o código acrescenta o nome «Twisisa»).
- `EMAIL_REPLY_TO` com um e-mail real que seja lido. Responder a mensagens é um dos sinais que mais ajuda a reputação.
- Não usar `@gmail.com`, `@resend.dev` nem um domínio diferente do site.

## 3. Foto/logótipo ao lado do remetente (o «perfil»)
- **Rápido, sem custos**: criar uma conta Google (*Criar conta → Usar o meu endereço de e-mail atual*) com **o mesmo endereço do `EMAIL_FROM`**, confirmar o e-mail e pôr o logótipo como foto da conta. O Gmail passa a mostrá-lo.
- **Oficial (BIMI)**: logótipo em SVG no domínio + DMARC em `p=quarantine` ou `p=reject` + certificado VMC (pago). Dá o logótipo (e selo) no Gmail. Só vale a pena mais tarde.

## 4. Hábitos que mantêm a reputação
- Enviar só e-mails que a pessoa pediu (confirmação, recuperação, convite). Nada de promoções por este remetente.
- Testar com https://www.mail-tester.com (alvo: 9/10 ou mais) e no Gmail em *Mostrar original* (SPF, DKIM e DMARC têm de dizer *PASS*).
- Se uma mensagem cair em spam, marcá-la *Não é spam* nas contas de teste.
