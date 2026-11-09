import 'server-only'

import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { getCourseGate, getStudentSubjectIds } from '@/lib/combinacoes'
import { getDesafios } from '@/lib/desafios'
import { markCounts } from '@/lib/kit'
import { isTrack } from '@/lib/percurso'
import { pushToUser } from '@/lib/push'
import { maputoNow, mergeConfig, pickPush, type PushConfig, type PushContext, type PushKind } from '@/lib/push-regras'

// Motor de notificações push. Corre a cada 30 minutos (agendador externo, ver docs): para cada aluno que permitiu push,
// vê o que lhe interessa agora e envia, no máximo, UMA mensagem, respeitando intervalo, limite diário e horas de silêncio.

export async function getPushConfig(): Promise<PushConfig> {
  const row = (await pool.query(`SELECT value FROM app_settings WHERE key = 'push'`).catch(() => ({ rows: [] }))).rows[0]
  return mergeConfig(row?.value)
}

type Row = { user_id: string; track: string | null; institution_id: string | null; target_course_id: string | null; daily_goal: number | null }

async function buildContext(row: Row, now: ReturnType<typeof maputoNow>): Promise<PushContext> {
  const logs = (
    await pool.query(
      `SELECT kind, ref, (sent_at AT TIME ZONE 'Africa/Maputo')::date::text AS day, extract(epoch FROM (now() - sent_at)) / 60 AS ago
       FROM push_log WHERE user_id = $1 AND sent_at > now() - interval '7 days'`,
      [row.user_id],
    )
  ).rows
  const lastByKind: Partial<Record<PushKind, number>> = {}
  let minutesSinceLast: number | null = null
  let sentToday = 0
  for (const log of logs) {
    const ago = Number(log.ago)
    minutesSinceLast = minutesSinceLast === null ? ago : Math.min(minutesSinceLast, ago)
    lastByKind[log.kind as PushKind] = Math.min(lastByKind[log.kind as PushKind] ?? Infinity, ago)
    if (log.day === now.date) sentToday++
  }
  const history = { sentToday, minutesSinceLast, lastByKind, refs: logs.map((log) => `${log.kind}:${log.ref}`) }
  const empty: PushContext = { now, userSeed: row.user_id, needsCourse: false, goal: 0, answered: 0, todayMet: true, streak: 0, daysSinceActive: null, hot: 0, openAttempt: null, newMaterials: [], history }

  if ((await getCourseGate(row.user_id)).need) return { ...empty, needsCourse: true }
  if (!isTrack(row.track)) return empty

  const scope = { userId: row.user_id, track: row.track, institutionId: row.institution_id }
  const snapshot = await getDesafios({ scope, targetCourseId: row.target_course_id, dailyGoal: row.daily_goal })
  const { due } = await markCounts(row.user_id)

  const open = (
    await pool.query(
      `SELECT a.id, a.total,
              (SELECT count(*)::int FROM attempt_items i WHERE i.attempt_id = a.id AND i.answered_at IS NOT NULL) AS answered,
              extract(epoch FROM (now() - greatest(a.started_at, coalesce((SELECT max(i.answered_at) FROM attempt_items i WHERE i.attempt_id = a.id), a.started_at)))) / 60 AS idle
       FROM attempts a WHERE a.user_id = $1 AND a.status = 'em_curso' AND a.mode <> 'rapido' ORDER BY a.started_at DESC LIMIT 1`,
      [row.user_id],
    )
  ).rows[0]

  // Matéria nova (últimos 3 dias, aprovada) nas disciplinas das provas do aluno e ainda não avisada.
  const subjectIds = (await getStudentSubjectIds(row.user_id)) ?? snapshot.subjects.map((subject) => subject.id)
  const newMaterials = subjectIds.length === 0 ? [] : (
    await pool.query(
      `SELECT m.id, m.title, s.name AS subject
       FROM academic_materials m LEFT JOIN library_subjects s ON s.id = m.subject_id
       WHERE m.status = 'approved' AND m.subject_id = ANY($2::text[])
         AND coalesce(m.published_at, m.created_at) > now() - interval '3 days'
         AND NOT EXISTS (SELECT 1 FROM push_log l WHERE l.user_id = $1 AND l.kind = 'materia-nova' AND l.ref = m.id)
       ORDER BY coalesce(m.published_at, m.created_at) DESC LIMIT 5`,
      [row.user_id, subjectIds],
    )
  ).rows.map((material) => ({ id: material.id as string, title: material.title as string, subject: (material.subject as string | null) ?? null }))

  return {
    ...empty,
    goal: snapshot.goal,
    answered: snapshot.todayAnswered,
    todayMet: snapshot.streak.todayMet,
    streakSafe: snapshot.streak.todayCounted,
    streak: snapshot.streak.current,
    daysSinceActive: snapshot.daysSinceActive,
    hot: snapshot.errorCount + due,
    openAttempt: open ? { id: open.id as string, answered: Number(open.answered), total: Number(open.total), idleMinutes: Number(open.idle) } : null,
    newMaterials,
  }
}

export async function runPushTick(limit = 300) {
  const cfg = await getPushConfig()
  const now = maputoNow()
  const rows = (
    await pool.query(
      `SELECT p.user_id, sp.track, sp.institution_id, sp.target_course_id, sp.daily_goal
       FROM notification_prefs p
       JOIN student_profiles sp ON sp.user_id = p.user_id AND sp.onboarded_at IS NOT NULL
       WHERE p.push_enabled AND coalesce((p.categories->>'study')::boolean, false)
         AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = p.user_id)
       ORDER BY coalesce((SELECT max(l.sent_at) FROM push_log l WHERE l.user_id = p.user_id), 'epoch'::timestamptz)
       LIMIT $1`,
      [limit],
    )
  ).rows as Row[]

  let sent = 0
  for (const row of rows) {
    try {
      const message = pickPush(await buildContext(row, now), cfg)
      if (!message) continue
      const delivered = await pushToUser(row.user_id, { title: message.title, body: message.body, url: message.url, tag: message.kind })
      if (delivered === 0) continue
      for (const ref of message.refs) {
        await pool.query(`INSERT INTO push_log (id, user_id, kind, ref, title) VALUES ($1, $2, $3, $4, $5)`, [randomUUID(), row.user_id, message.kind, ref, message.title])
      }
      sent++
    } catch (error) {
      console.error('[PUSH-MOTOR] aluno', row.user_id, error)
    }
  }
  // O registo só serve para os limites: guarda 14 dias.
  await pool.query(`DELETE FROM push_log WHERE sent_at < now() - interval '14 days'`).catch(() => undefined)
  return { pushChecked: rows.length, pushSent: sent }
}
