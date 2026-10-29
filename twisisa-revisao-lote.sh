#!/usr/bin/env bash
# twisisa-revisao-lote.sh — Banco de questões: revisão e publicação em lote.
#
#   1. Rascunhos: faixa de revisão com progresso («7 de 12 revistas»).
#   2. «Marcar todas como revistas» (ou só as selecionadas) confirma a resposta de uma vez; logo a seguir aparece «Publicar revistas».
#   3. «Publicar» pergunta «Já verificaste as questões?»: «Sim, publicar» ou «Não, voltar».
#   4. Fim das checkboxes sempre abertas: só aparecem em «Selecionar». Fora disso, cada rascunho mostra se está por rever ou revisto.
#   5. Menu ⋯ de cada rascunho: «Marcar como revista» / «Voltar a por rever».
#   6. Publicar em lote publica as válidas e deixa em rascunho as que têm problemas (a mensagem lista-as).
#   7. A revisão também pode usar o lote (publicar, arquivar, restaurar); eliminar continua só do admin.
#
# Sem migrações. Corre na raiz do projeto:  bash twisisa-revisao-lote.sh
# Faz backup dos 4 ficheiros em .backup-revisao-lote/ e só faz commit/push se o build passar.
set -euo pipefail

if [ ! -f package.json ] || [ ! -d app/admin/questoes ] || [ ! -d components/admin ] || [ ! -d lib ]; then
  echo "ERRO: corre este script na raiz do projeto twisisa (onde está o package.json)." >&2
  exit 1
fi

FILES="lib/questions.ts app/admin/questoes/actions.ts app/admin/questoes/page.tsx components/admin/question-bulk-form.tsx"
for f in lib/questions.ts app/admin/questoes/actions.ts app/admin/questoes/page.tsx; do
  [ -f "$f" ] || { echo "ERRO: falta $f." >&2; exit 1; }
done

BACKUP=".backup-revisao-lote"
mkdir -p "$BACKUP"
for f in $FILES; do
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp "$f" "$BACKUP/$f"
  fi
done
echo "Backup em $BACKUP/"

mkdir -p "lib"
cat > "lib/questions.ts" <<'TWISISA_EOF'
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

/** Rascunhos por rever (resposta ainda «sugestão») e já revistos (resposta confirmada ou gabarito oficial), com a mesma pesquisa da lista. */
export type ReviewCounts = { pending: number; revised: number }

function draftSearch(term: string) {
  const like = term ? `%${term.replace(/[\\%_]/g, '\\$&')}%` : null
  const from = `FROM questions q
    JOIN library_subjects s ON s.id = q.subject_id
    LEFT JOIN topics t ON t.id = q.topic_id
    WHERE q.status = 'rascunho' AND ($1::text IS NULL OR ${NORMALIZED('q.statement')} LIKE $1 OR ${NORMALIZED('s.name')} LIKE $1 OR ${NORMALIZED("coalesce(t.name, '')")} LIKE $1)`
  return { like, from }
}

export async function countDraftReview(term: string): Promise<ReviewCounts> {
  const { like, from } = draftSearch(term)
  const result = await pool.query(
    `SELECT count(*) FILTER (WHERE q.answer_source = 'sugestao')::int AS pending, count(*) FILTER (WHERE q.answer_source <> 'sugestao')::int AS revised ${from}`,
    [like],
  )
  return { pending: result.rows[0].pending as number, revised: result.rows[0].revised as number }
}

