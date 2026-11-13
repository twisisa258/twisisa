import { pool } from '@/lib/db'

export type ItemRevisao = {
  id: string
  statement: string
  status: string
  subjectName: string
  institution: string | null
  track: string | null
  variant: string | null
  examYear: number | null
  reasons: string[]
  note: string | null
  updatedAt: Date
}

const ONDE = "q.status <> 'arquivada' AND cardinality(q.review_reasons) > 0"

export async function contarRevisao(): Promise<number> {
  try {
    const result = await pool.query(`SELECT count(*)::int AS total FROM questions q WHERE ${ONDE}`)
    return result.rows[0].total as number
  } catch (error) {
    console.error('[REVISÃO] Não foi possível contar', error)
    return 0
  }
}

export async function contarReportesAbertos(): Promise<number> {
  const result = await pool.query("SELECT count(*)::int AS total FROM question_reports WHERE status = 'aberto'")
  return result.rows[0].total as number
}

export async function listarRevisao(razao: string | null, page: number, pageSize: number) {
  const filtro = razao ?? null
  const [total, items, razoes] = await Promise.all([
    pool.query(`SELECT count(*)::int AS total FROM questions q WHERE ${ONDE} AND ($1::text IS NULL OR $1 = ANY(q.review_reasons))`, [filtro]),
    pool.query(
      `SELECT q.id, q.statement, q.status, q.track, q.variant, q.exam_year, q.review_reasons, q.review_note, q.updated_at,
              s.name AS subject_name, i.short_name AS institution
       FROM questions q
       JOIN library_subjects s ON s.id = q.subject_id
       LEFT JOIN institutions i ON i.id = q.institution_id
       WHERE ${ONDE} AND ($1::text IS NULL OR $1 = ANY(q.review_reasons))
       ORDER BY q.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [filtro, pageSize, (page - 1) * pageSize],
    ),
    pool.query(`SELECT r AS razao, count(*)::int AS total FROM questions q, unnest(q.review_reasons) AS r WHERE q.status <> 'arquivada' GROUP BY r`),
  ])
  const porRazao: Record<string, number> = {}
  for (const row of razoes.rows) porRazao[row.razao as string] = row.total as number
  return {
    total: total.rows[0].total as number,
    porRazao,
    items: items.rows.map((row): ItemRevisao => ({
      id: row.id as string,
      statement: row.statement as string,
      status: row.status as string,
      subjectName: row.subject_name as string,
      institution: (row.institution as string | null) ?? null,
      track: (row.track as string | null) ?? null,
      variant: (row.variant as string | null) ?? null,
      examYear: (row.exam_year as number | null) ?? null,
      reasons: row.review_reasons as string[],
      note: (row.review_note as string | null) ?? null,
      updatedAt: row.updated_at as Date,
    })),
  }
}
