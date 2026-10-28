import { randomUUID } from 'node:crypto'
import { AppError } from '@/lib/action-result'
import { pool } from '@/lib/db'
import type { Track } from '@/lib/percurso'
import { gradeOutOf20, itemWeight, OptionShuffler, pickQuestions, type Candidate } from '@/lib/quiz-engine'
import { PRACTICE_SIZE, QUICK_SECONDS_PER_QUESTION, QUICK_SERVER_MARGIN_SECONDS, ROUND_SIZE, TIME_GRACE_MS, type AttemptMode, type PlayData, type PlayFeedback, type PlayImage, type PlayItem } from '@/lib/simulator-shared'

// Motor de tentativas (só servidor). A resposta certa e a explicação só saem daqui quando a regra do modo o permite.

export class TimeUpError extends AppError {}

export type StudentScope = { userId: string; track: Track; institutionId: string | null }

// Prática, Modo rápido e Revisão sorteiam entre todas as questões publicadas (exames reais de todos os anos, criadas pela IA e escritas pelo admin).
// A origem é uma marca interna do admin: o aluno nunca a vê. (Decisão de 26/10/2026; antes só entravam 'ia' e 'admin'.)
const PLAYABLE_ORIGINS = ['real', 'ia', 'admin']

// $1 percurso, $2 instituição, $3 origens permitidas.
const SCOPE = `q.status = 'publicada' AND q.track = $1 AND q.institution_id IS NOT DISTINCT FROM $2::text AND q.origin = ANY($3::text[])
  AND (SELECT count(*) FROM question_options o WHERE o.question_id = q.id) BETWEEN 2 AND 5
  AND (SELECT count(*) FROM question_options o WHERE o.question_id = q.id AND o.is_correct) = 1`

const scopeParams = (scope: StudentScope) => [scope.track, scope.track === 'admissao' ? scope.institutionId : null, PLAYABLE_ORIGINS]

type AttemptRow = { id: string; mode: AttemptMode; status: string; total: number; correct: number; subject_id: string | null; variant: string | null; topic_id: string | null; started_at: Date; ends_at: Date | null; finished_at: Date | null }

const isOverdue = (row: Pick<AttemptRow, 'mode' | 'ends_at'>) => row.mode === 'rapido' && !!row.ends_at && Date.now() > new Date(row.ends_at).getTime() + TIME_GRACE_MS

async function finalize(attemptId: string, status: 'concluida' | 'expirada') {
  await pool.query(
    `UPDATE attempt_items i SET is_correct = o.is_correct FROM question_options o
     WHERE i.attempt_id = $1 AND i.is_correct IS NULL AND o.id = i.answer_option_id`,
    [attemptId],
  )
  await pool.query(
    `UPDATE attempts SET status = $2, finished_at = now(), correct = (SELECT count(*) FROM attempt_items WHERE attempt_id = $1 AND is_correct)
     WHERE id = $1 AND status = 'em_curso'`,
    [attemptId, status],
  )
}

async function closeExpired(userId: string) {
  const open = await pool.query(`SELECT id, mode, ends_at FROM attempts WHERE user_id = $1 AND status = 'em_curso' AND mode = 'rapido'`, [userId])
  for (const row of open.rows) if (isOverdue(row)) await finalize(row.id, 'expirada')
}

async function getOwned(userId: string, attemptId: string) {
  const result = await pool.query<AttemptRow>(
    `SELECT id, mode, status, total, correct, subject_id, variant, topic_id, started_at, ends_at, finished_at FROM attempts WHERE id = $1 AND user_id = $2`,
    [attemptId, userId],
  )
  return result.rows[0] ?? null
}

// ───────────── Início do Simulador ─────────────

