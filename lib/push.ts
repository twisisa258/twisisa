import 'server-only'

import { randomBytes, randomUUID } from 'node:crypto'
import webpush from 'web-push'
import { pool } from '@/lib/db'
import { siteBaseUrl } from '@/lib/email'

// Web push: o aluno liga no telemóvel (/aluno/lembretes) e o servidor envia com as chaves VAPID.
// Variáveis: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e, opcional, VAPID_SUBJECT (mailto: ou https:).

export type PushPayload = { title: string; body: string; url: string }

let configured = false
export function pushConfigured() {
  if (configured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || siteBaseUrl(), publicKey, privateKey)
  configured = true
  return true
}

/** Envia a todos os aparelhos do aluno. Devolve quantos receberam. Aparelhos mortos (404/410) são apagados. */
export async function pushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0
  const subs = (await pool.query(`SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`, [userId])).rows as { id: string; endpoint: string; p256dh: string; auth: string }[]
  let ok = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 })
      await pool.query(`UPDATE push_subscriptions SET last_ok_at = now(), failures = 0 WHERE id = $1`, [sub.id])
      ok++
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) {
        await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id])
      } else {
        console.error('[PUSH] falha', status ?? error)
        await pool.query(`UPDATE push_subscriptions SET failures = failures + 1 WHERE id = $1`, [sub.id])
        await pool.query(`DELETE FROM push_subscriptions WHERE id = $1 AND failures >= 5`, [sub.id])
      }
    }
  }
  return ok
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
