import { AppError } from '@/lib/action-result'

// Envio via Resend (API REST; sem dependências). Sem RESEND_API_KEY: em desenvolvimento escreve no terminal, em produção falha.
export function siteBaseUrl() {
  const explicit = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

const BRAND = 'Twisisa'

// O remetente aparece como «Twisisa <endereço>»: um nome, em vez de só o endereço, é o que o Gmail mostra na caixa de entrada.
function fromHeader(raw: string) {
  return raw.includes('<') ? raw : `${BRAND} <${raw}>`
}

export async function sendEmail(input: { to: string; subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`\n[EMAIL · modo de desenvolvimento] Para: ${input.to}\nAssunto: ${input.subject}\n${input.text}\n`)
      return
    }
    throw new AppError('O envio de e-mail não está configurado (RESEND_API_KEY e EMAIL_FROM).')
  }
  const replyTo = process.env.EMAIL_REPLY_TO?.trim()
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromHeader(from),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    signal: AbortSignal.timeout(12000),
  }).catch(() => null)
  if (!response || !response.ok) {
    console.error('[EMAIL] Resend recusou o envio', response?.status, await response?.text().catch(() => ''))
    throw new AppError('Não foi possível enviar o e-mail agora. Tenta de novo daqui a pouco.')
  }
}

type Layout = {
  title: string
  // Texto curto que a caixa de entrada mostra ao lado do assunto.
  preheader: string
  body: string
  button?: { label: string; href: string }
  // Porque é que a pessoa recebeu esta mensagem (rodapé).
  reason: string
}

const GREEN = '#1d4d41'
const INK = '#202321'
const MUTED = '#59615b'

// Modelo único para todos os e-mails: marca, título, texto, botão, ligação por extenso e rodapé de identificação.
// Tabelas e estilos em linha (clientes de e-mail não suportam mais); sem scripts, sem imagens além do logótipo.
function layout({ title, preheader, body, button, reason }: Layout) {
  const base = siteBaseUrl()
  const replyTo = process.env.EMAIL_REPLY_TO?.trim()
  const help = replyTo ? ` Dúvidas? Responde a esta mensagem ou escreve para <a href="mailto:${escapeHtml(replyTo)}" style="color:${GREEN}">${escapeHtml(replyTo)}</a>.` : ''
  const buttonHtml = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 0"><tr><td style="border-radius:999px;background:${GREEN}"><a href="${button.href}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:999px">${button.label}</a></td></tr></table>
<p style="margin:22px 0 4px;font-size:12px;line-height:1.5;color:#7a827c">Se o botão não abrir, copia esta ligação para o navegador:</p>
<p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all"><a href="${button.href}" style="color:${GREEN}">${button.href}</a></p>`
    : ''
  return `<!doctype html>
<html lang="pt-MZ" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f3f4ef;font-family:Helvetica,Arial,sans-serif;color:${INK};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">${preheader}&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4ef"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px">
<tr><td style="padding:0 6px 16px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:10px;vertical-align:middle"><a href="${base}"><img src="${base}/images/email-logo.png" width="36" height="29" alt="" style="display:block;border:0;width:36px;height:29px"></a></td>
<td style="vertical-align:middle"><a href="${base}" style="font-size:19px;font-weight:700;letter-spacing:-.03em;color:${INK};text-decoration:none">Twisisa</a></td>
</tr></table></td></tr>
<tr><td style="background:#ffffff;border:1px solid #e3e5dc;border-radius:20px;padding:32px 28px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:700;color:${INK}">${title}</h1>
${body}
${buttonHtml}
</td></tr>
<tr><td style="padding:18px 8px 0;font-size:12px;line-height:1.6;color:#7a827c">
<p style="margin:0 0 6px">${reason}${help}</p>
<p style="margin:0">${BRAND} · Plataforma de estudos para estudantes moçambicanos · <a href="${base}" style="color:#7a827c">${base.replace(/^https?:\/\//, '')}</a></p>
</td></tr>
</table></td></tr></table></body></html>`
}