/** Ids dos rascunhos por rever (`pending`) ou já revistos (`revised`) que correspondem à pesquisa. */
export async function listDraftIdsByReview(review: 'pending' | 'revised', term: string, limit: number): Promise<string[]> {
  const { like, from } = draftSearch(term)
  const condition = review === 'pending' ? `q.answer_source = 'sugestao'` : `q.answer_source <> 'sugestao'`
  const result = await pool.query(`SELECT q.id ${from} AND ${condition} ORDER BY q.updated_at DESC, q.id LIMIT ${Math.floor(limit)}`, [like])
  return result.rows.map((row) => row.id as string)
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
TWISISA_EOF
echo "Escrito: lib/questions.ts"

mkdir -p "app/admin/questoes"
cat > "app/admin/questoes/actions.ts" <<'TWISISA_EOF'
'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import type { PoolClient } from 'pg'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { getStaffAccess } from '@/lib/staff'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { parseCsv } from '@/lib/csv'
import { CSV_EXAMPLE_MARK } from '@/lib/question-csv-template'
import { finishDraft } from '@/lib/question-drafts'
import { ANSWER_SOURCES, DIFFICULTIES, ORIGINS, listDraftIdsByReview, optionsProblem, subjectHasScope, type OptionInput } from '@/lib/questions'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

// Revisão: o admin e os revisores convidados (só editar, publicar e arquivar; tudo o resto fica com requireAdmin).
async function requireReviewer() {
  const access = await getStaffAccess()
  if (!access) throw new AppError('Acesso reservado à equipa.')
  return access.user
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim()
const isOneOf = (list: readonly { value: string }[], value: string) => list.some((item) => item.value === value)

function refresh() {
  revalidatePath('/admin/questoes')
  revalidatePath('/admin')
  revalidatePath('/aluno/simulador')
}

// ---------- Validação partilhada (formulário e importação) ----------

/** Disciplina ativa, presente no âmbito escolhido; tema da disciplina; instituição ativa (só na admissão). */
// `publishing`: ao publicar, uma disciplina que tem variantes exige que a questão tenha uma (o tema continua opcional).
async function assertClassification(client: Pick<PoolClient, 'query'>, c: { subjectId: string; track: string; institutionId: string | null; topicId: string | null; variant: string | null; publishing: boolean; currentVariant?: string | null }) {
  const subject = await client.query('SELECT 1 FROM library_subjects WHERE id = $1 AND active = true', [c.subjectId])
  if (!subject.rowCount) throw new AppError('A disciplina não existe ou está arquivada.')
  if (c.track === 'admissao') {
    if (!c.institutionId) throw new AppError('Escolhe a instituição da admissão.')
    const institution = await client.query('SELECT 1 FROM institutions WHERE id = $1 AND active = true', [c.institutionId])
    if (!institution.rowCount) throw new AppError('A instituição não existe ou está inativa.')
  } else if (c.track !== '10' && c.track !== '12') {
    throw new AppError('Escolhe para quem é a questão.')
  } else if (c.institutionId) {
    throw new AppError('A instituição só se aplica à admissão.')
  }
  if (!(await subjectHasScope(c.subjectId, c.track, c.institutionId))) {
    throw new AppError('A disciplina não existe neste âmbito. Ajusta-o em Disciplinas.')
  }
  if (c.topicId) {
    const topic = await client.query('SELECT 1 FROM topics WHERE id = $1 AND subject_id = $2 AND active = true', [c.topicId, c.subjectId])
    if (!topic.rowCount) throw new AppError('O tema não pertence à disciplina ou está arquivado.')
  }
  if (c.variant) {
    const variant = await client.query('SELECT active FROM subject_variants WHERE subject_id = $1 AND name = $2', [c.subjectId, c.variant])
    if (!variant.rowCount) throw new AppError('A variante não existe nesta disciplina. Cria-a em Variantes.')
    if (!variant.rows[0].active && c.variant !== c.currentVariant) throw new AppError('A variante está arquivada.')
  } else if (c.publishing) {
    const has = await client.query('SELECT 1 FROM subject_variants WHERE subject_id = $1 AND active LIMIT 1', [c.subjectId])
    if (has.rowCount) throw new AppError('Esta disciplina tem variantes: escolhe a variante da questão antes de publicar.')
  }
}

async function writeOptions(client: Pick<PoolClient, 'query'>, questionId: string, options: OptionInput[]) {
  for (let position = 0; position < options.length; position += 1) {
    const option = options[position]
    await client.query('INSERT INTO question_options (id, question_id, position, body, is_correct, is_fixed) VALUES ($1, $2, $3, $4, $5, $6)', [
      `option-${randomUUID()}`,
      questionId,
      position,
      option.body,
      option.isCorrect,
      option.isFixed,
    ])
  }
}

const isConfirmed = (source: string) => source === 'oficial' || source === 'confirmada'
const sameOptions = (a: OptionInput[], b: OptionInput[]) => JSON.stringify(a.map((o) => [o.body, o.isCorrect, o.isFixed])) === JSON.stringify(b.map((o) => [o.body, o.isCorrect, o.isFixed]))

// ---------- Criar e editar ----------

// `intent`: draft (guardar rascunho), publish (publicar) ou keep (guardar uma questão que já existe, sem mudar o estado).
// Regras: 2 a 5 opções com uma só correta; para publicar a resposta tem de estar confirmada (ou ser gabarito oficial).
// Mudar o enunciado ou as opções de uma questão PUBLICADA cria uma nova versão e arquiva a anterior, que fica intacta.
export async function saveQuestion(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const id = text(formData, 'id')
    // Criar questões é do admin; editar uma existente também é da revisão.
    const admin = id ? await requireReviewer() : await requireAdmin()
    const draftId = text(formData, 'draftId')
    const intent = text(formData, 'intent')
    if (!['draft', 'publish', 'keep'].includes(intent)) throw new AppError('Pedido inválido.')

    const statement = text(formData, 'statement')
    const explanation = text(formData, 'explanation') || null
    const track = text(formData, 'track')
    const institutionId = text(formData, 'institutionId') || null
    const subjectId = text(formData, 'subjectId')
    const topicId = text(formData, 'topicId') || null
    const difficulty = text(formData, 'difficulty') || 'media'
    const origin = text(formData, 'origin') || 'admin'
    const answerSource = text(formData, 'answerSource') || 'confirmada'
    const originLabel = text(formData, 'originLabel') || null
    const variant = text(formData, 'variant') || null
    const yearText = text(formData, 'year')
    const year = yearText ? Number(yearText) : null

    if (statement.length < 3 || statement.length > 12000) throw new AppError('O enunciado deve ter entre 3 e 12 000 caracteres.')
    if (explanation && explanation.length > 4000) throw new AppError('A explicação é demasiado longa (máximo 4000 caracteres).')
    if (originLabel && originLabel.length > 160) throw new AppError('A origem é demasiado longa.')
    if (!subjectId) throw new AppError('Escolhe a disciplina.')
    if (!isOneOf(DIFFICULTIES, difficulty) || !isOneOf(ORIGINS, origin) || !isOneOf(ANSWER_SOURCES, answerSource)) throw new AppError('Um dos campos de classificação é inválido.')
    if (year !== null && (!Number.isInteger(year) || year < 1990 || year > 2100)) throw new AppError('Ano inválido.')

    const correctIndex = Number.parseInt(text(formData, 'correct'), 10)
    const fixed = new Set(formData.getAll('fixed').map((value) => Number(value)))
    const options: OptionInput[] = formData
      .getAll('option')
      .map((value, index) => ({ body: String(value).trim().slice(0, 2000), isCorrect: index === correctIndex, isFixed: fixed.has(index) }))
      .filter((option) => option.body)
    const problem = optionsProblem(options)
    if (problem) throw new AppError(problem)

    const client = await pool.connect()
    let savedId = id
    let message = ''
    try {
      await client.query('BEGIN')
      const existing = id ? (await client.query('SELECT * FROM questions WHERE id = $1 FOR UPDATE', [id])).rows[0] : null
      if (id && !existing) throw new AppError('Questão não encontrada.')

      const status = intent === 'publish' ? 'publicada' : existing ? existing.status : 'rascunho'
      await assertClassification(client, { subjectId, track, institutionId, topicId, variant, publishing: status === 'publicada', currentVariant: existing?.variant ?? null })
      if (status === 'publicada' && !isConfirmed(answerSource)) throw new AppError('Antes de publicar, confirma a resposta ou assinala o gabarito oficial.')
      const oldOptions = existing ? (await client.query('SELECT body, is_correct, is_fixed, media_id FROM question_options WHERE question_id = $1 ORDER BY position', [id])).rows : []
      // Enquanto o editor não suportar imagens nas opções, não se reescreve uma questão que as tenha (perderia as imagens).
      if (oldOptions.some((option) => option.media_id)) throw new AppError('Esta questão tem imagens nas opções. A edição fica disponível com o suporte a imagens.')
      const contentChanged = !!existing && (existing.statement !== statement || !sameOptions(oldOptions.map((o) => ({ body: o.body ?? '', isCorrect: o.is_correct, isFixed: o.is_fixed })), options))
      const confirmedNow = isConfirmed(answerSource)

      if (existing && existing.status === 'publicada' && contentChanged) {
        // Nova versão; a anterior fica arquivada e intacta para o histórico.
        savedId = `question-${randomUUID()}`
        await client.query(`UPDATE questions SET status = 'arquivada', updated_by = $2, updated_at = now() WHERE id = $1`, [id, admin.id])
        await client.query(
          `INSERT INTO questions (id, version, previous_version_id, statement, explanation, track, institution_id, subject_id, topic_id, difficulty, exam_year, origin_label, origin,
             answer_source, answer_confirmed_by, answer_confirmed_at, status, created_by, updated_by, variant)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
             CASE WHEN $15 THEN $16 END, CASE WHEN $15 THEN now() END, 'publicada', $16, $16, $17)`,
          [savedId, existing.version + 1, id, statement, explanation, track, institutionId, subjectId, topicId, difficulty, year, originLabel, origin, answerSource, confirmedNow, admin.id, variant],
        )
        await client.query('INSERT INTO question_media_links (question_id, media_id, usage, position) SELECT $1, media_id, usage, position FROM question_media_links WHERE question_id = $2', [savedId, id])
        await writeOptions(client, savedId, options)
        message = 'Nova versão publicada. A anterior ficou arquivada.'
      } else if (existing) {
        const sourceChanged = existing.answer_source !== answerSource
        await client.query(
          `UPDATE questions SET statement = $2, explanation = $3, track = $4, institution_id = $5, subject_id = $6, topic_id = $7, difficulty = $8, exam_year = $9,
             origin_label = $10, origin = $11, answer_source = $12, status = $13, updated_by = $14, updated_at = now(),
             answer_confirmed_by = CASE WHEN NOT $15 THEN NULL WHEN $16 THEN $14 ELSE answer_confirmed_by END,
             answer_confirmed_at = CASE WHEN NOT $15 THEN NULL WHEN $16 THEN now() ELSE answer_confirmed_at END,
             variant = $17
           WHERE id = $1`,
          [id, statement, explanation, track, institutionId, subjectId, topicId, difficulty, year, originLabel, origin, answerSource, status, admin.id, confirmedNow, sourceChanged || contentChanged, variant],
        )
        await client.query('DELETE FROM question_options WHERE question_id = $1', [id])
        await writeOptions(client, id, options)
        message = intent === 'publish' ? 'Questão publicada.' : 'Alterações guardadas.'
      } else {
        savedId = `question-${randomUUID()}`
        await client.query(
          `INSERT INTO questions (id, statement, explanation, track, institution_id, subject_id, topic_id, difficulty, exam_year, origin_label, origin, answer_source,
             answer_confirmed_by, answer_confirmed_at, status, created_by, updated_by, variant)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CASE WHEN $13 THEN $14 END, CASE WHEN $13 THEN now() END, $15, $14, $14, $16)`,
          [savedId, statement, explanation, track, institutionId, subjectId, topicId, difficulty, year, originLabel, origin, answerSource, confirmedNow, admin.id, status, variant],
        )
        await writeOptions(client, savedId, options)
        message = status === 'publicada' ? 'Questão publicada.' : 'Rascunho guardado.'
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    // A questão já existe como rascunho/publicada: o trabalho em curso (guardado automaticamente) deixa de estar por concluir.
    // Se isto falhar, a questão está guardada na mesma; só ficaria uma entrada em «Por concluir», que se descarta.
    if (draftId && !id) {
      try {
        await finishDraft(admin.id, draftId)
      } catch (error) {
        console.error('[ADMIN QUESTOES] não foi possível fechar o rascunho em curso', error)
      }
    }
    await logAdminAction(admin, id ? 'question.update' : 'question.create', 'question', savedId, { intent, subjectId, track })
    refresh()
    return message
  }, 'Não foi possível guardar a questão. Confirma os campos e tenta novamente.')
}

// Descarta uma questão «por concluir» (o que ficou guardado automaticamente no editor). Não toca no banco de questões.
export async function discardQuestionDraft(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    if (!id) throw new AppError('Pedido inválido.')
    await finishDraft(admin.id, id)
    revalidatePath('/admin/questoes')
    return 'Questão por concluir descartada.'
  }, 'Não foi possível descartar. Tenta novamente.')
}

