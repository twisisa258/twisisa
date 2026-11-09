import 'server-only'

import { randomBytes, randomUUID } from 'node:crypto'
import webpush from 'web-push'
import { pool } from '@/lib/db'
import { siteBaseUrl } from '@/lib/email'

// Web push: o aluno liga no telemóvel (modal de permissão e interruptor no perfil) e o servidor envia com as chaves VAPID.
// Variáveis: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e, opcional, VAPID_SUBJECT (mailto: ou https:).

/** `tag` agrupa notificações do mesmo tipo (a nova substitui a anterior do mesmo tipo, não as de outros tipos). */
export type PushPayload = { title: string; body: string; url: string; tag?: string }
export type PushReport = { total: number; ok: number; removed: number; statuses: number[] }

let configured = false
let configError: string | null = null

function vapidSubject() {
  const given = process.env.VAPID_SUBJECT?.trim()
  if (given) return given
  const replyTo = process.env.EMAIL_REPLY_TO?.trim()
  return replyTo ? `mailto:${replyTo}` : siteBaseUrl()
}

export function pushConfigured() {
  if (configured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!publicKey || !privateKey) {
    configError = 'Chaves VAPID em falta no servidor.'
    return false
  }
  try {
    webpush.setVapidDetails(vapidSubject(), publicKey, privateKey)
    configured = true
    configError = null
    return true
  } catch (error) {
    configError = error instanceof Error ? error.message : 'Chaves VAPID inválidas.'
    console.error('[PUSH] configuração inválida:', configError)
    return false
  }
}

export function pushConfigError() {
  return configError
}

/** Envia a todos os aparelhos do aluno e devolve o detalhe. Aparelhos mortos (404/410) são apagados. */
export async function pushToUserReport(userId: string, payload: PushPayload): Promise<PushReport> {
  const report: PushReport = { total: 0, ok: 0, removed: 0, statuses: [] }
  if (!pushConfigured()) return report
  const subs = (await pool.query(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, [userId])).rows as { id: string; endpoint: string; p256dh: string; auth: string }[]
  report.total = subs.length
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 })
      await pool.query(`UPDATE push_subscriptions SET last_ok_at = now(), failures = 0 WHERE id = $1`, [sub.id])
      report.ok++
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode
      if (typeof status === 'number') report.statuses.push(status)
      if (status === 404 || status === 410) {
        await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id])
        report.removed++
      } else if (status === 401 || status === 403) {
        // Chaves VAPID que o serviço de push não aceita: problema de configuração, não do aparelho. Não apagar.
        console.error('[PUSH] chaves recusadas pelo serviço de push', status, (error as { body?: string })?.body ?? '')
      } else {
        console.error('[PUSH] falha', status ?? error)
        await pool.query(`UPDATE push_subscriptions SET failures = failures + 1 WHERE id = $1`, [sub.id])
        await pool.query(`DELETE FROM push_subscriptions WHERE id = $1 AND failures >= 5`, [sub.id])
      }
    }
  }
  return report
}

/** Envia a todos os aparelhos do aluno. Devolve quantos receberam. */
export async function pushToUser(userId: string, payload: PushPayload): Promise<number> {
  return (await pushToUserReport(userId, payload)).ok
}

export async function saveSubscription(userId: string, input: { endpoint: string; p256dh: string; auth: string; userAgent: string | null }) {
  await pool.query(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = $2, p256dh = $4, auth = $5, user_agent = $6, failures = 0`,
    [randomUUID(), userId, input.endpoint, input.p256dh, input.auth, input.userAgent],
  )
  await pool.query(
    `INSERT INTO notification_prefs (user_id, email_enabled, push_enabled, categories, unsubscribe_token) VALUES ($1, false, true, $2::jsonb, $3)
     ON CONFLICT (user_id) DO UPDATE SET push_enabled = true, categories = notification_prefs.categories || '{"study": true}'::jsonb, updated_at = now()`,
    [userId, JSON.stringify({ study: true, summary: true, promo: false }), randomBytes(24).toString('hex')],
  )
}

export async function removeSubscription(userId: string, endpoint: string) {
  await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [userId, endpoint])
  await pool.query(
    `UPDATE notification_prefs SET push_enabled = EXISTS (SELECT 1 FROM push_subscriptions WHERE user_id = $1), updated_at = now() WHERE user_id = $1`,
    [userId],
  )
}

export async function removeAllSubscriptions(userId: string) {
  await pool.query(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId])
}
