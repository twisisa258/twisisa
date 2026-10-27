import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { trackLabel } from '@/lib/percurso'
import { titleFromMessage, type ExplainQuestion, type StoredMessage, type StudyContext } from '@/lib/jonas-prompts'

// Dados do Jonas (só servidor). Tudo é sempre filtrado pelo aluno dono: um aluno nunca lê conversas de outro.

export type ConversationSummary = { id: string; title: string; subjectId: string | null; subjectName: string | null; updatedAt: string }
export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string }

const NEW_TITLE = 'Nova conversa'
const MAX_MESSAGES_LOADED = 200

// ───────────── Conversas do chat ─────────────

export async function listConversations(userId: string, limit = 100): Promise<ConversationSummary[]> {
  const rows = await pool.query(
    `SELECT c.id, c.title, c.subject_id, s.name AS subject_name, c.updated_at
     FROM jonas_conversations c LEFT JOIN library_subjects s ON s.id = c.subject_id
     WHERE c.user_id = $1 AND c.kind = 'chat' ORDER BY c.updated_at DESC LIMIT $2`,
    [userId, limit],
  )
  return rows.rows.map((row) => ({ id: row.id, title: row.title, subjectId: row.subject_id ?? null, subjectName: row.subject_name ?? null, updatedAt: new Date(row.updated_at).toISOString() }))
}

export async function getConversation(userId: string, id: string) {
  const found = await pool.query(
    `SELECT c.id, c.title, c.subject_id, s.name AS subject_name, c.updated_at
     FROM jonas_conversations c LEFT JOIN library_subjects s ON s.id = c.subject_id
     WHERE c.id = $1 AND c.user_id = $2 AND c.kind = 'chat'`,
    [id, userId],
  )
  if (!found.rowCount) return null
  const row = found.rows[0]
  const messages = await pool.query(
    `SELECT t.id::text AS id, t.role, t.content FROM (SELECT id, role, content FROM jonas_messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT ${MAX_MESSAGES_LOADED}) t ORDER BY t.id`,
    [id],
  )
  return {
    summary: { id: row.id as string, title: row.title as string, subjectId: (row.subject_id as string | null) ?? null, subjectName: (row.subject_name as string | null) ?? null, updatedAt: new Date(row.updated_at).toISOString() } satisfies ConversationSummary,
    messages: messages.rows.map((message) => ({ id: message.id as string, role: message.role as 'user' | 'assistant', content: message.content as string })) satisfies ChatMessage[],
  }
}

export async function createConversation(userId: string, firstMessage: string | null, subjectId: string | null): Promise<string> {
  const id = `jonas-${randomUUID()}`
  await pool.query(`INSERT INTO jonas_conversations (id, user_id, kind, title, subject_id) VALUES ($1, $2, 'chat', $3, $4)`, [id, userId, firstMessage ? titleFromMessage(firstMessage) : NEW_TITLE, subjectId])
  return id
}

export async function ownsConversation(userId: string, id: string, kind: 'chat' | 'simulador' = 'chat'): Promise<{ subjectId: string | null; title: string } | null> {
  const found = await pool.query(`SELECT subject_id, title FROM jonas_conversations WHERE id = $1 AND user_id = $2 AND kind = $3`, [id, userId, kind])
  return found.rowCount ? { subjectId: (found.rows[0].subject_id as string | null) ?? null, title: found.rows[0].title as string } : null
}