// ---------- Estado, duplicar, eliminar ----------

// rascunho → publicada (com as regras de publicação), publicada → arquivada, arquivada → rascunho.
export async function setQuestionStatus(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireReviewer()
    const id = text(formData, 'id')
    const to = text(formData, 'to')
    const found = await pool.query('SELECT * FROM questions WHERE id = $1', [id])
    if (!found.rowCount) throw new AppError('Questão não encontrada.')
    const question = found.rows[0]

    if (to === 'publicada' && question.status === 'rascunho') {
      const options = await pool.query('SELECT body, is_correct, is_fixed FROM question_options WHERE question_id = $1 ORDER BY position', [id])
      const problem = optionsProblem(options.rows.map((o) => ({ body: o.body ?? '', isCorrect: o.is_correct, isFixed: o.is_fixed })))
      if (problem) throw new AppError(problem)
      if (!isConfirmed(question.answer_source)) throw new AppError('Antes de publicar, marca a questão como revista (menu ⋯) ou confirma a resposta ao editá-la.')
      await assertClassification(pool, { subjectId: question.subject_id, track: question.track, institutionId: question.institution_id, topicId: question.topic_id, variant: question.variant ?? null, publishing: true, currentVariant: question.variant ?? null })
    } else if (!((to === 'arquivada' && question.status === 'publicada') || (to === 'rascunho' && question.status === 'arquivada'))) {
      throw new AppError('Essa mudança de estado não é permitida.')
    }
    await pool.query('UPDATE questions SET status = $2, updated_by = $3, updated_at = now() WHERE id = $1', [id, to, admin.id])
    await logAdminAction(admin, `question.${to}`, 'question', id)
    refresh()
    return to === 'publicada' ? 'Questão publicada.' : to === 'arquivada' ? 'Questão arquivada. O histórico fica preservado.' : 'Questão restaurada como rascunho.'
  }, 'Não foi possível mudar o estado. Tenta novamente.')
}

export async function duplicateQuestion(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const newId = `question-${randomUUID()}`
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const copied = await client.query(
        `INSERT INTO questions (id, statement, explanation, track, institution_id, subject_id, topic_id, difficulty, exam_year, origin_label, origin, answer_source,
           answer_confirmed_by, answer_confirmed_at, status, created_by, updated_by, variant)
         SELECT $2, statement, explanation, track, institution_id, subject_id, topic_id, difficulty, exam_year, origin_label, origin, answer_source,
           answer_confirmed_by, answer_confirmed_at, 'rascunho', $3, $3, variant FROM questions WHERE id = $1 RETURNING id`,
        [id, newId, admin.id],
      )
      if (!copied.rowCount) throw new AppError('Questão não encontrada.')
      await client.query(
        `INSERT INTO question_options (id, question_id, position, body, media_id, is_correct, is_fixed)
         SELECT 'option-' || gen_random_uuid(), $2, position, body, media_id, is_correct, is_fixed FROM question_options WHERE question_id = $1`,
        [id, newId],
      )
      await client.query('INSERT INTO question_media_links (question_id, media_id, usage, position) SELECT $2, media_id, usage, position FROM question_media_links WHERE question_id = $1', [id, newId])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    await logAdminAction(admin, 'question.duplicate', 'question', newId, { from: id })
    refresh()
    return 'Duplicada como rascunho.'
  }, 'Não foi possível duplicar. Tenta novamente.')
}

// Só rascunhos se eliminam. Questões publicadas nunca se apagam: arquivam-se.
export async function deleteQuestion(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const draft = await client.query(`SELECT 1 FROM questions WHERE id = $1 AND status = 'rascunho' FOR UPDATE`, [id])
      if (!draft.rowCount) throw new AppError('Só se eliminam rascunhos. As questões publicadas arquivam-se.')
      await client.query('DELETE FROM question_media_links WHERE question_id = $1', [id])
      await client.query('DELETE FROM question_options WHERE question_id = $1', [id])
      await client.query('DELETE FROM questions WHERE id = $1', [id])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    await logAdminAction(admin, 'question.delete', 'question', id)
    refresh()
    return 'Rascunho eliminado.'
  }, 'Não foi possível eliminar. Tenta novamente.')
}

// ---------- Importação CSV (tudo ou nada) ----------

const REQUIRED_COLUMNS = ['statement', 'subject_name', 'track', 'option_a', 'option_b', 'correct']
const LETTERS = ['a', 'b', 'c', 'd', 'e']

// Colunas: statement, subject_name, track (10, 12 ou admissao), option_a…option_e, correct (A a E), e opcionais:
// institution (sigla) ou institution_id (obrigatório na admissão), variant (nome de uma variante da disciplina), topic_name, difficulty, year, origin_label, explanation.
// Valida tudo antes de guardar; qualquer erro cancela o lote. Tudo entra como rascunho com a resposta «por confirmar».
export async function importQuestionsCsv(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const file = formData.get('csv')
    if (!(file instanceof File) || file.size === 0) throw new AppError('Escolhe um ficheiro CSV.')
    if (file.size > 2 * 1024 * 1024) throw new AppError('O CSV não pode ultrapassar 2 MB.')

    let rows: string[][]
    try {
      rows = parseCsv((await file.text()).replace(/^\uFEFF/, ''))
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : 'CSV inválido.')
    }
    if (rows.length < 2) throw new AppError('O CSV não contém questões.')
    if (rows.length > 501) throw new AppError('Importa no máximo 500 questões por ficheiro.')
    const headers = rows[0].map((header) => header.toLowerCase())
    const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column))
    if (missing.length) throw new AppError(`Faltam colunas obrigatórias: ${missing.join(', ')}.`)

    const errors: string[] = []
    const fail = (line: number, message: string) => errors.push(`Linha ${line}: ${message}`)
    const parsed = rows.slice(1).map((values, index) => {
      const line = index + 2
      const record: Record<string, string> = {}
      headers.forEach((header, column) => { record[header] = values[column] ?? '' })
      const correct = record.correct.toUpperCase()
      const options: OptionInput[] = LETTERS.map((letter) => ({ body: record[`option_${letter}`] ?? '', isCorrect: correct === letter.toUpperCase(), isFixed: false })).filter((option) => option.body)
      const difficulty = record.difficulty || 'media'
      if (record.statement.toUpperCase().startsWith(CSV_EXAMPLE_MARK)) fail(line, `linha de exemplo do modelo (${CSV_EXAMPLE_MARK}). Apaga-a ou substitui-a pela tua questão.`)
      else if (record.statement.length < 3) fail(line, 'enunciado vazio ou demasiado curto.')
      if (!record.subject_name) fail(line, 'subject_name é obrigatório.')
      if (!['10', '12', 'admissao'].includes(record.track)) fail(line, 'track deve ser 10, 12 ou admissao.')
      if (!LETTERS.includes(correct.toLowerCase())) fail(line, 'correct deve ser uma letra de A a E.')
      else if (optionsProblem(options)) fail(line, optionsProblem(options) as string)
      if (!isOneOf(DIFFICULTIES, difficulty)) fail(line, 'difficulty deve ser facil, media ou dificil.')
      return { line, record, options, difficulty }
    })
    if (errors.length) throw new AppError(summarize(errors))

    const client = await pool.connect()
    let count = 0
    try {
      await client.query('BEGIN')
      for (const { line, record, options, difficulty } of parsed) {
        const subject = await client.query('SELECT id FROM library_subjects WHERE lower(name) = lower($1) AND active = true LIMIT 1', [record.subject_name])
        if (!subject.rowCount) { fail(line, `disciplina “${record.subject_name}” não encontrada.`); continue }
        const subjectId = subject.rows[0].id as string

        let institutionId: string | null = null
        if (record.track === 'admissao') {
          const ref = record.institution_id || record.institution
          const institution = ref ? await client.query('SELECT id FROM institutions WHERE active = true AND (id = $1 OR lower(short_name) = lower($1)) LIMIT 1', [ref]) : null
          if (!institution?.rowCount) { fail(line, 'na admissão indica a instituição (institution) com a sigla ou o id de uma instituição ativa.'); continue }
          institutionId = institution.rows[0].id as string
        }
        if (!(await subjectHasScope(subjectId, record.track, institutionId))) { fail(line, 'a disciplina não existe neste percurso/instituição.'); continue }

        let topicId: string | null = null
        if (record.topic_name) {
          const topic = await client.query('SELECT id FROM topics WHERE subject_id = $1 AND lower(name) = lower($2) AND active = true LIMIT 1', [subjectId, record.topic_name])
          if (!topic.rowCount) { fail(line, `tema “${record.topic_name}” não encontrado nesta disciplina.`); continue }
          topicId = topic.rows[0].id as string
        }
        let variant: string | null = null
        if (record.variant) {
          const found = await client.query('SELECT name FROM subject_variants WHERE subject_id = $1 AND lower(name) = lower($2) AND active LIMIT 1', [subjectId, record.variant])
          if (!found.rowCount) { fail(line, `variante “${record.variant}” não encontrada nesta disciplina (cria-a em Variantes).`); continue }
          variant = found.rows[0].name as string
        }
        const year = record.year ? Number(record.year) : null
        if (year !== null && (!Number.isInteger(year) || year < 1990 || year > 2100)) { fail(line, 'ano inválido.'); continue }

        const id = `question-${randomUUID()}`
        await client.query(
          `INSERT INTO questions (id, statement, explanation, track, institution_id, subject_id, topic_id, variant, difficulty, exam_year, origin_label, origin, answer_source, status, created_by, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'admin', 'sugestao', 'rascunho', $12, $12)`,
          [id, record.statement, record.explanation || null, record.track, institutionId, subjectId, topicId, variant, difficulty, year, record.origin_label || null, admin.id],
        )
        await writeOptions(client, id, options)
        count += 1
      }
      if (errors.length) throw new AppError(summarize(errors))
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    await logAdminAction(admin, 'question.csv_import', 'question', null, { count })
    refresh()
    return `${count} ${count === 1 ? 'questão importada' : 'questões importadas'} como rascunho. Confirma a resposta de cada uma antes de publicar.`
  }, 'Não foi possível importar o CSV. Confirma o formato e tenta novamente.')
}

