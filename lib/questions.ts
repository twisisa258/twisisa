import { pool } from '@/lib/db'

// Banco de questões (admin). As marcas `origin` e `answerSource` são INTERNAS: só o admin as vê.
// Quando existir a API do aluno (Fase 4), usará um tipo próprio sem estes campos.

export const DIFFICULTIES = [
  { value: 'facil', label: 'Fácil' },
  { value: 'media', label: 'Média' },
  { value: 'dificil', label: 'Difícil' },
] as const
export const difficultyLabel = (value: string) => DIFFICULTIES.find((item) => item.value === value)?.label ?? value

export const ORIGINS = [
  { value: 'real', label: 'Exame real' },
  { value: 'admin', label: 'Escrita pelo admin' },
  { value: 'ia', label: 'Criada pela IA' },
] as const
export const originLabel = (value: string) => ORIGINS.find((item) => item.value === value)?.label ?? value

export const ANSWER_SOURCES = [
  { value: 'confirmada', label: 'Confirmada por mim' },
  { value: 'oficial', label: 'Gabarito oficial' },
  { value: 'sugestao', label: 'Sugestão por confirmar' },
] as const
export const answerSourceLabel = (value: string) => ANSWER_SOURCES.find((item) => item.value === value)?.label ?? value

export const STATUSES = [
  { value: 'rascunho', label: 'Rascunhos', tab: 'rascunhos' },
  { value: 'publicada', label: 'Publicadas', tab: 'publicadas' },
  { value: 'arquivada', label: 'Arquivadas', tab: 'arquivadas' },
] as const
export type QuestionStatus = (typeof STATUSES)[number]['value']

export const TRACK_LABELS: Record<string, string> = { '10': '10ª classe', '12': '12ª classe', admissao: 'Admissão' }
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 5

export type QuestionListItem = {
  id: string
  statement: string
  status: QuestionStatus
  difficulty: string
  origin: string
  answerSource: string
  version: number
  examYear: number | null
  subjectName: string
  scopeLabel: string
}

export type QuestionDetail = {
  id: string
  statement: string
  explanation: string | null
  status: QuestionStatus
  track: string
  institutionId: string | null
  subjectId: string
  topicId: string | null
  difficulty: string
  examYear: number | null
  originLabel: string | null
  variant: string | null
  origin: string
  answerSource: string
  version: number
  options: { body: string; isCorrect: boolean; isFixed: boolean }[]
}

/** Texto sem acentos e em minúsculas no SQL, para a pesquisa («portugues» encontra «Português»). */
const NORMALIZED = (expr: string) => `translate(lower(${expr}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`

export async function listQuestions({ status, term, page, pageSize }: { status: QuestionStatus; term: string; page: number; pageSize: number }) {
  const like = term ? `%${term.replace(/[\\%_]/g, '\\$&')}%` : null
  const from = `FROM questions q
    JOIN library_subjects s ON s.id = q.subject_id
    LEFT JOIN topics t ON t.id = q.topic_id
    LEFT JOIN institutions i ON i.id = q.institution_id
    WHERE q.status = $1 AND ($2::text IS NULL OR ${NORMALIZED('q.statement')} LIKE $2 OR ${NORMALIZED('s.name')} LIKE $2 OR ${NORMALIZED("coalesce(t.name, '')")} LIKE $2)`
  const count = await pool.query(`SELECT count(*)::int AS n ${from}`, [status, like])
  const total = count.rows[0].n as number
  const safePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
  const rows = await pool.query(
    `SELECT q.id, q.statement, q.status, q.difficulty, q.origin, q.answer_source, q.version, q.exam_year, q.track, s.name AS subject_name, i.short_name AS institution_name
     ${from} ORDER BY q.updated_at DESC, q.id LIMIT ${pageSize} OFFSET $3`,
    [status, like, (safePage - 1) * pageSize],
  )
  const items: QuestionListItem[] = rows.rows.map((row) => ({
    id: row.id,
    statement: row.statement,
    status: row.status,
    difficulty: row.difficulty,
    origin: row.origin,
    answerSource: row.answer_source,
    version: row.version,
    examYear: row.exam_year,
    subjectName: row.subject_name,
    scopeLabel: row.track === 'admissao' ? `Admissão · ${row.institution_name ?? '?'}` : (TRACK_LABELS[row.track] ?? '—'),
  }))
  return { total, page: safePage, items }
}

export async function countByStatus(): Promise<Record<QuestionStatus, number>> {
  const result = await pool.query('SELECT status, count(*)::int AS n FROM questions GROUP BY status')
  const counts: Record<QuestionStatus, number> = { rascunho: 0, publicada: 0, arquivada: 0 }
  for (const row of result.rows) counts[row.status as QuestionStatus] = row.n
  return counts
}

export async function getQuestion(id: string): Promise<QuestionDetail | null> {
  const found = await pool.query('SELECT * FROM questions WHERE id = $1', [id])
  if (!found.rowCount) return null
  const q = found.rows[0]
  const options = await pool.query('SELECT body, is_correct, is_fixed FROM question_options WHERE question_id = $1 ORDER BY position', [id])
  return {
    id: q.id,
    statement: q.statement,
    explanation: q.explanation,
    status: q.status,
    track: q.track,
    institutionId: q.institution_id,
    subjectId: q.subject_id,
    topicId: q.topic_id,
    difficulty: q.difficulty,
    examYear: q.exam_year,
    originLabel: q.origin_label,
    variant: q.variant ?? null,
    origin: q.origin,
    answerSource: q.answer_source,
    version: q.version,
    options: options.rows.map((row) => ({ body: row.body ?? '', isCorrect: row.is_correct, isFixed: row.is_fixed })),
  }
}

/** A disciplina tem de existir no âmbito da questão (classe, ou instituição na admissão). */
export async function subjectHasScope(subjectId: string, track: string, institutionId: string | null) {
  const result =
    track === 'admissao'
      ? await pool.query('SELECT 1 FROM subject_scopes WHERE subject_id = $1 AND institution_id = $2', [subjectId, institutionId])
      : await pool.query('SELECT 1 FROM subject_scopes WHERE subject_id = $1 AND track = $2', [subjectId, track])
  return (result.rowCount ?? 0) > 0
}

export type OptionInput = { body: string; isCorrect: boolean; isFixed: boolean }

/** Mensagem do primeiro problema nas opções, ou null. */
export function optionsProblem(options: OptionInput[]): string | null {
  if (options.length < MIN_OPTIONS) return `A questão precisa de pelo menos ${MIN_OPTIONS} opções.`
  if (options.length > MAX_OPTIONS) return `A questão pode ter no máximo ${MAX_OPTIONS} opções.`
  if (options.filter((option) => option.isCorrect).length !== 1) return 'Marca uma (e só uma) opção correta.'
  const texts = new Set(options.map((option) => option.body.trim().toLowerCase()))
  if (texts.size !== options.length) return 'Há opções repetidas.'
  return null
}
