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