export async function getSimulatorHub(scope: StudentScope) {
  await closeExpired(scope.userId)
  const base = scopeParams(scope)
  const [subjects, open, stats, errors] = await Promise.all([
    pool.query(
      `SELECT s.id, s.name, count(*)::int AS n FROM questions q JOIN library_subjects s ON s.id = q.subject_id
       WHERE s.active AND ${SCOPE} GROUP BY s.id, s.name ORDER BY s.name`,
      base,
    ),
    pool.query(
      `SELECT a.id, a.mode, a.total, a.ends_at, s.name AS subject,
         (SELECT count(*)::int FROM attempt_items i WHERE i.attempt_id = a.id AND i.answered_at IS NOT NULL) AS answered
       FROM attempts a LEFT JOIN library_subjects s ON s.id = a.subject_id
       WHERE a.user_id = $1 AND a.status = 'em_curso' ORDER BY a.started_at DESC`,
      [scope.userId],
    ),
    pool.query(
      `SELECT count(*) FILTER (WHERE i.is_correct IS NOT NULL)::int AS answered,
              count(*) FILTER (WHERE i.is_correct)::int AS correct,
              coalesce(sum(i.points), 0)::float8 AS points,
              (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND status IN ('concluida','expirada')) AS rounds
       FROM attempt_items i JOIN attempts a ON a.id = i.attempt_id WHERE a.user_id = $1`,
      [scope.userId],
    ),
    pool.query(
      `SELECT count(*)::int AS n FROM student_question_stats st JOIN questions q ON q.id = st.question_id
       WHERE st.user_id = $4 AND st.last_result = 'wrong' AND ${SCOPE}`,
      [...base, scope.userId],
    ),
  ])
  const subjectList = subjects.rows.map((row) => ({ id: row.id as string, name: row.name as string, count: row.n as number }))
  return {
    subjects: subjectList,
    totalQuestions: subjectList.reduce((sum, item) => sum + item.count, 0),
    open: open.rows.map((row) => ({
      id: row.id as string,
      mode: row.mode as AttemptMode,
      total: row.total as number,
      answered: row.answered as number,
      subject: (row.subject as string | null) ?? null,
      endsAt: row.ends_at ? new Date(row.ends_at).getTime() : null,
    })),
    stats: { answered: stats.rows[0].answered as number, correct: stats.rows[0].correct as number, rounds: stats.rows[0].rounds as number, points: Number(stats.rows[0].points) },
    errorCount: errors.rows[0].n as number,
  }
}

export type VariantInfo = { name: string; count: number; fresh: number }
export type TopicInfo = { id: string; name: string; count: number; fresh: number }

/**
 * Variantes de uma disciplina (ex.: Matemática I, II, III) que têm questões para este aluno, com quantas há e quantas ele ainda não viu.
 * `auxiliary` = questões da disciplina sem variante: nunca contam como uma variante; só completam a mistura.
 */
export async function getVariants(scope: StudentScope, subjectId: string): Promise<{ variants: VariantInfo[]; auxiliary: number; total: number }> {
  const rows = await pool.query(
    `SELECT q.variant, count(*)::int AS n, count(*) FILTER (WHERE coalesce(st.times_shown, 0) = 0)::int AS fresh
     FROM questions q
     LEFT JOIN subject_variants v ON v.subject_id = q.subject_id AND v.name = q.variant
     LEFT JOIN student_question_stats st ON st.user_id = $5 AND st.question_id = q.id
     WHERE ${SCOPE} AND q.subject_id = $4 AND (q.variant IS NULL OR v.active)
     GROUP BY q.variant, v.sort_order ORDER BY v.sort_order NULLS LAST, q.variant`,
    [...scopeParams(scope), subjectId, scope.userId],
  )
  const named = rows.rows.filter((row) => row.variant !== null).map((row) => ({ name: row.variant as string, count: row.n as number, fresh: row.fresh as number }))
  const auxiliary = rows.rows.find((row) => row.variant === null)?.n ?? 0
  return { variants: named, auxiliary, total: named.reduce((sum, item) => sum + item.count, 0) + auxiliary }
}

/** Temas de uma disciplina (e variante, se houver) com questões para o aluno. Questões sem tema não aparecem aqui: só completam. */
export async function getTopics(scope: StudentScope, subjectId: string, variant: string | null = null): Promise<TopicInfo[]> {
  const rows = await pool.query(
    `SELECT t.id, t.name, count(*)::int AS n, count(*) FILTER (WHERE coalesce(st.times_shown, 0) = 0)::int AS fresh
     FROM questions q JOIN topics t ON t.id = q.topic_id AND t.active
     LEFT JOIN student_question_stats st ON st.user_id = $5 AND st.question_id = q.id
     WHERE ${SCOPE} AND q.subject_id = $4 AND ($6::text IS NULL OR q.variant = $6)
     GROUP BY t.id, t.name, t.sort_order ORDER BY t.sort_order, t.name`,
    [...scopeParams(scope), subjectId, scope.userId, variant],
  )
  return rows.rows.map((row) => ({ id: row.id as string, name: row.name as string, count: row.n as number, fresh: row.fresh as number }))
}