function summarize(errors: string[]) {
  return `Importação cancelada; nada foi guardado. ${errors.slice(0, 6).join(' ')}${errors.length > 6 ? ` (+${errors.length - 6} erros).` : ''}`
}

// ---------- Operações em lote ----------

const BULK_LIMIT = 500
const plainSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().slice(0, 100)

// Revisão e publicação em lote.
//   revista    rascunho «por rever» → resposta confirmada (o revisor declara que verificou a opção certa)
//   por_rever  rascunho revisto → volta a «por rever»
//   publicada  rascunho revisto → publicado; as que tiverem problemas ficam em rascunho e vêm listadas na resposta
//   arquivada / rascunho (restaurar) / eliminar: como antes
// As questões vêm por `id` (seleção) ou por `scope` (`por-rever` | `revistas`), que apanha todas as que correspondem à pesquisa `q`.
// Eliminar é só do admin; o resto é também da revisão (o mesmo que já podiam fazer uma a uma).
export async function bulkManageQuestions(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const mode = text(formData, 'mode')
    if (!['revista', 'por_rever', 'publicada', 'arquivada', 'rascunho', 'eliminar'].includes(mode)) throw new AppError('Operação inválida.')
    const admin = mode === 'eliminar' ? await requireAdmin() : await requireReviewer()

    let ids = [...new Set(formData.getAll('id').map((value) => String(value).trim()).filter(Boolean))]
    const byScope = ids.length === 0
    let more = false
    if (byScope) {
      const scope = text(formData, 'scope')
      if (scope !== 'por-rever' && scope !== 'revistas') throw new AppError('Seleciona pelo menos uma questão.')
      ids = await listDraftIdsByReview(scope === 'por-rever' ? 'pending' : 'revised', plainSearch(text(formData, 'q')), BULK_LIMIT + 1)
      if (ids.length > BULK_LIMIT) { ids = ids.slice(0, BULK_LIMIT); more = true }
      if (!ids.length) throw new AppError(scope === 'por-rever' ? 'Não há questões por rever.' : 'Não há questões revistas para publicar.')
    }
    if (ids.length > BULK_LIMIT) throw new AppError(`Podes selecionar no máximo ${BULK_LIMIT} questões de cada vez.`)
    const rest = more ? ' Ainda há mais: repete a operação para continuar.' : ''

    const found = await pool.query('SELECT * FROM questions WHERE id = ANY($1::text[])', [ids])
    if (!byScope && found.rows.length !== ids.length) throw new AppError('Uma ou mais questões já não existem. Atualiza a lista e tenta novamente.')

    if (mode === 'revista') {
      const changed = await pool.query(
        `UPDATE questions SET answer_source = 'confirmada', answer_confirmed_by = $1, answer_confirmed_at = now(), updated_by = $1, updated_at = now()
         WHERE id = ANY($2::text[]) AND status = 'rascunho' AND answer_source = 'sugestao' RETURNING id`,
        [admin.id, ids],
      )
      if (!changed.rowCount) throw new AppError('Estas questões já estavam revistas.')
      for (const row of changed.rows) await logAdminAction(admin, 'question.review', 'question', row.id)
      refresh()
      return `${changed.rowCount} ${changed.rowCount === 1 ? 'questão marcada como revista' : 'questões marcadas como revistas'}.${rest}`
    }

    if (mode === 'por_rever') {
      const changed = await pool.query(
        `UPDATE questions SET answer_source = 'sugestao', answer_confirmed_by = NULL, answer_confirmed_at = NULL, updated_by = $1, updated_at = now()
         WHERE id = ANY($2::text[]) AND status = 'rascunho' AND answer_source = 'confirmada' RETURNING id`,
        [admin.id, ids],
      )
      if (!changed.rowCount) throw new AppError('Só se pode tirar a revisão a rascunhos marcados como revistos (o gabarito oficial não muda).')
      for (const row of changed.rows) await logAdminAction(admin, 'question.unreview', 'question', row.id)
      refresh()
      return `${changed.rowCount} ${changed.rowCount === 1 ? 'questão voltou' : 'questões voltaram'} a «por rever».`
    }

    if (mode === 'publicada') {
      const optionRows = await pool.query('SELECT question_id, body, is_correct, is_fixed FROM question_options WHERE question_id = ANY($1::text[]) ORDER BY question_id, position', [ids])
      const optionsOf = new Map<string, OptionInput[]>()
      for (const row of optionRows.rows) {
        const list = optionsOf.get(row.question_id) ?? []
        list.push({ body: row.body ?? '', isCorrect: row.is_correct, isFixed: row.is_fixed })
        optionsOf.set(row.question_id, list)
      }
      // Muitas questões partilham a mesma classificação: valida-se uma vez por combinação.
      const classification = new Map<string, Promise<string | null>>()
      const checkClassification = (q: Record<string, string | null>) => {
        const key = [q.subject_id, q.track, q.institution_id, q.topic_id, q.variant].join('|')
        let result = classification.get(key)
        if (!result) {
          result = assertClassification(pool, { subjectId: q.subject_id as string, track: q.track as string, institutionId: q.institution_id, topicId: q.topic_id, variant: q.variant ?? null, publishing: true, currentVariant: q.variant ?? null })
            .then(() => null)
            .catch((error) => (error instanceof Error ? error.message : 'classificação inválida.'))
          classification.set(key, result)
        }
        return result
      }

      const ready: string[] = []
      const problems: string[] = []
      for (const question of found.rows) {
        const label = String(question.statement).replace(/\s+/g, ' ').slice(0, 80)
        if (question.status !== 'rascunho') { problems.push(`“${label}”: já não é um rascunho.`); continue }
        const optionsProblemText = optionsProblem(optionsOf.get(question.id) ?? [])
        if (optionsProblemText) { problems.push(`“${label}”: ${optionsProblemText}`); continue }
        if (!isConfirmed(question.answer_source)) { problems.push(`“${label}”: a resposta ainda não foi revista.`); continue }
        const classificationProblem = await checkClassification(question)
        if (classificationProblem) { problems.push(`“${label}”: ${classificationProblem}`); continue }
        ready.push(question.id)
      }
      const listed = problems.length ? `\n${problems.slice(0, 6).map((item) => `- ${item}`).join('\n')}${problems.length > 6 ? `\nE mais ${problems.length - 6}.` : ''}` : ''
      if (!ready.length) throw new AppError(`Nenhuma questão foi publicada. Corrige:${listed}`)

      const published = await pool.query(
        `UPDATE questions SET status = 'publicada', updated_by = $1, updated_at = now()
         WHERE id = ANY($2::text[]) AND status = 'rascunho' AND answer_source <> 'sugestao' RETURNING id`,
        [admin.id, ready],
      )
      for (const row of published.rows) await logAdminAction(admin, 'question.publicada', 'question', row.id)
      refresh()
      const done = `${published.rowCount} ${published.rowCount === 1 ? 'questão publicada' : 'questões publicadas'}.`
      return problems.length ? `${done} ${problems.length} ficaram em rascunho por corrigir:${listed}${rest}` : `${done}${rest}`
    }

    if (mode === 'eliminar') {
      const notDraft = found.rows.filter((row) => row.status !== 'rascunho')
      if (notDraft.length) throw new AppError('Só podes eliminar rascunhos. Retira da seleção as questões publicadas ou arquivadas.')
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query('DELETE FROM question_media_links WHERE question_id = ANY($1::text[])', [ids])
        await client.query('DELETE FROM question_options WHERE question_id = ANY($1::text[])', [ids])
        await client.query('DELETE FROM questions WHERE id = ANY($1::text[]) AND status = \'rascunho\'', [ids])
        await client.query('COMMIT')
      } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
      for (const id of ids) await logAdminAction(admin, 'question.delete', 'question', id)
      refresh()
      return `${ids.length} ${ids.length === 1 ? 'rascunho eliminado' : 'rascunhos eliminados'}.`
    }

    const allowed = mode === 'arquivada' ? 'publicada' : 'arquivada'
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const changed = await client.query('UPDATE questions SET status = $1, updated_by = $2, updated_at = now() WHERE id = ANY($3::text[]) AND status = $4 RETURNING id', [mode, admin.id, ids, allowed])
      if (changed.rowCount !== ids.length) throw new AppError('O estado de uma ou mais questões mudou. Atualiza a lista e tenta novamente.')
      await client.query('COMMIT')
    } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
    for (const id of ids) await logAdminAction(admin, `question.${mode}`, 'question', id)
    refresh()
    return `${ids.length} ${ids.length === 1 ? 'questão atualizada' : 'questões atualizadas'}.`
  }, 'Não foi possível concluir a operação em lote. Tenta novamente.')
}
TWISISA_EOF
echo "Escrito: app/admin/questoes/actions.ts"