export async function renameConversation(userId: string, id: string, title: string): Promise<boolean> {
  const clean = title.replace(/\s+/g, ' ').trim().slice(0, 120)
  if (!clean) return false
  const result = await pool.query(`UPDATE jonas_conversations SET title = $3 WHERE id = $1 AND user_id = $2 AND kind = 'chat'`, [id, userId, clean])
  return (result.rowCount ?? 0) > 0
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM jonas_conversations WHERE id = $1 AND user_id = $2 AND kind = 'chat'`, [id, userId])
  return (result.rowCount ?? 0) > 0
}

export async function addMessage(conversationId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  await pool.query(`INSERT INTO jonas_messages (conversation_id, role, content) VALUES ($1, $2, $3)`, [conversationId, role, content.slice(0, 20000)])
  await pool.query(`UPDATE jonas_conversations SET updated_at = now() WHERE id = $1`, [conversationId])
}

/** Últimas mensagens (da mais antiga para a mais recente), para dar contexto ao modelo. */
export async function lastMessages(conversationId: string, limit: number): Promise<StoredMessage[]> {
  const rows = await pool.query(`SELECT t.role, t.content FROM (SELECT id, role, content FROM jonas_messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT $2) t ORDER BY t.id`, [conversationId, limit])
  return rows.rows.map((row) => ({ role: row.role as 'user' | 'assistant', content: row.content as string }))
}

/** Apaga a última mensagem se for do papel indicado: «Responder de novo» (resposta do Jonas) e pedidos que ficaram sem resposta (do aluno). */
export async function deleteTrailing(conversationId: string, role: 'user' | 'assistant'): Promise<void> {
  await pool.query(
    `DELETE FROM jonas_messages WHERE role = $2 AND id = (SELECT id FROM jonas_messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT 1)`,
    [conversationId, role],
  )
}

export async function lastMessageRole(conversationId: string): Promise<'user' | 'assistant' | null> {
  const row = await pool.query(`SELECT role FROM jonas_messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT 1`, [conversationId])
  return (row.rows[0]?.role as 'user' | 'assistant' | undefined) ?? null
}

// ───────────── Travão técnico (não é uma quota de produto) ─────────────

// Limites de produto (por plano) ainda não existem: «por agora não há limites». Este travão só impede que um script
// esgote o limite partilhado da Groq: 25 mensagens por minuto por aluno é muito mais do que uma pessoa escreve.
export const BURST_LIMIT_PER_MINUTE = 25

/**
 * Ponto único para, mais tarde, ligar os limites por plano (ex.: gratuito = N mensagens por dia). Hoje devolve sempre `ok`.
 * Está aqui para que a rota do chat e a das explicações passem pelo mesmo sítio quando os limites chegarem.
 */
export async function checkAllowance(userId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const recent = await pool.query(
    `SELECT count(*)::int AS n FROM jonas_messages m JOIN jonas_conversations c ON c.id = m.conversation_id
     WHERE c.user_id = $1 AND m.role = 'user' AND m.created_at > now() - interval '1 minute'`,
    [userId],
  )
  if ((recent.rows[0].n as number) >= BURST_LIMIT_PER_MINUTE) return { ok: false, message: 'Estás a enviar mensagens muito depressa. Espera um instante e tenta de novo.' }
  return { ok: true }
}

// ───────────── Contexto de estudo ─────────────

/** Percurso, disciplina da conversa e assuntos recentes: o que torna o Jonas «de estudo» e não um chat genérico. */
export async function getStudyContext(userId: string, conversationId: string | null, subjectId: string | null): Promise<StudyContext> {
  const [profile, subject, recent] = await Promise.all([
    pool.query(`SELECT p.track, i.short_name FROM student_profiles p LEFT JOIN institutions i ON i.id = p.institution_id WHERE p.user_id = $1`, [userId]),
    subjectId ? pool.query(`SELECT name FROM library_subjects WHERE id = $1`, [subjectId]) : Promise.resolve(null),
    pool.query(
      `SELECT title FROM jonas_conversations WHERE user_id = $1 AND kind = 'chat' AND title <> $3 AND ($2::text IS NULL OR id <> $2) ORDER BY updated_at DESC LIMIT 6`,
      [userId, conversationId, NEW_TITLE],
    ),
  ])
  const track = profile.rows[0]?.track as string | undefined
  const institution = profile.rows[0]?.short_name as string | null | undefined
  const base = trackLabel(track)
  return {
    trackLabel: base ? (track === 'admissao' && institution ? `${base} (${institution})` : base) : null,
    subject: (subject?.rows[0]?.name as string | undefined) ?? null,
    recentTitles: recent.rows.map((row) => row.title as string),
  }
}

/** Uma disciplina ativa que existe (para não guardar um id inventado pelo cliente). */
export async function activeSubjectId(subjectId: string | null): Promise<string | null> {
  if (!subjectId) return null
  const found = await pool.query(`SELECT id FROM library_subjects WHERE id = $1 AND active`, [subjectId])
  return found.rowCount ? subjectId : null
}

/** Disciplinas do percurso do aluno, para escolher o contexto de uma nova conversa. */
export async function listStudySubjects(userId: string): Promise<{ id: string; name: string }[]> {
  const profile = await pool.query(`SELECT track, institution_id FROM student_profiles WHERE user_id = $1`, [userId])
  const track = (profile.rows[0]?.track as string | undefined) ?? null
  const institutionId = (profile.rows[0]?.institution_id as string | undefined) ?? null
  const rows = await pool.query(
    `SELECT DISTINCT s.id, s.name FROM library_subjects s
     WHERE s.active AND (
       ($1::text IS NULL AND $2::text IS NULL)
       OR EXISTS (SELECT 1 FROM subject_scopes c WHERE c.subject_id = s.id AND (($1::text IN ('10','12') AND c.track = $1::text) OR ($1::text = 'admissao' AND c.institution_id = $2::text)))
     )
     ORDER BY s.name`,
    [track, institutionId],
  )
  return rows.rows.map((row) => ({ id: row.id as string, name: row.name as string }))
}

// ───────────── Explicações no Simulador ─────────────

export type ExplainTarget = { question: ExplainQuestion; questionId: string; subjectId: string; trackLabel: string | null }

/** A questão de uma tentativa do aluno, já respondida. `null` se a tentativa não é dele, a posição não existe ou ainda não respondeu. */
export async function getExplainTarget(userId: string, attemptId: string, position: number): Promise<ExplainTarget | null> {
  const item = await pool.query(
    `SELECT i.question_id, i.option_order, i.answer_option_id, q.statement, q.explanation, q.variant, q.subject_id, s.name AS subject, t.name AS topic
     FROM attempt_items i
     JOIN attempts a ON a.id = i.attempt_id
     JOIN questions q ON q.id = i.question_id
     JOIN library_subjects s ON s.id = q.subject_id
     LEFT JOIN topics t ON t.id = q.topic_id
     WHERE i.attempt_id = $1 AND i.position = $2 AND a.user_id = $3`,
    [attemptId, position, userId],
  )
  const row = item.rows[0]
  // Só se explica o que o aluno já respondeu: a resposta certa nunca sai antes.
  if (!row || !row.answer_option_id) return null

  const [options, images, profile] = await Promise.all([
    pool.query(`SELECT o.id, o.body, o.is_correct, m.alt_text FROM question_options o LEFT JOIN question_media m ON m.id = o.media_id WHERE o.question_id = $1`, [row.question_id]),
    pool.query(`SELECT m.alt_text FROM question_media_links l JOIN question_media m ON m.id = l.media_id WHERE l.question_id = $1 AND l.usage = 'statement' ORDER BY l.position`, [row.question_id]),
    pool.query(`SELECT track FROM student_profiles WHERE user_id = $1`, [userId]),
  ])
  const byId = new Map<string, { body: string | null; alt_text: string | null; is_correct: boolean }>(options.rows.map((option) => [option.id as string, option]))
  const ordered = (row.option_order as string[]).flatMap((id) => {
    const option = byId.get(id)
    return option ? [{ text: (option.body as string | null) ?? null, imageAlt: (option.alt_text as string | null) ?? null, isCorrect: option.is_correct === true, chosen: id === row.answer_option_id }] : []
  })
  return {
    questionId: row.question_id as string,
    subjectId: row.subject_id as string,
    trackLabel: trackLabel(profile.rows[0]?.track as string | undefined),
    question: {
      subject: row.subject as string,
      variant: (row.variant as string | null) ?? null,
      topic: (row.topic as string | null) ?? null,
      statement: row.statement as string,
      statementImages: images.rows.map((image) => image.alt_text as string),
      options: ordered,
      officialExplanation: (row.explanation as string | null) ?? null,
    },
  }
}

/** A conversa de explicação de uma questão (uma por tentativa e posição). Cria-a se ainda não existir. */
export async function getOrCreateExplainConversation(userId: string, attemptId: string, position: number, target: ExplainTarget): Promise<string> {
  const find = () => pool.query(`SELECT id FROM jonas_conversations WHERE user_id = $1 AND kind = 'simulador' AND attempt_id = $2 AND item_position = $3`, [userId, attemptId, position])
  const existing = await find()
  if (existing.rowCount) return existing.rows[0].id as string
  const id = `jonas-${randomUUID()}`
  await pool.query(
    `INSERT INTO jonas_conversations (id, user_id, kind, title, subject_id, attempt_id, question_id, item_position)
     VALUES ($1, $2, 'simulador', $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, attempt_id, item_position) WHERE kind = 'simulador' AND attempt_id IS NOT NULL DO NOTHING`,
    [id, userId, `Explicação · ${target.question.subject}`.slice(0, 120), target.subjectId, attemptId, target.questionId, position],
  )
  const created = await find()
  return created.rows[0].id as string
}

export async function getExplainMessages(userId: string, attemptId: string, position: number): Promise<ChatMessage[]> {
  const rows = await pool.query(
    `SELECT m.id::text AS id, m.role, m.content FROM jonas_messages m JOIN jonas_conversations c ON c.id = m.conversation_id
     WHERE c.user_id = $1 AND c.kind = 'simulador' AND c.attempt_id = $2 AND c.item_position = $3 ORDER BY m.id`,
    [userId, attemptId, position],
  )
  return rows.rows.map((row) => ({ id: row.id as string, role: row.role as 'user' | 'assistant', content: row.content as string }))
}
