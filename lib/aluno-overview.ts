import { and, count, eq, isNull } from 'drizzle-orm'
import { db, pool } from '@/lib/db'
import { notifications, studyProgress } from '@/lib/db/schema'
import { getVisibleModules } from '@/lib/exam-modules'
import type { Track } from '@/lib/percurso'

/** Cada parte do painel é independente: se uma consulta falhar fica `ok: false` (indisponível), nunca um zero inventado. */
export type Part<T> = { ok: true; value: T } | { ok: false }
export type MaterialItem = { id: string; title: string; at: Date }

async function part<T>(label: string, run: () => Promise<T>): Promise<Part<T>> {
  try {
    return { ok: true, value: await run() }
  } catch (error) {
    console.error(`[ALUNO] ${label}`, error)
    return { ok: false }
  }
}

type Row = { id: string; title: string; at: Date | string }
function toItems(rows: Row[]): MaterialItem[] {
  return rows.map((row) => ({ id: row.id, title: row.title, at: new Date(row.at) }))
}

// Só materiais aprovados: são os únicos que /api/biblioteca/<id>/ficheiro entrega.
export async function getAlunoOverview(input: { userId: string; track: Track | null; institutionId: string | null }) {
  const { userId, track, institutionId } = input

  const [progress, unread, downloads, saved, recent, savedItems, institution, simulador] = await Promise.all([
    part('progresso', async () => {
      const [row] = await db
        .select({ weekly: studyProgress.weeklyProgress, streak: studyProgress.streakDays })
        .from(studyProgress)
        .where(eq(studyProgress.userId, userId))
        .limit(1)
      return row ?? null
    }),
    part('notificações', async () => {
      const [row] = await db
        .select({ total: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      return Number(row?.total ?? 0)
    }),
    part('descarregados', async () => {
      const result = await pool.query<{ total: number }>(
        `SELECT count(DISTINCT d.material_id)::int AS total
         FROM library_downloads d
         JOIN academic_materials m ON m.id = d.material_id AND m.status = 'approved'
         WHERE d.user_id = $1`,
        [userId],
      )
      return Number(result.rows[0]?.total ?? 0)
    }),
    part('guardados (total)', async () => {
      const result = await pool.query<{ total: number }>(
        `SELECT count(*)::int AS total
         FROM library_favorites f
         JOIN academic_materials m ON m.id = f.material_id AND m.status = 'approved'
         WHERE f.user_id = $1`,
        [userId],
      )
      return Number(result.rows[0]?.total ?? 0)
    }),
    part('recentes', async () => {
      const result = await pool.query<Row>(
        `SELECT m.id, m.title, d.last_at AS "at"
         FROM (
           SELECT material_id, max(downloaded_at) AS last_at
           FROM library_downloads
           WHERE user_id = $1
           GROUP BY material_id
         ) d
         JOIN academic_materials m ON m.id = d.material_id AND m.status = 'approved'
         ORDER BY d.last_at DESC
         LIMIT 3`,
        [userId],
      )
      return toItems(result.rows)
    }),
    part('guardados', async () => {
      const result = await pool.query<Row>(
        `SELECT m.id, m.title, f.created_at AS "at"
         FROM library_favorites f
         JOIN academic_materials m ON m.id = f.material_id AND m.status = 'approved'
         WHERE f.user_id = $1
         ORDER BY f.created_at DESC
         LIMIT 3`,
        [userId],
      )
      return toItems(result.rows)
    }),
    part('instituição', async () => {
      if (track !== 'admissao' || !institutionId) return null
      const result = await pool.query<{ short_name: string }>('SELECT short_name FROM institutions WHERE id = $1 LIMIT 1', [institutionId])
      return result.rows[0]?.short_name ?? null
    }),
    part('simulador', async () => {
      if (!track) return { soon: false }
      const modules = await getVisibleModules(track)
      // «Em breve» só quando há módulos visíveis e nenhum está realmente ativo.
      return { soon: modules.length > 0 && !modules.some((item) => item.status === 'active') }
    }),
  ])

  return { progress, unread, downloads, saved, recent, savedItems, institution, simulador }
}

export type AlunoOverview = Awaited<ReturnType<typeof getAlunoOverview>>