mkdir -p "app/admin/questoes"
cat > "app/admin/questoes/page.tsx" <<'TWISISA_EOF'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, ArchiveRestore, Check, CheckCircle2, CircleHelp, Copy, Download, Eye, Pencil, Trash2 } from 'lucide-react'
import { getStaffAccess } from '@/lib/staff'
import { listInstitutions, type InstitutionRow } from '@/lib/institutions'
import { listSubjects, type SubjectRow } from '@/lib/subjects'
import { listTopics, type TopicRow } from '@/lib/classification'
import { listVariants, type VariantRow } from '@/lib/variants'
import { ANSWER_SOURCES, answerSourceLabel, countByStatus, countDraftReview, DIFFICULTIES, difficultyLabel, getQuestion, listQuestions, ORIGINS, originLabel, STATUSES, type QuestionDetail, type QuestionListItem, type QuestionStatus, type ReviewCounts } from '@/lib/questions'
import { examYearOptions } from '@/lib/years'
import { MathText, plainExcerpt } from '@/lib/math-text'
import { getOpenDraft, listOpenDrafts, type OpenDraft } from '@/lib/question-drafts'
import { relativeTime } from '@/lib/relative-time'
import { bulkManageQuestions, deleteQuestion, discardQuestionDraft, duplicateQuestion, importQuestionsCsv, saveQuestion, setQuestionStatus } from './actions'
import { QuestionBulkForm, SelectableRow } from '@/components/admin/question-bulk-form'
import { QuestionForm, type EditorValue } from './question-form'
import { RowMenu } from '@/components/admin/row-menu'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminPager, AdminSearchBar, AdminTabs, normalizeSearch } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Questões | Administração | Twisisa' }

const PAGE_SIZE = 15
const LETTERS = ['A', 'B', 'C', 'D', 'E']

function href(tab: string, q: string, page: number, extra = '') {
  const params = new URLSearchParams()
  if (tab !== 'rascunhos') params.set('estado', tab)
  if (q) params.set('q', q)
  if (page > 1) params.set('pagina', String(page))
  if (extra) params.set(extra.split('=')[0], extra.split('=')[1])
  const query = params.toString()
  return `/admin/questoes${query ? `?${query}` : ''}`
}

function toEditorValue(question: QuestionDetail): EditorValue {
  return {
    id: question.id,
    status: question.status,
    statement: question.statement,
    explanation: question.explanation ?? '',
    options: question.options,
    track: question.track,
    institutionId: question.institutionId ?? '',
    subjectId: question.subjectId,
    topicId: question.topicId ?? '',
    difficulty: question.difficulty,
    origin: question.origin,
    answerSource: question.answerSource,
    originLabel: question.originLabel ?? '',
    year: question.examYear ? String(question.examYear) : '',
    variant: question.variant ?? '',
  }
}

// Estado da revisão de um rascunho: «por rever» (resposta ainda sugerida) ou «revista» (confirmada ou gabarito oficial).
function reviewLabel(item: QuestionListItem) {
  if (item.status !== 'rascunho') return answerSourceLabel(item.answerSource)
  return item.answerSource === 'sugestao' ? 'Por rever' : item.answerSource === 'oficial' ? 'Gabarito oficial' : 'Revista'
}

// Item do menu ⋯ para marcar um rascunho como revisto (ou desfazer); o gabarito oficial não se mexe.
function reviewMenuItems(item: QuestionListItem) {
  if (item.status !== 'rascunho') return []
  if (item.answerSource === 'sugestao') return [{ label: 'Marcar como revista', icon: <Check size={16} />, action: bulkManageQuestions, fields: { id: item.id, mode: 'revista' } }]
  if (item.answerSource === 'confirmada') return [{ label: 'Voltar a por rever', icon: <CircleHelp size={16} />, action: bulkManageQuestions, fields: { id: item.id, mode: 'por_rever' } }]
  return []
}