/** Temas em que o aluno mais falha (pelo menos 3 respostas e menos de 60 % de acertos), do mais fraco para o mais forte. */
export async function getWeakTopics(scope: StudentScope, subjectId: string) {
  const rows = await pool.query(
    `SELECT t.id, t.name, sum(st.times_correct)::int AS correct, sum(st.times_correct + st.times_wrong)::int AS answered,
       (SELECT count(*)::int FROM questions q2 WHERE q2.topic_id = t.id AND q2.status = 'publicada') AS available
     FROM student_question_stats st JOIN questions q ON q.id = st.question_id JOIN topics t ON t.id = q.topic_id AND t.active
     WHERE st.user_id = $4 AND q.subject_id = $5 AND ${SCOPE}
     GROUP BY t.id, t.name HAVING sum(st.times_correct + st.times_wrong) >= 3 AND sum(st.times_correct)::float / sum(st.times_correct + st.times_wrong) < 0.6
     ORDER BY sum(st.times_correct)::float / sum(st.times_correct + st.times_wrong), t.name LIMIT 6`,
    [...scopeParams(scope), scope.userId, subjectId],
  )
  return rows.rows.map((row) => ({ id: row.id as string, name: row.name as string, correct: row.correct as number, answered: row.answered as number, accuracy: Math.round(((row.correct as number) / (row.answered as number)) * 100) }))
}

/** Uma disciplina do percurso do aluno (para as páginas explicativas). */
export async function getSubject(scope: StudentScope, subjectId: string) {
  const rows = await pool.query(`SELECT s.id, s.name, count(*)::int AS n FROM questions q JOIN library_subjects s ON s.id = q.subject_id WHERE s.active AND ${SCOPE} AND s.id = $4 GROUP BY s.id, s.name`, [...scopeParams(scope), subjectId])
  const row = rows.rows[0]
  return row ? { id: row.id as string, name: row.name as string, count: row.n as number } : null
}

// ───────────── Começar ─────────────

type PoolRow = { id: string; exam_year: number | null; topic_id: string | null; variant: string | null; difficulty: string; variant_difficulty: string | null; times_shown: number; last_result: 'right' | 'wrong' | null; last_shown_at: Date | null }

/**
 * Monta uma sessão. Regras (SIMULADOR.md, «Lógica única»):
 *  • disciplina e variante escolhidas são respeitadas à letra: uma variante só traz questões dessa variante;
 *  • «todas as variantes» mistura as que têm variante; as sem variante só completam;
 *  • com tema escolhido, só esse tema; questões sem tema só completam quando o tema manda;
 *  • o que o aluno nunca viu vem primeiro, repartido pelos anos; o que errou pode voltar (até 30 %); o que acertou só no fim;
 *  • as questões ficam marcadas como vistas no momento em que a sessão é criada.
 */