const p = (html: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:${MUTED}">${html}</p>`
const note = (html: string) => `<p style="margin:18px 0 0;padding:12px 14px;background:#f6f7f2;border-radius:12px;font-size:13px;line-height:1.55;color:${MUTED}">${html}</p>`
const firstName = (name: string) => escapeHtml(name.trim().split(/\s+/)[0] || 'estudante')

export async function sendVerificationEmail(to: string, name: string, url: string) {
  const first = firstName(name)
  await sendEmail({
    to,
    subject: 'Confirma o teu e-mail no Twisisa',
    html: layout({
      title: 'Confirma o teu e-mail',
      preheader: 'Falta só um passo para concluíres o registo.',
      body: p(`Olá, ${first}.`) + p('Obrigado por criares a tua conta no Twisisa. Confirma que este e-mail é teu para concluíres o registo.') + p('A ligação é válida durante 24 horas.') + note('Não criaste uma conta no Twisisa? Ignora esta mensagem: nada será alterado.'),
      button: { label: 'Confirmar e-mail', href: url },
      reason: 'Recebeste este e-mail porque alguém criou uma conta no Twisisa com este endereço.',
    }),
    text: `Olá, ${name.trim() || 'estudante'}.\n\nObrigado por criares a tua conta no Twisisa. Confirma que este e-mail é teu (a ligação é válida durante 24 horas):\n${url}\n\nNão criaste uma conta no Twisisa? Ignora esta mensagem: nada será alterado.\n\n— Twisisa`,
  })
}

export async function sendPasswordResetEmail(to: string, name: string, url: string) {
  const first = firstName(name)
  await sendEmail({
    to,
    subject: 'Redefine a tua palavra-passe do Twisisa',
    html: layout({
      title: 'Redefine a tua palavra-passe',
      preheader: 'Pediste para recuperar o acesso à tua conta.',
      body: p(`Olá, ${first}.`) + p('Recebemos um pedido para redefinir a palavra-passe da conta do Twisisa associada a este e-mail.') + p('A ligação é válida durante 1 hora e só pode ser usada uma vez.') + note('Não fizeste este pedido? Ignora esta mensagem: a tua palavra-passe continua a mesma.'),
      button: { label: 'Escolher nova palavra-passe', href: url },
      reason: 'Recebeste este e-mail porque foi pedida a recuperação da conta do Twisisa com este endereço.',
    }),
    text: `Olá, ${name.trim() || 'estudante'}.\n\nRecebemos um pedido para redefinir a palavra-passe da tua conta do Twisisa. Escolhe uma nova aqui (a ligação é válida durante 1 hora e só pode ser usada uma vez):\n${url}\n\nNão fizeste este pedido? Ignora esta mensagem: a tua palavra-passe continua a mesma.\n\n— Twisisa`,
  })
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  const first = firstName(name)
  const recover = `${siteBaseUrl()}/esqueci-a-senha`
  await sendEmail({
    to,
    subject: 'A tua palavra-passe do Twisisa foi alterada',
    html: layout({
      title: 'Palavra-passe alterada',
      preheader: 'A palavra-passe da tua conta acabou de ser alterada.',
      body: p(`Olá, ${first}.`) + p('A palavra-passe da tua conta do Twisisa acabou de ser alterada. Por segurança, as sessões abertas noutros dispositivos foram terminadas.') + note('Não foste tu? Recupera já o acesso com o botão abaixo e escolhe uma palavra-passe nova.'),
      button: { label: 'Recuperar a conta', href: recover },
      reason: 'Enviámos este aviso de segurança porque a palavra-passe da tua conta do Twisisa foi alterada.',
    }),
    text: `Olá, ${name.trim() || 'estudante'}.\n\nA palavra-passe da tua conta do Twisisa acabou de ser alterada. Por segurança, as sessões abertas noutros dispositivos foram terminadas.\n\nNão foste tu? Recupera já o acesso e escolhe uma palavra-passe nova:\n${recover}\n\n— Twisisa`,
  })
}

export async function sendInviteEmail(input: { to: string; name: string; link: string; code: string | null; roleLabel: string }) {
  const first = firstName(input.name)
  const codeBlock = input.code
    ? `<p style="margin:16px 0 8px;padding:14px;text-align:center;background:#f3f8f4;border-radius:12px;font-size:22px;font-weight:700;letter-spacing:.22em;font-family:Menlo,Consolas,monospace;color:${GREEN}">${escapeHtml(input.code)}</p>` + p('Este é o código para abrir a carta. Só funciona com este link.')
    : p('O código de abertura vai ser-te entregue à parte, por outro canal.')
  await sendEmail({
    to: input.to,
    subject: 'Convite para a equipa do Twisisa',
    html: layout({
      title: `${first}, foste convidado para a equipa`,
      preheader: `Convite como ${input.roleLabel}. A carta só pode ser aberta uma vez.`,
      body: p(`Foste convidado para a equipa do Twisisa como <strong>${escapeHtml(input.roleLabel)}</strong>. A carta de convite só pode ser aberta uma vez e é pessoal.`) + codeBlock + note('Não encaminhes este e-mail: quem tiver o link e o código abre a carta no teu lugar.'),
      button: { label: 'Abrir a carta', href: input.link },
      reason: 'Recebeste este e-mail porque a equipa do Twisisa te convidou com este endereço.',
    }),
    text: `${input.name.trim()}, foste convidado para a equipa do Twisisa (${input.roleLabel}).\n\nAbre a carta: ${input.link}\n${input.code ? `Código: ${input.code}\n` : 'O código será entregue à parte.\n'}\nA carta só pode ser aberta uma vez. Não encaminhes este e-mail.\n\n— Twisisa`,
  })
}
