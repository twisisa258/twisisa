import { pool } from '@/lib/db'
import { publicName } from '@/lib/perfil'

// Ranking do Simulador: pontos = soma de attempt_items.points (peso da questão, só se acertar).
// - Compara alunos do mesmo percurso (10ª, 12ª ou admissão).
// - «Semana» conta desde segunda-feira 00:00 em Maputo (CAT); «Geral» conta tudo.
// - Fora do ranking: quem saiu (show_in_ranking = false), a administração e a equipa de revisão.
// - Posição com empates (rank): quem tem os mesmos pontos partilha a posição.

export type RankingPeriod = 'semana' | 'geral'

export function parsePeriod(value: unknown): RankingPeriod {
  return value === 'geral' ? 'geral' : 'semana'
}

export type RankingRow = {
  userId: string
  position: number
  points: number
  correct: number
  name: string
  nickname: string | null
  image: string | null
  isMe: boolean
}

export type RankingData = {
  rows: RankingRow[]
  total: number
  me: (RankingRow & { missing: number | null }) | null
}

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

const round1 = (value: number) => Math.round(value * 10) / 10

export async function getRanking(input: { userId: string; track: string; period: RankingPeriod; limit?: number }): Promise<RankingData> {
  const limit = input.limit ?? 20
  const result = await pool.query(
    `WITH totals AS (
       SELECT a.user_id,
              sum(i.points)::float8 AS points,
              count(*) FILTER (WHERE i.is_correct)::int AS correct
       FROM attempt_items i
       JOIN attempts a ON a.id = i.attempt_id
       JOIN student_profiles sp ON sp.user_id = a.user_id
       JOIN "user" u ON u.id = a.user_id
       WHERE sp.track = $1
         AND sp.show_in_ranking
         AND i.points > 0
         AND ($2::text = 'geral' OR i.answered_at >= (date_trunc('week', now() AT TIME ZONE 'Africa/Maputo') AT TIME ZONE 'Africa/Maputo'))
         AND NOT (lower(u.email) = ANY($3::text[]))
         AND NOT EXISTS (SELECT 1 FROM staff_roles r WHERE r.user_id = a.user_id)
       GROUP BY a.user_id
     ), ranked AS (
       SELECT t.*, rank() OVER (ORDER BY t.points DESC)::int AS position, count(*) OVER ()::int AS total
       FROM totals t
     )
     SELECT r.user_id, r.points, r.correct, r.position, r.total, u.name, u.image, sp.nickname,
            (SELECT min(x.points) FROM totals x WHERE x.points > r.points) AS next_points
     FROM ranked r
     JOIN "user" u ON u.id = r.user_id
     JOIN student_profiles sp ON sp.user_id = r.user_id
     WHERE r.position <= $4 OR r.user_id = $5
     ORDER BY r.position, r.correct DESC, u.name`,
    [input.track, input.period, adminEmails(), limit, input.userId],
  )

  const all = result.rows.map((row) => ({
    row: {
      userId: row.user_id as string,
      position: row.position as number,
      points: round1(Number(row.points)),
      correct: row.correct as number,
      name: publicName(row.name as string),
      nickname: (row.nickname as string | null) ?? null,
      image: (row.image as string | null) ?? null,
      isMe: row.user_id === input.userId,
    } satisfies RankingRow,
    nextPoints: row.next_points === null ? null : Number(row.next_points),
    total: row.total as number,
  }))

  const mine = all.find((item) => item.row.isMe)
  return {
    rows: all.filter((item) => item.row.position <= limit).map((item) => item.row),
    total: all[0]?.total ?? 0,
    me: mine ? { ...mine.row, missing: mine.nextPoints === null ? null : round1(mine.nextPoints - mine.row.points) } : null,
  }
}
