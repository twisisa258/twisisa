import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { reminderEmail, sendEmail, siteBaseUrl } from '@/lib/email'
import { buildAvisos } from '@/lib/avisos'
import { DEFAULT_STUDY_HOUR, chooseReminder } from '@/lib/lembretes-shared'
import { getDesafios } from '@/lib/desafios'
import { isTrack } from '@/lib/percurso'
import { markCounts } from '@/lib/kit'

// Lembretes de estudo: no máximo um por aluno e por dia, na hora que o aluno escolheu (hora de Maputo).
// Regras puras em `chooseReminder` (testadas); o resto liga a base de dados, as notificações na app e o e-mail.

export { DEFAULT_STUDY_HOUR, MIN_STUDY_HOUR, MAX_STUDY_HOUR, STUDY_HOURS, isStudyHour, chooseReminder, type Reminder } from '@/lib/lembretes-shared'

type Candidate = { user_id: string; name: string; email: string; token: string; track: string | null; institution_id: string | null; target_course_id: string | null; daily_goal: number | null }

/** Cria os lembretes desta hora (notificação na app + e-mail na fila). Devolve quantos criou. */
export async function queueReminders(limit = 200): Promise<{ checked: number; queued: number }> {
  const rows = (
    await pool.query<Candidate>(
      `SELECT u.id AS user_id, u.name, u.email, p.unsubscribe_token AS token, sp.track, sp.institution_id, sp.target_course_id, sp.daily_goal
       FROM notification_prefs p
       JOIN "user" u ON u.id = p.user_id
       JOIN student_profiles sp ON sp.user_id = p.user_id AND sp.onboarded_at IS NOT NULL
       WHERE p.email_enabled AND coalesce((p.categories->>'study')::boolean, false)
         AND coalesce(p.study_hour, $1) = extract(hour FROM (now() AT TIME ZONE 'Africa/Maputo'))::int
         AND p.last_sent_on IS DISTINCT FROM (now() AT TIME ZONE 'Africa/Maputo')::date
       ORDER BY p.user_id LIMIT $2`,
      [DEFAULT_STUDY_HOUR, limit],
    )
  ).rows
  let queued = 0
  for (const row of rows) {
    try {
      if (!isTrack(row.track)) continue
      const snapshot = await getDesafios({ scope: { userId: row.user_id, track: row.track, institutionId: row.institution_id }, targetCourseId: row.target_course_id, dailyGoal: row.daily_goal })
      const { due } = await markCounts(row.user_id)
      const reminder = chooseReminder({ avisos: buildAvisos(snapshot), todayMet: snapshot.streak.todayMet, marksDue: due })
      // Mesmo sem lembrete hoje, marca o dia para não voltar a tentar nesta hora.
      await pool.query(`UPDATE notification_prefs SET last_sent_on = (now() AT TIME ZONE 'Africa/Maputo')::date WHERE user_id = $1`, [row.user_id])
      if (!reminder) continue
      const dedupe = `lembrete:${snapshot.today}`
      const created = await pool.query(
        `INSERT INTO notifications (id, user_id, title, body, kind, action_label, action_href, dedupe_key) VALUES ($1, $2, $3, $4, 'lembrete', $5, $6, $7) ON CONFLICT DO NOTHING`,
        [randomUUID(), row.user_id, reminder.title, reminder.text, reminder.cta, reminder.href, dedupe],
      )
      if (!created.rowCount) continue
      const mail = reminderEmail({ name: row.name, title: reminder.title, text: reminder.text, cta: reminder.cta, href: reminder.href, unsubscribeUrl: `${siteBaseUrl()}/lembretes/cancelar?token=${encodeURIComponent(row.token)}` })
      await pool.query(`INSERT INTO notification_outbox (id, user_id, subject, body, href, dedupe_key) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (user_id, dedupe_key) DO NOTHING`, [randomUUID(), row.user_id, mail.subject, JSON.stringify({ html: mail.html, text: mail.text }), reminder.href, dedupe])
      queued++
    } catch (error) {
      console.error('[LEMBRETES] aluno', row.user_id, error)
    }
  }
  return { checked: rows.length, queued }
}

/** Envia o que está na fila. Três tentativas por mensagem; depois fica «falhou» com o erro registado. */
export async function flushOutbox(limit = 100): Promise<{ sent: number; failed: number }> {
  const rows = (
    await pool.query(
      `SELECT o.id, o.body, o.subject, u.email FROM notification_outbox o JOIN "user" u ON u.id = o.user_id
       WHERE o.status = 'pendente' ORDER BY o.created_at LIMIT $1`,
      [limit],
    )
  ).rows
  let sent = 0
  let failed = 0
  for (const row of rows) {
    try {
      const content = JSON.parse(row.body as string) as { html: string; text: string }
      await sendEmail({ to: row.email as string, subject: row.subject as string, html: content.html, text: content.text })
      await pool.query(`UPDATE notification_outbox SET status = 'enviada', sent_at = now(), attempts = attempts + 1, last_error = NULL WHERE id = $1`, [row.id])
      sent++
    } catch (error) {
      failed++
      const message = error instanceof Error ? error.message.slice(0, 300) : 'erro'
      await pool.query(`UPDATE notification_outbox SET attempts = attempts + 1, last_error = $2, status = CASE WHEN attempts + 1 >= 3 THEN 'falhou' ELSE 'pendente' END WHERE id = $1`, [row.id, message])
    }
  }
  return { sent, failed }
}
