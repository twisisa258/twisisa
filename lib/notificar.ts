import 'server-only'

import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { avisoEmail } from '@/lib/email'
import { pushToUser } from '@/lib/push'

// [twisisa-notif] Notificações importantes da plataforma: aparecem no sino da app, seguem por e-mail (fila notification_outbox)
// e por push, se o aluno tiver ativado. Os lembretes de estudo continuam em lib/lembretes.ts (regras próprias: um por dia, na hora escolhida).

export const TIPOS_IMPORTANTES = ['boas-vindas', 'aviso', 'conta', 'sistema'] as const

export type NotificacaoInput = {
  userId: string
  kind: string
  title: string
  body: string
  href?: string | null
  actionLabel?: string | null
  // Chave única por aluno: a mesma notificação não entra nem sai duas vezes.
  dedupeKey: string
  // true: só cria se o aluno ainda não tiver nenhuma notificação deste tipo (ex.: boas-vindas).
  unica?: boolean
}

export type ResultadoNotificacao = { criada: boolean; emailEnfileirado: boolean }

export async function notificarAluno(input: NotificacaoInput): Promise<ResultadoNotificacao> {
  const id = randomUUID()
  const href = input.href && input.href.startsWith('/') && !input.href.startsWith('//') ? input.href : '/aluno/notificacoes'
  const inserida = await pool.query(
    input.unica
      ? `INSERT INTO notifications (id, user_id, title, body, kind, action_label, action_href, dedupe_key)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8
         WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = $2 AND kind = $5)
         ON CONFLICT DO NOTHING`
      : `INSERT INTO notifications (id, user_id, title, body, kind, action_label, action_href, dedupe_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
    [id, input.userId, input.title, input.body, input.kind, input.actionLabel ?? null, href, input.dedupeKey],
  )
  if (!inserida.rowCount) return { criada: false, emailEnfileirado: false }

  if (!(TIPOS_IMPORTANTES as readonly string[]).includes(input.kind)) return { criada: true, emailEnfileirado: false }

  // E-mail: só se a conta ainda tiver o e-mail ligado (interruptor no perfil). Sem preferências guardadas, envia.
  const alvo = (
    await pool.query(
      `SELECT u.name, u.email, p.email_enabled FROM "user" u LEFT JOIN notification_prefs p ON p.user_id = u.id WHERE u.id = $1`,
      [input.userId],
    )
  ).rows[0] as { name: string; email: string; email_enabled: boolean | null } | undefined

  let emailEnfileirado = false
  if (alvo?.email && alvo.email_enabled !== false) {
    const mail = avisoEmail({ name: alvo.name, title: input.title, text: input.body, cta: input.actionLabel ?? 'Abrir na Twisisa', href })
    await pool.query(
      `INSERT INTO notification_outbox (id, user_id, subject, body, href, dedupe_key) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [randomUUID(), input.userId, mail.subject, JSON.stringify({ html: mail.html, text: mail.text }), href, `aviso:${input.dedupeKey}`],
    )
    emailEnfileirado = true
  }

  // Push: não bloqueia a ação que criou a notificação. Sem aparelhos registados, não faz nada.
  void pushToUser(input.userId, { title: input.title, body: input.body, url: href }).catch((error: unknown) => {
    console.error('[NOTIFICAR] push', error)
  })

  return { criada: true, emailEnfileirado }
}