export default async function AdminQuestoesPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string; pagina?: string; editar?: string; ver?: string; continuar?: string }> }) {
  const access = await getStaffAccess()
  if (!access) redirect('/aluno')
  const admin = access.user
  // O revisor edita, pré-visualiza, publica e arquiva; criar, importar, duplicar, eliminar e ações em lote são do admin.
  const canManage = access.role === 'admin'
  const params = await searchParams
  const tab = STATUSES.find((item) => item.tab === params.estado) ?? STATUSES[0]
  const q = (params.q ?? '').trim().slice(0, 100)
  const requested = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1)

  let list: { total: number; page: number; items: QuestionListItem[] } | null = null
  let review: ReviewCounts = { pending: 0, revised: 0 }
  let counts: Record<QuestionStatus, number> | null = null
  let subjects: SubjectRow[] = []
  let topics: TopicRow[] = []
  let variants: VariantRow[] = []
  let institutions: InstitutionRow[] = []
  let editing: QuestionDetail | null = null
  let preview: QuestionDetail | null = null
  let drafts: OpenDraft[] = []
  let resumed: OpenDraft | null = null
  try {
    ;[list, counts, subjects, topics, variants, institutions, review] = await Promise.all([
      listQuestions({ status: tab.value, term: normalizeSearch(q), page: requested, pageSize: PAGE_SIZE }),
      countByStatus(),
      listSubjects(),
      listTopics(),
      listVariants(),
      listInstitutions(),
      tab.value === 'rascunho' ? countDraftReview(normalizeSearch(q)) : Promise.resolve<ReviewCounts>({ pending: 0, revised: 0 }),
    ])
    if (params.editar) editing = await getQuestion(params.editar)
    if (params.ver) preview = await getQuestion(params.ver)
  } catch (error) {
    console.error('[ADMIN QUESTOES]', error)
  }
  // Questões por concluir: se a tabela ainda não existir (migração 0011 por correr) ou a consulta falhar, a página funciona na mesma.
  try {
    ;[drafts, resumed] = await Promise.all([listOpenDrafts(admin.id), params.continuar ? getOpenDraft(admin.id, params.continuar) : Promise.resolve(null)])
  } catch (error) {
    console.error('[ADMIN QUESTOES] questões por concluir', error)
  }

  const formProps = {
    action: saveQuestion,
    subjects: subjects.filter((subject) => subject.active || subject.id === editing?.subjectId).map((subject) => ({ id: subject.id, name: subject.name, scopes: subject.scopes.map((scope) => scope.key) })),
    topics: topics.filter((topic) => topic.active || topic.id === editing?.topicId).map((topic) => ({ id: topic.id, name: topic.name, subjectId: topic.subjectId })),
    variants: variants.map((item) => ({ name: item.name, subjectId: item.subjectId, active: item.active })),
    institutions: institutions.filter((item) => item.active || item.id === editing?.institutionId).map((item) => ({ value: item.id, label: `${item.shortName} · ${item.name}` })),
    years: examYearOptions('Sem ano'),
    difficulties: DIFFICULTIES.map((item) => ({ value: item.value, label: item.label })),
    origins: ORIGINS.map((item) => ({ value: item.value, label: item.label })),
    answerSources: ANSWER_SOURCES.map((item) => ({ value: item.value, label: item.label })),
  }
  const page = list?.page ?? 1
  const pages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1
  const countLabel = list ? (q ? `${list.total} ${list.total === 1 ? 'resultado' : 'resultados'}` : `${list.total} ${list.total === 1 ? 'questão' : 'questões'}`) : undefined
  const closeHref = href(tab.tab, q, page)

  return (
    <AdminPage>
      <AdminPageHeader
        icon={CircleHelp}
        title="Questões"
        description="O banco de questões do Simulador, da Prática e do Modo rápido."
        action={
          !canManage ? undefined : <div className="flex shrink-0 items-center gap-2">
            <FormModal variant="secondary" icon="upload" label="Importar CSV" title="Importar questões" description="Todas entram como rascunho, com a resposta por confirmar.">
              <FeedbackForm action={importQuestionsCsv} successMessage="Importação concluída." errorMessage="Não foi possível importar o CSV." resetOnSuccess className="grid gap-4">
                <p className="text-sm leading-6 text-[#526057]">
                  Um ficheiro <strong>.csv</strong> com até 500 questões. Se houver um erro numa linha, nada é guardado e vês o que corrigir.
                </p>
                <ul className="grid gap-1 rounded-2xl bg-[#fafbf8] p-4 text-xs leading-5 text-[#526057]">
                  <li><strong>Obrigatórias:</strong> statement, subject_name, track (10, 12 ou admissao), option_a, option_b, correct (A a E).</li>
                  <li><strong>Opcionais:</strong> option_c a option_e, institution (sigla; obrigatória na admissão), variant (nome de uma variante já criada em Variantes), topic_name, difficulty (facil, media, dificil), year, origin_label, explanation.</li>
                  <li>A disciplina e o tema têm de existir, com o mesmo nome, e a disciplina tem de estar no percurso indicado.</li>
                  <li>O modelo traz 3 linhas de exemplo marcadas com <strong>[EXEMPLO]</strong>: apaga-as antes de importar.</li>
                </ul>
                <Link href="/admin/questoes/modelo" prefetch={false} className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d4d41] hover:underline"><Download size={16} aria-hidden="true" /> Descarregar o modelo (com exemplos)</Link>
                <label className="text-sm font-medium">Ficheiro CSV *
                  <input name="csv" type="file" accept=".csv,text/csv" required className="mt-1 block w-full rounded-xl border border-[#dfe3d9] bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#edf3ee] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#1d4d41]" />
                </label>
                <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">Importar</button>
              </FeedbackForm>
            </FormModal>
            <FormModal label="Adicionar" title="Adicionar questão" description="Em 3 passos: enunciado, opções e classificação.">
              <QuestionForm {...formProps} editing={null} draft={null} />
            </FormModal>
          </div>
        }
      />
      {editing && (
        <RouteModal title="Editar questão" closeHref={closeHref}>
          <QuestionForm {...formProps} editing={toEditorValue(editing)} draft={null} />
        </RouteModal>
      )}
      {resumed && !editing && (
        <RouteModal title="Continuar questão" description="Retomada do ponto onde ficou." closeHref={closeHref}>
          <QuestionForm {...formProps} editing={null} draft={{ id: resumed.id, payload: resumed.payload }} />
        </RouteModal>
      )}
      {preview && (
        <RouteModal title="Como o aluno vê" description="A resposta certa e a explicação só aparecem ao aluno depois de responder." closeHref={closeHref}>
          <div className="grid gap-4">
            <p className="text-[15px] leading-7"><MathText text={preview.statement} /></p>
            <ul className="grid gap-2">
              {preview.options.map((option, index) => (
                <li key={index} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${option.isCorrect ? 'border-[#1d4d41] bg-[#edf3ee]' : 'border-[#e3e5dc]'}`}>
                  <span className="font-semibold text-[#1d4d41]">{LETTERS[index]}</span>
                  <span className="min-w-0 flex-1"><MathText text={option.body} /></span>
                  {option.isCorrect && <CheckCircle2 size={18} aria-label="Resposta correta" className="shrink-0 text-[#1d4d41]" />}
                </li>
              ))}
            </ul>
            {preview.explanation && (
              <div className="rounded-2xl bg-[#fafbf8] p-4 text-sm leading-6">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#9aa39c]">Explicação</p>
                <MathText text={preview.explanation} />
              </div>
            )}
          </div>
        </RouteModal>
      )}

      {drafts.length > 0 && (
        <section aria-label="Questões por concluir" className="shrink-0 rounded-2xl border border-[#ecdfb8] bg-[#faf5e6] px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#805f19]">Por concluir ({drafts.length})</p>
          <ul className="divide-y divide-[#efe6c9]">
            {drafts.slice(0, 5).map((draft) => (
              <li key={draft.id} className="flex items-center gap-3 py-2">
                <Link href={href(tab.tab, q, page, `continuar=${draft.id}`)} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{plainExcerpt(draft.payload.statement || draft.payload.options.find((option) => option.body.trim())?.body || 'Sem enunciado', 90)}</p>
                  <p className="mt-0.5 text-xs text-[#737c75]">Passo {draft.payload.step + 1} de 3 · {relativeTime(draft.updatedAt)}</p>
                </Link>
                <RowMenu
                  label="Ações da questão por concluir"
                  items={[
                    { label: 'Continuar', icon: <Pencil size={16} />, href: href(tab.tab, q, page, `continuar=${draft.id}`) },
                    { label: 'Descartar', icon: <Trash2 size={16} />, action: discardQuestionDraft, fields: { id: draft.id }, confirm: 'Descartar', tone: 'danger' as const },
                  ]}
                />
              </li>
            ))}
          </ul>
          {drafts.length > 5 && <p className="pb-0.5 text-xs text-[#737c75]">+ {drafts.length - 5} mais antigas: aparecem quando concluíres ou descartares estas.</p>}
        </section>
      )}

      <AdminTabs label="Estado das questões" tabs={STATUSES.map((item) => ({ href: href(item.tab, '', 1), label: item.label, count: counts?.[item.value], active: item.tab === tab.tab }))} />
      <AdminSearchBar q={q} placeholder="Pesquisar questão ou disciplina" countLabel={countLabel} hidden={tab.tab === 'rascunhos' ? undefined : { estado: tab.tab }} />

      <AdminListPanel>
        {list === null ? (
          <AdminLoadError href={closeHref} />
        ) : list.items.length === 0 ? (
          <div className="m-4">
            {q ? (
              <EmptyState title="Sem resultados" description={`Nenhuma questão corresponde a “${q}”.`} actionLabel="Limpar pesquisa" actionHref={href(tab.tab, '', 1)} />
            ) : (
              <EmptyState title={`Sem ${tab.label.toLowerCase()}`} description={tab.value === 'rascunho' ? (canManage ? 'Usa o botão Adicionar para escrever a primeira, ou Importar CSV.' : 'Quando houver questões para rever, aparecem aqui.') : 'Quando houver, aparecem aqui.'} />
            )}
          </div>
        ) : (
          <QuestionBulkForm
            key={`${tab.tab}-${page}-${q}`}
            status={tab.value}
            q={q}
            rows={list.items.map((item) => ({ id: item.id, revised: item.answerSource !== 'sugestao' }))}
            pending={review.pending}
            revised={review.revised}
            canManage={canManage}
            action={bulkManageQuestions}
          >
            <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
              {list.items.map((item) => (
                <SelectableRow
                  key={item.id}
                  id={item.id}
                  label={plainExcerpt(item.statement).slice(0, 70)}
                  state={item.status === 'rascunho' ? (item.answerSource === 'sugestao' ? 'pending' : 'revised') : null}
                  menu={
                    <RowMenu
                      label="Ações da questão"
                      items={[
                        { label: 'Editar', icon: <Pencil size={16} />, href: href(tab.tab, q, page, `editar=${item.id}`) },
                        { label: 'Pré-visualizar', icon: <Eye size={16} />, href: href(tab.tab, q, page, `ver=${item.id}`) },
                        ...reviewMenuItems(item),
                        ...(canManage ? [{ label: 'Duplicar', icon: <Copy size={16} />, action: duplicateQuestion, fields: { id: item.id } }] : []),
                        ...(item.status === 'rascunho'
                          ? [
                              { label: 'Publicar', icon: <CheckCircle2 size={16} />, action: setQuestionStatus, fields: { id: item.id, to: 'publicada' } },
                              ...(canManage ? [{ label: 'Eliminar', icon: <Trash2 size={16} />, action: deleteQuestion, fields: { id: item.id }, confirm: 'Eliminar', tone: 'danger' as const }] : []),
                            ]
                          : item.status === 'publicada'
                            ? [{ label: 'Arquivar', icon: <Archive size={16} />, action: setQuestionStatus, fields: { id: item.id, to: 'arquivada' }, confirm: 'Arquivar' }]
                            : [{ label: 'Restaurar', icon: <ArchiveRestore size={16} />, action: setQuestionStatus, fields: { id: item.id, to: 'rascunho' } }]),
                      ]}
                    />
                  }
                >
                  <p className="line-clamp-2 text-sm font-medium leading-5">{plainExcerpt(item.statement)}</p>
                  <p className="mt-1 truncate text-xs text-[#737c75]">{item.subjectName} · {item.scopeLabel} · {difficultyLabel(item.difficulty)}{item.examYear ? ` · ${item.examYear}` : ''}</p>
                  {/* Marcas internas: só aqui, no admin. */}
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[#eef0ea] px-2 py-0.5 text-[10px] font-semibold text-[#5f6d63]">{originLabel(item.origin)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.answerSource === 'sugestao' ? 'bg-[#f4eddb] text-[#805f19]' : 'bg-[#e6f0e9] text-[#1d4d41]'}`}>{reviewLabel(item)}</span>
                    {item.version > 1 && <span className="rounded-full bg-[#eef0ea] px-2 py-0.5 text-[10px] font-semibold text-[#5f6d63]">v{item.version}</span>}
                  </p>
                </SelectableRow>
              ))}
            </ul>
          </QuestionBulkForm>
        )}
        {list && list.total > 0 && <AdminPager page={page} pages={pages} prevHref={href(tab.tab, q, page - 1)} nextHref={href(tab.tab, q, page + 1)} />}
      </AdminListPanel>
    </AdminPage>
  )
}
TWISISA_EOF
echo "Escrito: app/admin/questoes/page.tsx"