export async function startAttempt(scope: StudentScope, mode: AttemptMode, subjectId: string | null, variant: string | null = null, topicId: string | null = null, options: { size?: number; quickSeconds?: number } = {}) {
  const recent = await pool.query(`SELECT count(*)::int AS n FROM attempts WHERE user_id = $1 AND started_at > now() - interval '1 hour'`, [scope.userId])
  if (recent.rows[0].n >= 30) throw new AppError('Começaste muitas sessões seguidas. Espera um pouco e tenta de novo.')

  if (variant) {
    if (!subjectId) throw new AppError('Escolhe a disciplina da variante.')
    const exists = await pool.query(`SELECT 1 FROM subject_variants WHERE subject_id = $1 AND name = $2 AND active`, [subjectId, variant])
    if (!exists.rowCount) throw new AppError('Essa variante já não está disponível. Escolhe outra.')
  }
  if (topicId) {
    const exists = await pool.query(`SELECT 1 FROM topics WHERE id = $1 AND active AND ($2::text IS NULL OR subject_id = $2)`, [topicId, subjectId])
    if (!exists.rowCount) throw new AppError('Esse tema já não está disponível.')
  }

  // «Todas as variantes»: só quando a disciplina tem variantes com questões para este aluno.
  const wantsVariant = !variant && !!subjectId && (await getVariants(scope, subjectId)).variants.length > 0

  const size = options.size ?? (mode === 'pratica' ? PRACTICE_SIZE : ROUND_SIZE)
  const secondsPerQuestion = (options.quickSeconds ?? QUICK_SECONDS_PER_QUESTION) + QUICK_SERVER_MARGIN_SECONDS
  const params = [...scopeParams(scope), scope.userId, subjectId, variant, topicId]
  const poolRows = (
    await pool.query<PoolRow>(
      `SELECT q.id, q.exam_year, q.topic_id, q.variant, q.difficulty, v.difficulty AS variant_difficulty,
         coalesce(st.times_shown, 0)::int AS times_shown, st.last_result, st.last_shown_at
       FROM questions q
       LEFT JOIN subject_variants v ON v.subject_id = q.subject_id AND v.name = q.variant
       LEFT JOIN student_question_stats st ON st.user_id = $4 AND st.question_id = q.id
       WHERE ${SCOPE} AND ($5::text IS NULL OR q.subject_id = $5) AND ($6::text IS NULL OR q.variant = $6) AND ($7::text IS NULL OR q.topic_id = $7)
         ${mode === 'revisao' ? `AND st.last_result = 'wrong'` : ''}`,
      params,
    )
  ).rows
  // Questões ainda sem resposta na sessão anterior do mesmo modo (que vai ser abandonada) contam como «não vistas».
  const releasing = new Set(
    (await pool.query(`SELECT i.question_id FROM attempt_items i JOIN attempts a ON a.id = i.attempt_id WHERE a.user_id = $1 AND a.mode = $2 AND a.status = 'em_curso' AND i.answered_at IS NULL`, [scope.userId, mode])).rows.map((row) => row.question_id as string),
  )
  for (const row of poolRows) if (releasing.has(row.id)) row.times_shown = Math.max(0, row.times_shown - 1)
  const byId = new Map(poolRows.map((row) => [row.id, row]))
  const candidates: Candidate[] = poolRows.map((row) => ({
    id: row.id,
    examYear: row.exam_year,
    topicId: row.topic_id,
    variant: row.variant,
    timesShown: row.times_shown,
    lastResult: row.last_result,
    lastShownAt: row.last_shown_at ? new Date(row.last_shown_at).getTime() : null,
  }))
  // Na revisão, todas as candidatas são erros: sem espera. Quando o tema manda, as sem tema só completam.
  const questionIds = pickQuestions(candidates, { size, wantsVariant, auxiliary: topicId ? 'fill' : 'mixed', retryCooldownMs: mode === 'revisao' ? 0 : undefined, retryShare: mode === 'revisao' ? 1 : undefined })
  if (questionIds.length === 0) {
    throw new AppError(mode === 'revisao' ? 'Não tens erros por rever. Faz uma prática primeiro.' : 'Ainda não há questões para esta escolha. Experimenta outra disciplina, variante ou tema.')
  }

  const optionRows = (await pool.query(`SELECT id, question_id, is_fixed, is_correct FROM question_options WHERE question_id = ANY($1::text[]) ORDER BY question_id, position`, [questionIds])).rows as { id: string; question_id: string; is_fixed: boolean; is_correct: boolean }[]
  const shuffler = new OptionShuffler()
  const attemptId = randomUUID()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // A sessão anterior do mesmo modo é abandonada; o que ficou sem resposta volta a contar como «não visto».
    const previous = await client.query(`UPDATE attempts SET status = 'abandonada', finished_at = now() WHERE user_id = $1 AND mode = $2 AND status = 'em_curso' RETURNING id`, [scope.userId, mode])
    if (previous.rowCount) {
      await client.query(
        `UPDATE student_question_stats st SET times_shown = greatest(st.times_shown - 1, 0)
         FROM attempt_items i WHERE i.attempt_id = ANY($2::text[]) AND i.answered_at IS NULL AND st.user_id = $1 AND st.question_id = i.question_id`,
        [scope.userId, previous.rows.map((row) => row.id)],
      )
    }
    await client.query(
      `INSERT INTO attempts (id, user_id, mode, subject_id, variant, topic_id, total, ends_at) VALUES ($1, $2, $3, $4, $7, $8, $5, CASE WHEN $3 = 'rapido' THEN now() + make_interval(secs => $6::int) END)`,
      [attemptId, scope.userId, mode, subjectId, questionIds.length, questionIds.length * secondsPerQuestion, variant, topicId],
    )
    for (const [position, questionId] of questionIds.entries()) {
      const row = byId.get(questionId)!
      const order = shuffler.order(optionRows.filter((o) => o.question_id === questionId).map((o) => ({ id: o.id, isFixed: o.is_fixed, isCorrect: o.is_correct })))
      const weight = itemWeight(row.difficulty, row.variant_difficulty, row.times_shown)
      await client.query(`INSERT INTO attempt_items (attempt_id, position, question_id, option_order, weight) VALUES ($1, $2, $3, $4::text[], $5)`, [attemptId, position, questionId, order, weight])
    }
    // Marca como vistas (é isto que impede a repetição na próxima sessão, em qualquer modo).
    await client.query(
      `INSERT INTO student_question_stats (user_id, question_id, times_shown, last_shown_at)
       SELECT $1::text, unnest($2::text[]), 1, now()
       ON CONFLICT (user_id, question_id) DO UPDATE SET times_shown = student_question_stats.times_shown + 1, last_shown_at = now()`,
      [scope.userId, questionIds],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  return attemptId
}

// ───────────── Conteúdo de uma tentativa ─────────────

type ItemRow = { position: number; question_id: string; option_order: string[]; answer_option_id: string | null; is_correct: boolean | null; points: number; statement: string; explanation: string | null; subject: string }

const toImage = (row: { url: string; alt_text: string; caption: string | null; width: number | null; height: number | null }): PlayImage => ({
  url: row.url,
  alt: row.alt_text,
  caption: row.caption,
  width: row.width,
  height: row.height,
})

/** `reveal` decide, por questão, se a resposta certa e a explicação seguem para o aluno. */
async function loadContent(attemptId: string, reveal: (row: ItemRow) => boolean, light = false): Promise<PlayItem[]> {
  const rows = (
    await pool.query(
      `SELECT i.position, i.question_id, i.option_order, i.answer_option_id, i.is_correct, i.points::float8 AS points, q.statement, q.explanation, s.name AS subject
       FROM attempt_items i JOIN questions q ON q.id = i.question_id JOIN library_subjects s ON s.id = q.subject_id
       WHERE i.attempt_id = $1 ORDER BY i.position`,
      [attemptId],
    )
  ).rows as ItemRow[]
  const ids = rows.map((row) => row.question_id)
  const [options, media] = await Promise.all([
    pool.query(
      `SELECT o.id, o.question_id, o.body, o.is_correct, m.url, m.alt_text, m.caption, m.width, m.height
       FROM question_options o LEFT JOIN question_media m ON m.id = o.media_id WHERE o.question_id = ANY($1::text[])`,
      [ids],
    ),
    pool.query(
      `SELECT l.question_id, l.usage, m.url, m.alt_text, m.caption, m.width, m.height
       FROM question_media_links l JOIN question_media m ON m.id = l.media_id WHERE l.question_id = ANY($1::text[]) ORDER BY l.position`,
      [ids],
    ),
  ])
  return rows.map((row) => {
    const own = options.rows.filter((o) => o.question_id === row.question_id)
    const byId = new Map(own.map((o) => [o.id as string, o]))
    const images = media.rows.filter((m) => m.question_id === row.question_id)
    const shown = reveal(row)
    const correct = own.find((o) => o.is_correct)
    return {
      position: row.position,
      subject: row.subject,
      statement: row.statement,
      images: images.filter((m) => m.usage === 'statement').map(toImage),
      options: row.option_order.flatMap((id) => {
        const o = byId.get(id)
        return o ? [{ id, body: (o.body as string | null) ?? null, image: o.url ? toImage(o) : null }] : []
      }),
      selectedOptionId: row.answer_option_id,
      // `light` já não é usado: a explicação sai a pedido do aluno, depois de responder, em todos os modos.
      feedback: shown && correct ? { isCorrect: row.is_correct === true, correctOptionId: correct.id as string, explanation: light ? null : row.explanation, images: light ? [] : images.filter((m) => m.usage === 'explanation').map(toImage), points: row.points } : null,
    }
  })
}

export async function loadPlay(userId: string, attemptId: string) {
  const attempt = await getOwned(userId, attemptId)
  if (!attempt) return { state: 'missing' as const }
  if (attempt.status === 'em_curso' && isOverdue(attempt)) {
    await finalize(attemptId, 'expirada')
    attempt.status = 'expirada'
  }
  if (attempt.status === 'abandonada') return { state: 'abandoned' as const }
  if (attempt.status !== 'em_curso') return { state: 'done' as const }
  const subject = attempt.subject_id ? (await pool.query(`SELECT name FROM library_subjects WHERE id = $1`, [attempt.subject_id])).rows[0]?.name ?? null : null
  const items = await loadContent(attemptId, (row) => row.answer_option_id !== null)
  const endsAt = attempt.ends_at ? new Date(attempt.ends_at).getTime() : null
  const secondsPerQuestion = endsAt && attempt.total > 0 ? Math.round((endsAt - new Date(attempt.started_at).getTime()) / 1000 / attempt.total) - QUICK_SERVER_MARGIN_SECONDS : null
  const data: PlayData = { id: attempt.id, mode: attempt.mode, total: attempt.total, subject, variant: attempt.variant, endsAt, secondsPerQuestion, serverNow: Date.now(), items }
  return { state: 'play' as const, data }
}

// ───────────── Responder e entregar ─────────────

async function buildFeedback(questionId: string, chosenOptionId: string, points: number): Promise<PlayFeedback> {
  const [correct, question, media] = await Promise.all([
    pool.query(`SELECT id FROM question_options WHERE question_id = $1 AND is_correct LIMIT 1`, [questionId]),
    pool.query(`SELECT explanation FROM questions WHERE id = $1`, [questionId]),
    pool.query(
      `SELECT m.url, m.alt_text, m.caption, m.width, m.height FROM question_media_links l JOIN question_media m ON m.id = l.media_id
       WHERE l.question_id = $1 AND l.usage = 'explanation' ORDER BY l.position`,
      [questionId],
    ),
  ])
  const correctOptionId = correct.rows[0].id as string
  return { isCorrect: correctOptionId === chosenOptionId, correctOptionId, explanation: (question.rows[0]?.explanation as string | null) ?? null, images: media.rows.map(toImage), points }
}

export async function submitAnswer(userId: string, attemptId: string, position: number, optionId: string): Promise<{ feedback: PlayFeedback | null }> {
  const attempt = await getOwned(userId, attemptId)
  if (!attempt) throw new AppError('Sessão não encontrada.')
  if (attempt.status !== 'em_curso') throw new AppError('Esta sessão já terminou.')
  if (isOverdue(attempt)) {
    await finalize(attemptId, 'expirada')
    throw new TimeUpError('O tempo acabou. A tua prova foi entregue com o que tinhas respondido.')
  }
  const item = (await pool.query(`SELECT question_id, option_order FROM attempt_items WHERE attempt_id = $1 AND position = $2`, [attemptId, position])).rows[0]
  if (!item || !(item.option_order as string[]).includes(optionId)) throw new AppError('Resposta inválida. Recarrega a página e tenta de novo.')

  // A primeira resposta conta e fica fechada (todos os modos). Pontos = peso da questão nesta sessão, só se acertar.
  const saved = await pool.query(
    `UPDATE attempt_items SET answer_option_id = $3, is_correct = (SELECT is_correct FROM question_options WHERE id = $3), answered_at = now(),
       points = CASE WHEN (SELECT is_correct FROM question_options WHERE id = $3) THEN weight ELSE 0 END
     WHERE attempt_id = $1 AND position = $2 AND answer_option_id IS NULL RETURNING is_correct`,
    [attemptId, position, optionId],
  )
  if (saved.rowCount) {
    const right = saved.rows[0].is_correct === true
    await pool.query(
      `INSERT INTO student_question_stats (user_id, question_id, times_shown, times_correct, times_wrong, last_result, last_shown_at, last_answered_at)
       VALUES ($1, $2, 1, $3, $4, $5, now(), now())
       ON CONFLICT (user_id, question_id) DO UPDATE SET times_correct = student_question_stats.times_correct + $3, times_wrong = student_question_stats.times_wrong + $4,
         last_result = $5, last_answered_at = now()`,
      [userId, item.question_id, right ? 1 : 0, right ? 0 : 1, right ? 'right' : 'wrong'],
    )
  }
  const stored = (await pool.query(`SELECT answer_option_id, points::float8 AS points FROM attempt_items WHERE attempt_id = $1 AND position = $2`, [attemptId, position])).rows[0]
  return { feedback: await buildFeedback(item.question_id as string, stored.answer_option_id as string, Number(stored.points)) }
}

export async function finishAttempt(userId: string, attemptId: string) {
  const attempt = await getOwned(userId, attemptId)
  if (!attempt) throw new AppError('Sessão não encontrada.')
  if (attempt.status !== 'em_curso') return
  await finalize(attemptId, isOverdue(attempt) ? 'expirada' : 'concluida')
}

// ───────────── Resultado e histórico ─────────────

export async function getResult(userId: string, attemptId: string) {
  const attempt = await getOwned(userId, attemptId)
  if (!attempt || attempt.status === 'em_curso' || attempt.status === 'abandonada') return null
  const items = await loadContent(attemptId, () => true)
  const subject = attempt.subject_id ? (await pool.query(`SELECT name FROM library_subjects WHERE id = $1`, [attempt.subject_id])).rows[0]?.name ?? null : null
  const grouped = new Map<string, { subject: string; total: number; correct: number }>()
  for (const item of items) {
    const entry = grouped.get(item.subject) ?? { subject: item.subject, total: 0, correct: 0 }
    entry.total += 1
    if (item.feedback?.isCorrect) entry.correct += 1
    grouped.set(item.subject, entry)
  }
  const end = attempt.finished_at ? new Date(attempt.finished_at).getTime() : Date.now()
  const weights = (await pool.query(`SELECT weight::float8 AS weight, coalesce(is_correct, false) AS correct FROM attempt_items WHERE attempt_id = $1`, [attemptId])).rows as { weight: number; correct: boolean }[]
  return {
    id: attempt.id,
    mode: attempt.mode,
    subjectId: attempt.subject_id,
    subject: subject as string | null,
    variant: attempt.variant,
    topicId: attempt.topic_id,
    grade: gradeOutOf20(weights),
    points: Math.round(items.reduce((sum, item) => sum + (item.feedback?.points ?? 0), 0) * 10) / 10,
    total: attempt.total,
    correct: attempt.correct,
    timedOut: attempt.status === 'expirada',
    seconds: Math.max(0, Math.round((end - new Date(attempt.started_at).getTime()) / 1000)),
    bySubject: [...grouped.values()],
    items,
  }
}

export async function getHistory(userId: string) {
  await closeExpired(userId)
  const [rows, open] = await Promise.all([
    pool.query(
      `SELECT a.id, a.mode, a.total, a.correct, a.finished_at, s.name AS subject, a.variant,
         (SELECT CASE WHEN sum(i.weight) > 0 THEN round((20 * coalesce(sum(i.weight) FILTER (WHERE i.is_correct), 0) / sum(i.weight))::numeric, 1) END FROM attempt_items i WHERE i.attempt_id = a.id)::float8 AS grade
       FROM attempts a LEFT JOIN library_subjects s ON s.id = a.subject_id
       WHERE a.user_id = $1 AND a.status IN ('concluida','expirada') ORDER BY a.finished_at DESC LIMIT 60`,
      [userId],
    ),
    pool.query(`SELECT id, mode FROM attempts WHERE user_id = $1 AND status = 'em_curso' ORDER BY started_at DESC`, [userId]),
  ])
  return {
    entries: rows.rows.map((row) => ({ id: row.id as string, mode: row.mode as AttemptMode, total: row.total as number, correct: row.correct as number, subject: (row.subject as string | null) ?? null, variant: (row.variant as string | null) ?? null, grade: row.grade === null ? null : Number(row.grade), finishedAt: new Date(row.finished_at).toISOString() })),
    open: open.rows.map((row) => ({ id: row.id as string, mode: row.mode as AttemptMode })),
  }
}
