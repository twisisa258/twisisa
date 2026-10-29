import { randomUUID } from 'node:crypto'
import { AppError } from '@/lib/action-result'
import { pool } from '@/lib/db'
import type { StudentScope } from '@/lib/simulator'
import { DIMENSIONS, computeOrientacao, type CourseProfile, type Dimension, type OrientacaoResult } from '@/lib/orientacao-shared'

// Orientação de curso («Descobre o teu curso»), só servidor. O nome que o aluno vê vem do módulo em lib/exam-modules.ts
// (chave interna 'teste-vocacional', que não muda para não mexer nos dados da administração).
// As respostas são guardadas uma a uma; o resultado é calculado AQUI, a partir das respostas guardadas, nunca de pontuações enviadas pelo browser.

export type OrientacaoCurso = { name: string; institution: string | null; percent: number }

export type OrientacaoEstado =
  | { status: 'nunca' }
  | { status: 'em_curso'; answered: number; total: number }
  | { status: 'concluido'; finishedAt: Date; courses: OrientacaoCurso[] }

export const ORIENTACAO_MODULE_KEY = 'teste-vocacional' as const
export const ORIENTACAO_HREF = '/aluno/descobrir-curso'
export const ORIENTACAO_RESULT_HREF = '/aluno/descobrir-curso/resultado'

async function questionCount(): Promise<number> {
  const result = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM orientation_questions WHERE active`)
  return result.rows[0]?.n ?? 0
}
export const getOrientacaoTotal = questionCount

async function openAttemptId(userId: string): Promise<string | null> {
  const result = await pool.query<{ id: string }>(`SELECT id FROM orientation_attempts WHERE user_id = $1 AND status = 'em_curso' LIMIT 1`, [userId])
  return result.rows[0]?.id ?? null
}

/** Devolve a tentativa em curso ou cria uma nova (uma só em curso por aluno: recarregar volta ao mesmo ponto). */
export async function startOrientacaoAttempt(userId: string): Promise<string> {
  const existing = await openAttemptId(userId)
  if (existing) return existing
  if ((await questionCount()) === 0) throw new AppError('O teste ainda não tem perguntas.')
  const id = randomUUID()
  try {
    await pool.query(`INSERT INTO orientation_attempts (id, user_id) VALUES ($1, $2)`, [id, userId])
    return id
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      const again = await openAttemptId(userId)
      if (again) return again
    }
    throw error
  }
}

export type OrientacaoPlay = { attemptId: string; questions: { id: string; body: string }[]; answers: Record<string, number> }

/** O que o browser recebe: só o texto das perguntas e as respostas já dadas (nunca a dimensão nem os pesos dos cursos). */
export async function loadOrientacaoPlay(userId: string): Promise<OrientacaoPlay | null> {
  const attemptId = await openAttemptId(userId)
  if (!attemptId) return null
  const [questions, answers] = await Promise.all([
    pool.query(`SELECT id, body FROM orientation_questions WHERE active ORDER BY position`),
    pool.query(`SELECT question_id, value FROM orientation_answers WHERE attempt_id = $1`, [attemptId]),
  ])
  const given: Record<string, number> = {}
  for (const row of answers.rows) given[row.question_id as string] = row.value as number
  return { attemptId, questions: questions.rows.map((row) => ({ id: row.id as string, body: row.body as string })), answers: given }
}

export async function saveOrientacaoAnswer(userId: string, attemptId: string, questionId: string, value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 2) throw new AppError('Resposta inválida.')
  const owned = await pool.query(`SELECT 1 FROM orientation_attempts WHERE id = $1 AND user_id = $2 AND status = 'em_curso'`, [attemptId, userId])
  if (owned.rowCount === 0) throw new AppError('Este teste já foi terminado. Abre-o de novo.')
  const question = await pool.query(`SELECT 1 FROM orientation_questions WHERE id = $1 AND active`, [questionId])
  if (question.rowCount === 0) throw new AppError('Pergunta inválida.')
  await pool.query(
    `INSERT INTO orientation_answers (attempt_id, question_id, value) VALUES ($1, $2, $3)
     ON CONFLICT (attempt_id, question_id) DO UPDATE SET value = EXCLUDED.value, answered_at = now()`,
    [attemptId, questionId, value],
  )
}

/** Calcula o resultado no servidor a partir das respostas guardadas e fecha a tentativa. */
export async function finishOrientacao(scope: StudentScope, attemptId: string) {
  const attempt = await pool.query(`SELECT status FROM orientation_attempts WHERE id = $1 AND user_id = $2`, [attemptId, scope.userId])
  if (!attempt.rows[0]) throw new AppError('Teste não encontrado.')
  if (attempt.rows[0].status !== 'em_curso') return

  const [answers, total, profiles] = await Promise.all([
    pool.query(`SELECT q.dimension, a.value FROM orientation_answers a JOIN orientation_questions q ON q.id = a.question_id WHERE a.attempt_id = $1 AND q.active`, [attemptId]),
    questionCount(),
    pool.query(
      `SELECT c.id, c.name, c.unit, i.short_name AS institution, p.r, p.i, p.a, p.s, p.e, p.c
       FROM orientation_course_profiles p
       JOIN courses c ON c.id = p.course_id AND c.active
       JOIN institutions i ON i.id = c.institution_id AND i.active
       WHERE ($1::text IS NULL OR c.institution_id = $1)`,
      [scope.track === 'admissao' ? scope.institutionId : null],
    ),
  ])
  if (answers.rows.length < total) throw new AppError('Faltam respostas. Volta atrás e responde a todas as perguntas.')

  const list: CourseProfile[] = profiles.rows.map((row) => ({
    courseId: row.id as string,
    name: row.name as string,
    unit: (row.unit as string | null) ?? null,
    institution: row.institution as string,
    weights: { R: row.r, I: row.i, A: row.a, S: row.s, E: row.e, C: row.c } as Record<Dimension, number>,
  }))
  const result = computeOrientacao(
    answers.rows.map((row) => ({ dimension: row.dimension as Dimension, value: row.value as number })),
    list,
  )
  await pool.query(`UPDATE orientation_attempts SET status = 'concluido', finished_at = now(), result = $2::jsonb WHERE id = $1 AND status = 'em_curso'`, [attemptId, JSON.stringify(result)])
}

export async function getLatestResult(userId: string): Promise<{ finishedAt: Date; result: OrientacaoResult } | null> {
  const row = (await pool.query(`SELECT finished_at, result FROM orientation_attempts WHERE user_id = $1 AND status = 'concluido' ORDER BY finished_at DESC LIMIT 1`, [userId])).rows[0]
  const result = row?.result as OrientacaoResult | undefined
  if (!row || !result || result.version !== 1 || !Array.isArray(result.courses) || !DIMENSIONS.every((d) => typeof result.scores?.[d] === 'number')) return null
  return { finishedAt: new Date(row.finished_at), result }
}

/** Estado do aluno, para o Início (/aluno): a meio, concluído ou nunca feito. */
export async function getOrientacao(userId: string): Promise<OrientacaoEstado> {
  const open = await openAttemptId(userId)
  if (open) {
    const [answered, total] = await Promise.all([pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM orientation_answers WHERE attempt_id = $1`, [open]), questionCount()])
    return { status: 'em_curso', answered: Math.min(answered.rows[0]?.n ?? 0, total), total }
  }
  const latest = await getLatestResult(userId)
  if (latest) {
    return { status: 'concluido', finishedAt: latest.finishedAt, courses: latest.result.courses.map((c) => ({ name: c.name, institution: c.institution, percent: c.percent })) }
  }
  return { status: 'nunca' }
}