mkdir -p "components/admin"
cat > "components/admin/question-bulk-form.tsx" <<'TWISISA_EOF'
'use client'

import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Check, Trash2 } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import type { ActionResult } from '@/lib/action-result'

type Status = 'rascunho' | 'publicada' | 'arquivada'
type RowState = 'pending' | 'revised' | null
type Confirm = { title: string; text: string; yes: string; no: string; danger?: boolean; run: () => void }

type Selection = {
  selecting: boolean
  selected: Record<string, boolean>
  toggle: (id: string, revised: boolean) => void
  busy: boolean
}

const SelectionContext = createContext<Selection | null>(null)

const btn = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40'
const btnSolid = `${btn} bg-[#1d4d41] text-white hover:bg-[#163e34]`
const btnLine = `${btn} border border-[#c9d7cd] bg-white text-[#1d4d41] hover:bg-[#f1f4ef]`
const btnGhost = `${btn} text-[#526057] hover:bg-[#eef0ea]`

// Faixa de revisão no topo da lista de questões.
//   Rascunhos: «Marcar como revistas» e, logo a seguir, «Publicar» (que pergunta «Já verificaste?» antes de publicar).
//   Publicadas e arquivadas: «Selecionar» para arquivar ou restaurar várias de uma vez.
// As caixas de seleção só existem no modo «Selecionar»; fora dele cada rascunho mostra apenas se já foi revisto.
export function QuestionBulkForm({
  status,
  q,
  rows,
  pending,
  revised,
  canManage,
  action,
  children,
}: {
  status: Status
  q: string
  rows: { id: string; revised: boolean }[]
  pending: number
  revised: number
  canManage: boolean
  action: (formData: FormData) => Promise<ActionResult>
  children: React.ReactNode
}) {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const router = useRouter()
  const feedback = useFeedback()

  const ids = Object.keys(selected)
  const selRevised = ids.filter((id) => selected[id])
  const selPending = ids.filter((id) => !selected[id])
  const allChosen = rows.length > 0 && ids.length === rows.length
  const isDraft = status === 'rascunho'
  const total = pending + revised

  function toggle(id: string, isRevised: boolean) {
    setSelected((current) => {
      const next = { ...current }
      if (id in next) delete next[id]
      else next[id] = isRevised
      return next
    })
  }

  function toggleAll() {
    setSelected(allChosen ? {} : Object.fromEntries(rows.map((row) => [row.id, row.revised])))
  }

  function leave() {
    setSelecting(false)
    setSelected({})
  }

  async function run(mode: string, target: { ids: string[] } | { scope: 'por-rever' | 'revistas' }) {
    if (busy) return
    const data = new FormData()
    data.set('mode', mode)
    if ('ids' in target) target.ids.forEach((id) => data.append('id', id))
    else {
      data.set('scope', target.scope)
      data.set('q', q)
    }
    setBusy(true)
    try {
      const result = await action(data)
      if (result.ok) {
        feedback.success(result.message ?? 'Operação concluída.')
        leave()
      } else feedback.error(result.message)
      router.refresh()
    } catch {
      feedback.error('Não foi possível concluir a operação. Tenta novamente.')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  // O que cada botão atinge: a seleção, se existir; senão, todos os rascunhos (da pesquisa) por rever / revistos.
  const hasSelection = ids.length > 0
  const markCount = hasSelection ? selPending.length : pending
  const publishCount = hasSelection ? selRevised.length : revised
  const markTarget = hasSelection ? { ids: selPending } : { scope: 'por-rever' as const }
  const publishTarget = hasSelection ? { ids: selRevised } : { scope: 'revistas' as const }
  const noun = (n: number) => (n === 1 ? 'questão' : 'questões')

  function askPublish() {
    setConfirm({
      title: 'Já verificaste as questões?',
      text: `${publishCount} ${noun(publishCount)} ${publishCount === 1 ? 'vai ficar visível' : 'vão ficar visíveis'} para os alunos no Simulador, na Prática e no Modo rápido.`,
      yes: 'Sim, publicar',
      no: 'Não, voltar',
      run: () => run('publicada', publishTarget),
    })
  }

  function askArchive() {
    setConfirm({
      title: `Arquivar ${ids.length} ${noun(ids.length)}?`,
      text: 'Deixam de aparecer aos alunos. O histórico fica guardado e podes restaurá-las.',
      yes: 'Arquivar',
      no: 'Cancelar',
      run: () => run('arquivada', { ids }),
    })
  }

  function askDelete() {
    setConfirm({
      title: `Eliminar ${ids.length} ${ids.length === 1 ? 'rascunho' : 'rascunhos'}?`,
      text: 'Esta ação não pode ser desfeita.',
      yes: 'Eliminar',
      no: 'Cancelar',
      danger: true,
      run: () => run('eliminar', { ids }),
    })
  }

  const headline = hasSelection
    ? `${ids.length} ${ids.length === 1 ? 'selecionada' : 'selecionadas'}`
    : selecting
      ? 'Escolhe as questões'
      : pending > 0
        ? `${revised} de ${total} revistas`
        : 'Todas revistas, prontas a publicar'

  return (
    <SelectionContext.Provider value={{ selecting, selected, toggle, busy }}>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-[#edf0e9] bg-[#fafbf8] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            {isDraft || selecting ? (
              <div className="min-w-[11rem] flex-1">
                <p className="text-sm font-semibold text-[#2f3a33]">{headline}</p>
                {isDraft && !selecting && total > 0 && (
                  <div role="progressbar" aria-label="Questões revistas" aria-valuemin={0} aria-valuemax={total} aria-valuenow={revised} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e6e9e1]">
                    <div className="h-full rounded-full bg-[#1d4d41] transition-[width] duration-300" style={{ width: `${Math.round((revised / total) * 100)}%` }} />
                  </div>
                )}
              </div>
            ) : (
              <p className="min-w-[11rem] flex-1 text-xs text-[#737c75]">Para arquivar ou restaurar várias de uma vez, usa «Selecionar».</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {selecting ? (
                <>
                  <button type="button" onClick={toggleAll} disabled={busy} className={btnGhost}>{allChosen ? 'Limpar' : 'Todas'}</button>
                  {isDraft && selPending.length > 0 && <button type="button" onClick={() => run('revista', markTarget)} disabled={busy} className={btnLine}><Check size={14} aria-hidden="true" /> Marcar {selPending.length} como {selPending.length === 1 ? 'revista' : 'revistas'}</button>}
                  {isDraft && selRevised.length > 0 && <button type="button" onClick={askPublish} disabled={busy} className={btnSolid}>Publicar {selRevised.length}</button>}
                  {status === 'publicada' && hasSelection && <button type="button" onClick={askArchive} disabled={busy} className={btnSolid}><Archive size={14} aria-hidden="true" /> Arquivar {ids.length}</button>}
                  {status === 'arquivada' && hasSelection && <button type="button" onClick={() => run('rascunho', { ids })} disabled={busy} className={btnSolid}><ArchiveRestore size={14} aria-hidden="true" /> Restaurar {ids.length}</button>}
                  {isDraft && canManage && hasSelection && <button type="button" onClick={askDelete} disabled={busy} className={`${btn} border border-[#efd8d8] bg-white text-[#9a3030] hover:bg-[#fbeeee]`}><Trash2 size={14} aria-hidden="true" /> Eliminar</button>}
                  <button type="button" onClick={leave} disabled={busy} className={btnGhost}>Cancelar</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setSelecting(true)} disabled={busy} className={btnGhost}>Selecionar</button>
                  {isDraft && pending > 0 && <button type="button" onClick={() => run('revista', markTarget)} disabled={busy} className={publishCount > 0 ? btnLine : btnSolid}><Check size={14} aria-hidden="true" /> {busy ? 'A marcar…' : q ? `Marcar ${pending} ${pending === 1 ? 'resultado' : 'resultados'} como ${pending === 1 ? 'revisto' : 'revistos'}` : `Marcar todas como revistas (${pending})`}</button>}
                  {isDraft && revised > 0 && <button type="button" onClick={askPublish} disabled={busy} className={btnSolid}>{q ? `Publicar ${revised} ${revised === 1 ? 'resultado' : 'resultados'}` : `Publicar revistas (${revised})`}</button>}
                </>
              )}
            </div>
          </div>
        </div>
        {children}
      </section>
      {confirm && <ConfirmDialog {...confirm} busy={busy} onClose={() => !busy && setConfirm(null)} />}
    </SelectionContext.Provider>
  )
}

// Linha de uma questão. Fora do modo «Selecionar» mostra o estado da revisão (círculo tracejado = por rever, verde = revista);
// dentro dele, uma caixa de seleção, e a linha toda passa a ser clicável.
export function SelectableRow({ id, label, state, menu, children }: { id: string; label: string; state: RowState; menu: React.ReactNode; children: React.ReactNode }) {
  const context = useContext(SelectionContext)
  if (!context) throw new Error('SelectableRow tem de estar dentro de <QuestionBulkForm>.')
  const { selecting, selected, toggle } = context
  const checked = id in selected
  const pick = () => toggle(id, state === 'revised')

  return (
    <li className={`-mx-4 flex items-center gap-3 px-4 py-3 transition-colors sm:-mx-5 sm:px-5 ${selecting && checked ? 'bg-[#f1f7f3]' : ''}`}>
      {selecting ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`Selecionar questão: ${label}`}
          onClick={pick}
          className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${checked ? 'border-[#1d4d41] bg-[#1d4d41] text-white' : 'border-[#c4cbc2] bg-white'}`}
        >
          {checked && <Check size={14} aria-hidden="true" />}
        </button>
      ) : state === 'revised' ? (
        <span title="Revista" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1d4d41] text-white"><Check size={14} aria-hidden="true" /><span className="sr-only">Revista</span></span>
      ) : state === 'pending' ? (
        <span title="Por rever" className="size-6 shrink-0 rounded-full border-2 border-dashed border-[#d3b968] bg-[#faf5e6]"><span className="sr-only">Por rever</span></span>
      ) : null}
      <div className={`min-w-0 flex-1 ${selecting ? 'cursor-pointer' : ''}`} onClick={selecting ? pick : undefined}>{children}</div>
      {!selecting && menu}
    </li>
  )
}

function ConfirmDialog({ title, text, yes, no, danger, busy, run, onClose }: Confirm & { busy: boolean; onClose: () => void }) {
  const titleId = useId()
  const textId = useId()
  const noRef = useRef<HTMLButtonElement>(null)
  const yesRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  // Foco em «voltar» (a opção segura); Tab fica entre os dois botões; Esc fecha; o fundo não desloca.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    noRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const first = noRef.current
      const last = yesRef.current
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = overflow
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={textId} className="w-full rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl sm:p-6">
        <h2 id={titleId} className="text-lg font-semibold leading-snug">{title}</h2>
        <p id={textId} className="mt-1.5 text-sm leading-6 text-[#526057]">{text}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={noRef} type="button" onClick={onClose} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3d9] px-5 text-sm font-semibold text-[#2f3a33] hover:bg-[#f1f4ef] disabled:opacity-50">{no}</button>
          <button ref={yesRef} type="button" onClick={run} disabled={busy} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60 ${danger ? 'bg-[#9a3030] hover:bg-[#7f2626]' : 'bg-[#1d4d41] hover:bg-[#163e34]'}`}>{busy ? 'A processar…' : yes}</button>
        </div>
      </div>
    </div>
  )
}
TWISISA_EOF
echo "Escrito: components/admin/question-bulk-form.tsx"

echo "A correr o build (tem de passar antes do commit)..."
npm run build

git add lib/questions.ts app/admin/questoes/actions.ts app/admin/questoes/page.tsx components/admin/question-bulk-form.tsx
git commit -m "Banco de questões: revisão e publicação em lote com confirmação"
git push
echo "Concluído."
