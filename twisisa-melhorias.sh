#!/usr/bin/env bash
# Twisisa: onboarding com escolha de começar agora ou depois, percurso «Outra», selectores personalizados,
# textos de ajuda, notificações compactas e cores sem cinzento.
# Correr na raiz do projecto (pasta com package.json). Para saltar a migração: SKIP_MIGRATE=1 bash este-script.sh
set -e

if [ ! -f package.json ] || ! grep -q '"name": "twisisa"' package.json; then
  echo "Corre este script na raiz do projecto twisisa (onde está o package.json)."
  exit 1
fi

mkdir -p "app/aluno/notificacoes/[id]" components/onboarding components/skeletons database/migrations tests

echo "Escrever database/migrations/0025_outra_classe_notificacoes.sql"
cat > "database/migrations/0025_outra_classe_notificacoes.sql" <<'EOF'
-- Percurso «Outra classe» (8ª, 9ª, 11ª ou texto livre) e notificações com imagem e botão.

-- O conteúdo (questões, módulos, disciplinas) continua só nas 10ª, 12ª e admissão: `track` não muda.
-- Quem escolhe «Outra» fica com `track` vazio e a classe em `other_level`.
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS other_level text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_other_level_check') THEN
    ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_other_level_check CHECK (other_level IS NULL OR (char_length(btrim(other_level)) BETWEEN 1 AND 40 AND track IS NULL AND institution_id IS NULL));
  END IF;
END $$;

-- Notificações: texto longo, imagem opcional e botão opcional (mensagens promocionais).
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_href text;
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
EOF

echo "Escrever lib/db/schema.ts"
cat > "lib/db/schema.ts" <<'EOF'
import { bigserial, boolean, date, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull().unique(), emailVerified: boolean('emailVerified').notNull().default(false), image: text('image'), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})
export const session = pgTable('session', { id: text('id').primaryKey(), expiresAt: timestamp('expiresAt').notNull(), token: text('token').notNull().unique(), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow(), ipAddress: text('ipAddress'), userAgent: text('userAgent'), userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }) })
export const account = pgTable('account', { id: text('id').primaryKey(), accountId: text('accountId').notNull(), providerId: text('providerId').notNull(), userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }), accessToken: text('accessToken'), refreshToken: text('refreshToken'), idToken: text('idToken'), accessTokenExpiresAt: timestamp('accessTokenExpiresAt'), refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'), scope: text('scope'), password: text('password'), createdAt: timestamp('createdAt').notNull().defaultNow(), updatedAt: timestamp('updatedAt').notNull().defaultNow() })
export const verification = pgTable('verification', { id: text('id').primaryKey(), identifier: text('identifier').notNull(), value: text('value').notNull(), expiresAt: timestamp('expiresAt').notNull(), createdAt: timestamp('createdAt').defaultNow(), updatedAt: timestamp('updatedAt').defaultNow() })
export const studyProgress = pgTable('study_progress', { id: text('id').primaryKey(), userId: text('userId').notNull(), weeklyProgress: integer('weeklyProgress').notNull().default(0), streakDays: integer('streakDays').notNull().default(0), updatedAt: timestamp('updatedAt').notNull().defaultNow() })
export const studyQuizzes = pgTable('study_quizzes', { id: text('id').primaryKey(), title: text('title').notNull(), subject: text('subject').notNull(), description: text('description').notNull(), questions: jsonb('questions').notNull(), createdAt: timestamp('created_at').notNull().defaultNow() })
export const quizAttempts = pgTable('quiz_attempts', { id: text('id').primaryKey(), userId: text('user_id').notNull(), quizId: text('quiz_id').notNull(), score: integer('score').notNull(), total: integer('total').notNull(), answers: jsonb('answers').notNull(), completedAt: timestamp('completed_at').notNull().defaultNow() })
export const notifications = pgTable('notifications', { id: text('id').primaryKey(), userId: text('user_id').notNull(), title: text('title').notNull(), body: text('body').notNull(), kind: text('kind').notNull().default('system'), imageUrl: text('image_url'), actionLabel: text('action_label'), actionHref: text('action_href'), readAt: timestamp('read_at'), createdAt: timestamp('created_at').notNull().defaultNow() })
export const posts = pgTable('posts', { id: text('id').primaryKey(), userId: text('user_id').notNull(), body: text('body').notNull(), createdAt: timestamp('created_at').notNull().defaultNow() })
export const follows = pgTable('follows', { followerId: text('follower_id').notNull(), followingId: text('following_id').notNull(), createdAt: timestamp('created_at').notNull().defaultNow() })
export const postLikes = pgTable('post_likes', { postId: text('post_id').notNull(), userId: text('user_id').notNull(), createdAt: timestamp('created_at').notNull().defaultNow() })
export const institutions = pgTable('institutions', { id: text('id').primaryKey(), shortName: text('short_name').notNull().unique(), name: text('name').notNull(), kind: text('kind').notNull().default('universidade'), description: text('description'), logoUrl: text('logo_url'), city: text('city'), province: text('province'), active: boolean('active').notNull().default(true), sortOrder: integer('sort_order').notNull().default(0), showWhenEmpty: boolean('show_when_empty').notNull().default(false), createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow() })
export const studentProfiles = pgTable('student_profiles', { userId: text('user_id').primaryKey(), phone: text('phone'), nickname: text('nickname'), track: text('track'), institutionId: text('institution_id'), targetCourse: text('target_course'), targetScore: integer('target_score').notNull().default(12), province: text('province'), school: text('school'), otherLevel: text('other_level'), showInRanking: boolean('show_in_ranking').notNull().default(true), birthDate: date('birth_date'), dailyGoal: integer('daily_goal'), onboardedAt: timestamp('onboarded_at', { withTimezone: true }), createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow() })
export const subscriptions = pgTable('subscriptions', { userId: text('user_id').primaryKey(), productId: text('product_id').notNull(), status: text('status').notNull(), stripeCustomerId: text('stripe_customer_id'), stripeSubscriptionId: text('stripe_subscription_id'), createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow() })
export const accountConsents = pgTable('account_consents', { id: bigserial('id', { mode: 'number' }).primaryKey(), userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), kind: text('kind').notNull(), version: text('version').notNull(), acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(), ip: text('ip') })
export const notificationPrefs = pgTable('notification_prefs', { userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }), emailEnabled: boolean('email_enabled').notNull().default(false), pushEnabled: boolean('push_enabled').notNull().default(false), categories: jsonb('categories').notNull().default({}), unsubscribeToken: text('unsubscribe_token').notNull().unique(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow() })
export const studyDays = pgTable('study_days', { userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }), day: date('day').notNull(), questions: integer('questions').notNull().default(0), materials: integer('materials').notNull().default(0), jonasMessages: integer('jonas_messages').notNull().default(0) }, (table) => [primaryKey({ columns: [table.userId, table.day] })])
EOF

echo "Escrever lib/percurso.ts"
cat > "lib/percurso.ts" <<'EOF'
// Percurso do aluno: o que está a preparar. As classes principais são uma lista fixa (não se gerem no admin).
// O conteúdo (questões, módulos, disciplinas) existe só para estas três: `Track`.
export const TRACKS = [
  { value: '10', label: '10ª classe', description: 'Ensino secundário. Não precisa de instituição.' },
  { value: '12', label: '12ª classe', description: 'Ensino secundário. Não precisa de instituição.' },
  { value: 'admissao', label: 'Admissão ao ensino superior', description: 'Escolhes a instituição a que te candidatas.' },
] as const

export type Track = (typeof TRACKS)[number]['value']

export function isTrack(value: unknown): value is Track {
  return TRACKS.some((track) => track.value === value)
}

export function trackLabel(value: string | null | undefined) {
  return TRACKS.find((track) => track.value === value)?.label ?? null
}

// «Outra classe»: quem não prepara a 10ª, a 12ª nem a admissão. Fica guardada em `other_level` (e `track` fica vazio).
export const OTHER_LEVELS = [
  { value: '8', label: '8ª classe' },
  { value: '9', label: '9ª classe' },
  { value: '11', label: '11ª classe' },
] as const

export const OTHER_LEVEL_MAX = 40

export function isPresetLevel(value: string | null | undefined) {
  return OTHER_LEVELS.some((level) => level.value === value)
}

/** Texto da «outra classe» limpo, ou null se não serve (vazio, 1 letra, ou comprido demais). */
export function cleanOtherLevel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, OTHER_LEVEL_MAX)
  if (isPresetLevel(text)) return text
  return text.length >= 2 ? text : null
}

export function otherLevelLabel(value: string | null | undefined) {
  if (!value) return null
  return OTHER_LEVELS.find((level) => level.value === value)?.label ?? value
}

/** Nome do percurso para mostrar: classe principal ou «outra classe». */
export function levelLabel(track: string | null | undefined, otherLevel: string | null | undefined) {
  return trackLabel(track) ?? otherLevelLabel(otherLevel)
}
EOF

echo "Escrever lib/onboarding.ts"
cat > "lib/onboarding.ts" <<'EOF'
import { cache } from 'react'
import { pool } from '@/lib/db'
import { TERMS_VERSION } from '@/lib/identity'
import { isTrack } from '@/lib/percurso'

// Estado do onboarding (só servidor). O passo calcula-se pelo que falta; não há tabela de passos.
// 1. Sobre ti: data de nascimento (e aceitação dos Termos se ainda não existe para a versão actual).
// 2. O que preparas: percurso, instituição (admissão) e meta diária.
// 3. Lembretes: escolha registada em notification_prefs.

export type OnboardingStep = 1 | 2 | 3

export type OnboardingState = {
  name: string
  email: string
  birthDate: string | null
  track: string | null
  otherLevel: string | null
  institutionId: string | null
  dailyGoal: number | null
  hasConsent: boolean
  hasPrefs: boolean
  /** Primeiro passo em falta, ou null se o onboarding está completo. */
  step: OnboardingStep | null
}

export function nextStep(input: { birthDate: string | null; hasConsent: boolean; track: string | null; otherLevel?: string | null; institutionId: string | null; dailyGoal: number | null; hasPrefs: boolean }): OnboardingStep | null {
  if (!input.birthDate || !input.hasConsent) return 1
  const hasPath = isTrack(input.track) ? input.track !== 'admissao' || Boolean(input.institutionId) : Boolean(input.otherLevel)
  if (!hasPath || !input.dailyGoal) return 2
  if (!input.hasPrefs) return 3
  return null
}

export const getOnboardingState = cache(async (userId: string): Promise<OnboardingState> => {
  const result = await pool.query(
    `SELECT u.name, u.email,
            to_char(p.birth_date, 'YYYY-MM-DD') AS birth_date, p.track, p.other_level, p.institution_id, p.daily_goal,
            EXISTS (SELECT 1 FROM account_consents c WHERE c.user_id = u.id AND c.kind = 'terms' AND c.version = $2) AS has_consent,
            EXISTS (SELECT 1 FROM notification_prefs n WHERE n.user_id = u.id) AS has_prefs
     FROM "user" u LEFT JOIN student_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId, TERMS_VERSION],
  )
  const row = result.rows[0]
  const state = {
    name: (row?.name as string) ?? '',
    email: (row?.email as string) ?? '',
    birthDate: (row?.birth_date as string | null) ?? null,
    track: (row?.track as string | null) ?? null,
    otherLevel: (row?.other_level as string | null) ?? null,
    institutionId: (row?.institution_id as string | null) ?? null,
    dailyGoal: (row?.daily_goal as number | null) ?? null,
    hasConsent: row?.has_consent === true,
    hasPrefs: row?.has_prefs === true,
  }
  return { ...state, step: nextStep(state) }
})
EOF

echo "Escrever lib/perfil.ts"
cat > "lib/perfil.ts" <<'EOF'
// Regras do perfil do aluno (puras, sem segredos): províncias, foto e completude.

export const PROVINCES = [
  'Cidade de Maputo',
  'Maputo',
  'Gaza',
  'Inhambane',
  'Sofala',
  'Manica',
  'Tete',
  'Zambézia',
  'Nampula',
  'Niassa',
  'Cabo Delgado',
] as const

export function isProvince(value: unknown): value is (typeof PROVINCES)[number] {
  return PROVINCES.some((province) => province === value)
}

// Pasta e nome do ficheiro da foto no Cloudinary: uma foto por aluno (a nova substitui a antiga).
export const AVATAR_FOLDER = 'estuda-mz/avatares'

// Foto quadrada, centrada no rosto, leve e no melhor formato para o aparelho.
export function avatarUrl(url: string | null | undefined, size = 160) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'res.cloudinary.com') return url
    return url.replace('/image/upload/', `/image/upload/c_fill,g_face,w_${size},h_${size},f_auto,q_auto/`)
  } catch {
    return null
  }
}

export type ProfileStep = { key: string; label: string; done: boolean }

// O que conta para a completude. O telefone é opcional e não conta.
export function profileSteps(input: {
  image: string | null
  nickname: string | null
  province: string | null
  school: string | null
  track: string | null
  otherLevel?: string | null
  institutionId: string | null
  targetCourse: string | null
}): ProfileStep[] {
  const steps: ProfileStep[] = [
    { key: 'foto', label: 'Foto', done: !!input.image },
    { key: 'nickname', label: '@nickname', done: !!input.nickname },
    { key: 'escola', label: 'Escola', done: !!input.province && !!input.school },
    { key: 'percurso', label: 'Percurso', done: !!input.track || !!input.otherLevel },
  ]
  if (input.track === 'admissao') {
    steps.push({ key: 'instituicao', label: 'Instituição', done: !!input.institutionId })
    steps.push({ key: 'curso', label: 'Curso alvo', done: !!input.targetCourse })
  }
  return steps
}

// Nome público: primeiro nome e inicial do último («Amélia M.»). Nunca o nome completo.
export function publicName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Estudante'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1].slice(0, 1).toUpperCase()}.`
}
EOF

echo "Escrever lib/jonas.ts"
cat > "lib/jonas.ts" <<'EOF'
import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { levelLabel, trackLabel } from '@/lib/percurso'
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
    pool.query(`SELECT p.track, p.other_level, i.short_name FROM student_profiles p LEFT JOIN institutions i ON i.id = p.institution_id WHERE p.user_id = $1`, [userId]),
    subjectId ? pool.query(`SELECT name FROM library_subjects WHERE id = $1`, [subjectId]) : Promise.resolve(null),
    pool.query(
      `SELECT title FROM jonas_conversations WHERE user_id = $1 AND kind = 'chat' AND title <> $3 AND ($2::text IS NULL OR id <> $2) ORDER BY updated_at DESC LIMIT 6`,
      [userId, conversationId, NEW_TITLE],
    ),
  ])
  const track = profile.rows[0]?.track as string | undefined
  const institution = profile.rows[0]?.short_name as string | null | undefined
  const base = levelLabel(track, profile.rows[0]?.other_level as string | null | undefined)
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
EOF

echo "Escrever lib/simulator-scope.ts"
cat > "lib/simulator-scope.ts" <<'EOF'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { requireStudent } from '@/lib/require-student'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { isTrack } from '@/lib/percurso'
import type { StudentScope } from '@/lib/simulator'

/** Sessão + percurso do aluno para as páginas do Simulador (só servidor). Sem sessão ou percurso, redireciona. */
export async function requireSimulatorScope() {
  const session = await requireStudent()
  const [profile] = await db.select({ track: studentProfiles.track, otherLevel: studentProfiles.otherLevel, institutionId: studentProfiles.institutionId }).from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)).limit(1)
  // Sem questões para «outra classe»: o painel explica, em vez de pedir de novo o percurso.
  if (!isTrack(profile?.track)) redirect(profile?.otherLevel ? '/aluno' : '/aluno/percurso')
  const scope: StudentScope = { userId: session.user.id, track: profile.track, institutionId: profile.institutionId ?? null }
  return { scope, firstName: session.user.name.split(' ')[0] }
}
EOF

echo "Escrever lib/notifications-shared.ts"
cat > "lib/notifications-shared.ts" <<'EOF'
// Apresentação das notificações (pura, sem acesso à base de dados).

const KINDS: Record<string, string> = {
  'boas-vindas': 'Boas-vindas',
  promo: 'Novidade',
  system: 'Aviso',
}

export function kindLabel(kind: string) {
  return KINDS[kind] ?? 'Aviso'
}

/** Primeira linha do texto, para a lista (a mensagem inteira só aparece ao abrir). */
export function previewOf(body: string) {
  return body.replace(/\s+/g, ' ').trim()
}

/** Só imagens https. */
export function safeImage(url: string | null | undefined) {
  return url && /^https:\/\//i.test(url) ? url : null
}

/** Só caminhos internos («/biblioteca») ou ligações https. */
export function safeAction(href: string | null | undefined) {
  if (!href) return null
  if (href.startsWith('/') && !href.startsWith('//')) return href
  return /^https:\/\//i.test(href) ? href : null
}
EOF

echo "Escrever components/track-choice.tsx"
cat > "components/track-choice.tsx" <<'EOF'
'use client'

import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { isPresetLevel, OTHER_LEVEL_MAX, OTHER_LEVELS, TRACKS, type Track } from '@/lib/percurso'

export type TrackValue = { track: Track | null; otherLevel: string | null }

const option = (selected: boolean) =>
  `flex h-[48px] w-full items-center justify-between rounded-2xl border px-4 text-left text-[15px] font-semibold transition ${selected ? 'border-2 border-[#1d4d41] bg-[#f3f7f4] text-[#1d4d41]' : 'border-[#e3e5dc] bg-white text-[#202321] hover:border-[#1d4d41]'}`

// Escolha do percurso. Principais: 10ª, 12ª, Admissão e Outra. Ao tocar em «Outra», as principais saem e entram a 8ª, a 9ª, a 11ª
// e um campo para escrever outra classe. A seta no topo volta às principais. Usado no onboarding e em /aluno/percurso.
export function TrackChoice({ value, onChange, disabled = false }: { value: TrackValue; onChange: (next: TrackValue) => void; disabled?: boolean }) {
  const [other, setOther] = useState(Boolean(value.otherLevel))
  const custom = value.otherLevel && !isPresetLevel(value.otherLevel) ? value.otherLevel : ''

  if (other) {
    return (
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Outra classe">
        <button type="button" onClick={() => { setOther(false); onChange({ track: null, otherLevel: null }) }} disabled={disabled} className="-ml-1 mb-1 flex h-9 w-fit items-center gap-1.5 rounded-full px-2 text-[14px] font-semibold text-[#1d4d41]">
          <ArrowLeft size={16} aria-hidden="true" />
          Outra classe
        </button>
        {OTHER_LEVELS.map((level) => {
          const selected = value.otherLevel === level.value
          return (
            <button key={level.value} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onChange({ track: null, otherLevel: level.value })} className={option(selected)}>
              {level.label}
              {selected && <Check size={18} aria-hidden="true" />}
            </button>
          )
        })}
        <input
          value={custom}
          onChange={(event) => onChange({ track: null, otherLevel: event.target.value.slice(0, OTHER_LEVEL_MAX) || null })}
          disabled={disabled}
          maxLength={OTHER_LEVEL_MAX}
          placeholder="Outra: escreve aqui"
          aria-label="Outra classe, escreve qual"
          className={`h-[48px] w-full rounded-2xl border px-4 text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-[#3f6357] focus:border-[#1d4d41] ${custom ? 'border-2 border-[#1d4d41] bg-[#f3f7f4]' : 'border-[#e3e5dc] bg-white'}`}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="O que preparas">
      {TRACKS.map((item) => {
        const selected = value.track === item.value
        return (
          <button key={item.value} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onChange({ track: item.value, otherLevel: null })} className={option(selected)}>
            {item.label}
            {selected && <Check size={18} aria-hidden="true" />}
          </button>
        )
      })}
      <button type="button" role="radio" aria-checked={false} disabled={disabled} onClick={() => { setOther(true); onChange({ track: null, otherLevel: null }) }} className={option(false)}>
        Outra
      </button>
    </div>
  )
}
EOF

echo "Escrever components/percurso-picker.tsx"
cat > "components/percurso-picker.tsx" <<'EOF'
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { savePercurso } from '@/app/aluno/percurso/actions'
import { TrackChoice, type TrackValue } from '@/components/track-choice'
import { cleanOtherLevel, type Track } from '@/lib/percurso'
import { Spinner } from '@/components/ui/spinner'

export type PickerInstitution = {
  id: string
  shortName: string
  name: string
  description: string | null
  logoUrl: string | null
  soon: boolean
}

// Descrições podem trazer **negrito** (como já acontecia no perfil).
function bold(text: string | null) {
  if (!text) return null
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) => (part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part))
}

export function PercursoPicker({ initialTrack, initialOtherLevel, initialInstitutionId, institutions }: { initialTrack: Track | null; initialOtherLevel: string | null; initialInstitutionId: string | null; institutions: PickerInstitution[] }) {
  const feedback = useFeedback()
  const router = useRouter()
  const [choice, setChoice] = useState<TrackValue>({ track: initialTrack, otherLevel: initialTrack ? null : initialOtherLevel })
  // Se a instituição guardada já não está disponível, o aluno escolhe outra.
  const [institutionId, setInstitutionId] = useState<string | null>(institutions.some((item) => item.id === initialInstitutionId) ? initialInstitutionId : null)
  const [pending, setPending] = useState(false)

  const needsInstitution = choice.track === 'admissao'
  const hasChoice = choice.track ? !needsInstitution || Boolean(institutionId) : Boolean(cleanOtherLevel(choice.otherLevel))
  const canSave = hasChoice && !pending

  async function save() {
    if (!canSave) return
    setPending(true)
    try {
      const data = new FormData()
      if (choice.track) data.set('track', choice.track)
      else data.set('otherLevel', choice.otherLevel ?? '')
      if (needsInstitution && institutionId) data.set('institutionId', institutionId)
      const result = await savePercurso(data)
      if (result.ok) {
        feedback.success(result.message ?? 'Percurso guardado.')
        router.push('/aluno')
        router.refresh()
      } else {
        feedback.error(result.message)
      }
    } catch {
      feedback.error('Não foi possível guardar o percurso. Tenta outra vez.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <section aria-labelledby="percurso-titulo">
        <h2 id="percurso-titulo" className="text-base font-semibold">O que estás a preparar?</h2>
        <div className="mt-4">
          <TrackChoice value={choice} onChange={setChoice} disabled={pending} />
        </div>
      </section>

      {needsInstitution && (
        <section aria-labelledby="instituicao-titulo">
          <h2 id="instituicao-titulo" className="text-base font-semibold">A que instituição te candidatas?</h2>
          {institutions.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-[#d5dacd] bg-white p-5 text-sm leading-6 text-[#3f6357]">Ainda não há instituições disponíveis. Volta mais tarde ou escolhe a 10ª ou a 12ª classe.</p>
          ) : (
            <div role="radiogroup" aria-labelledby="instituicao-titulo" className="mt-4 grid gap-3 sm:grid-cols-2">
              {institutions.map((item) => {
                const selected = institutionId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setInstitutionId(item.id)}
                    className={`flex items-center gap-3 rounded-3xl border bg-white p-4 text-left transition ${selected ? 'border-2 border-[#1d4d41] bg-[#f3f7f4]' : 'border-[#e3e5dc] hover:border-[#c4d3c8]'}`}
                  >
                    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e3e5dc] bg-[#f3f4ef] text-xs font-bold text-[#1d4d41]">
                      {item.logoUrl ? <img src={item.logoUrl} alt="" className="size-full object-contain" /> : item.shortName}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">{item.shortName}{item.soon && <span className="rounded-full bg-[#f4eddb] px-2 py-0.5 text-[10px] font-semibold text-[#805f19]">Em breve</span>}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#3f6357]">{item.name}</span>
                      {item.description && <span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#3f6357]">{bold(item.description)}</span>}
                    </span>
                    {selected ? <Check size={18} aria-hidden="true" className="shrink-0 text-[#1d4d41]" /> : <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-[#3f6357]" />}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1d4d41] text-sm font-semibold text-white shadow-sm hover:bg-[#163e34] disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit sm:px-10"
      >
        {pending ? <><Spinner />A guardar…</> : 'Guardar percurso'}
      </button>
    </div>
  )
}
EOF

echo "Escrever components/onboarding/onboarding-flow.tsx"
cat > "components/onboarding/onboarding-flow.tsx" <<'EOF'
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { checkBirth, DAILY_GOALS, DEFAULT_DAILY_GOAL, MAX_AGE, MIN_AGE, maputoDay } from '@/lib/identity'
import { SelectField } from '@/components/ui/select-field'
import { TrackChoice, type TrackValue } from '@/components/track-choice'
import { cleanOtherLevel, isTrack } from '@/lib/percurso'
import { listFirstSubjects, saveAboutYou, saveReminders, saveTrackAndGoal, startFirstSession, type FirstSubjects } from '@/app/aluno/bem-vindo/actions'

type Institution = { id: string; shortName: string; name: string; soon: boolean }
type Step = 1 | 2 | 3
type Phase = Step | 'ready'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const field = 'h-12 w-full rounded-xl border border-[#dfe1d9] bg-white px-3 text-[15px] outline-none focus:border-[#1d4d41]'
// Selectores personalizados (sem o menu nativo do sistema).
const pick = 'h-12 rounded-xl border border-[#dfe1d9] bg-white px-3 text-[15px] font-normal outline-none focus-visible:border-[#1d4d41]'
const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }))
const MONTH_OPTIONS = MONTHS.map((label, index) => ({ value: String(index + 1), label }))
const primary = 'flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#1d4d41] text-[15px] font-semibold text-white transition hover:bg-[#153e34] disabled:opacity-50'

// Três ecrãs, cada um num ecrã de 360x640 sem scroll. Cada passo é guardado no servidor ao avançar (retoma onde parou).
export function OnboardingFlow({
  initialStep,
  initialName,
  initialBirth,
  needsConsent,
  initialTrack,
  initialOtherLevel,
  initialInstitutionId,
  initialGoal,
  institutions,
}: {
  initialStep: Step
  initialName: string
  initialBirth: string | null
  needsConsent: boolean
  initialTrack: string | null
  initialOtherLevel: string | null
  initialInstitutionId: string | null
  initialGoal: number | null
  institutions: Institution[]
}) {
  const router = useRouter()
  const feedback = useFeedback()
  const [step, setStep] = useState<Phase>(initialStep)
  const [first, setFirst] = useState<FirstSubjects | null>(null)
  const [picking, setPicking] = useState(false)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [underAge, setUnderAge] = useState(false)

  const [name, setName] = useState(initialName)
  const [year, setYear] = useState(initialBirth ? String(Number(initialBirth.slice(0, 4))) : '')
  const [month, setMonth] = useState(initialBirth ? String(Number(initialBirth.slice(5, 7))) : '')
  const [day, setDay] = useState(initialBirth ? String(Number(initialBirth.slice(8, 10))) : '')
  const [accepted, setAccepted] = useState(false)

  const [choice, setChoice] = useState<TrackValue>({ track: isTrack(initialTrack) ? initialTrack : null, otherLevel: isTrack(initialTrack) ? null : initialOtherLevel })
  const track = choice.track
  const [institutionId, setInstitutionId] = useState(institutions.some((item) => item.id === initialInstitutionId) ? (initialInstitutionId ?? '') : '')
  const [goal, setGoal] = useState<number>(initialGoal ?? DEFAULT_DAILY_GOAL)

  const years = useMemo(() => {
    const current = maputoDay().year
    return Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, index) => current - MIN_AGE - index)
  }, [])

  const yearOptions = useMemo(() => years.map((n) => ({ value: String(n), label: String(n) })), [years])

  const birthComplete = Boolean(day && month && year)
  // Mostra o erro de uma data impossível (31 de Fevereiro, por exemplo). O limite de 13 anos é decidido no servidor.
  const birthCheck = birthComplete ? checkBirth({ year, month, day }) : null
  const birthError = birthCheck && !birthCheck.ok && birthCheck.code !== 'under_age' ? birthCheck.message : null
  const aboutValid = name.trim().length >= 2 && birthComplete && !birthError && (!needsConsent || accepted)
  const trackValid = track ? track !== 'admissao' || Boolean(institutionId) : Boolean(cleanOtherLevel(choice.otherLevel))

  async function run<T>(task: () => Promise<T>, onError = 'Não foi possível guardar. Tenta outra vez.'): Promise<T | null> {
    setPending(true)
    try {
      return await task()
    } catch {
      feedback.error(onError)
      return null
    } finally {
      setPending(false)
    }
  }

  async function submitAbout() {
    if (!aboutValid || pending) return
    const result = await run(() => saveAboutYou({ name, day: Number(day), month: Number(month), year: Number(year), acceptTerms: accepted }))
    if (!result) return
    if (result.ok) return setStep(2)
    if (result.underAge) {
      authClient.signOut().catch(() => undefined)
      return setUnderAge(true)
    }
    feedback.error(result.message)
  }

  async function submitTrack() {
    if (!trackValid || pending) return
    const result = await run(() => saveTrackAndGoal({ track, otherLevel: track ? null : choice.otherLevel, institutionId: track === 'admissao' ? institutionId : null, dailyGoal: goal }))
    if (!result) return
    if (result.ok) return setStep(3)
    feedback.error(result.message)
  }

  // Guarda o lembrete e pergunta se quer praticar agora. O estudante decide: nada começa sozinho.
  async function submitReminders(choiceMade: 'email' | 'none') {
    if (pending) return
    setPending(true)
    try {
      const result = await saveReminders({ choice: choiceMade })
      if (!result.ok) {
        feedback.error(result.message)
        return
      }
      const subjects = await listFirstSubjects().catch(() => ({ subjects: [], goal: 0 }))
      if (subjects.subjects.length === 0) {
        // Ainda não há questões para este percurso: o painel serve.
        router.replace('/aluno')
        router.refresh()
        return
      }
      setFirst(subjects)
      setPicking(false)
      setStep('ready')
    } catch {
      feedback.error('Não foi possível guardar. Tenta outra vez.')
    } finally {
      setPending(false)
    }
  }

  function goToPanel() {
    router.replace('/aluno')
    router.refresh()
  }

  async function startWith(subjectId: string) {
    if (startingId) return
    setStartingId(subjectId)
    try {
      const result = await startFirstSession({ subjectId })
      if (!result.href) {
        feedback.error(result.message ?? 'Não foi possível começar agora. Podes começar no Simulador.')
        setStartingId(null)
        return
      }
      router.replace(result.href)
      router.refresh()
    } catch {
      feedback.error('Sem ligação. Verifica a internet e tenta outra vez.')
      setStartingId(null)
    }
  }

  if (underAge) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-[420px] flex-col justify-center gap-5 px-5 text-[#202321]">
        <h1 className="text-2xl font-medium tracking-[-0.05em]">O Twisisa é para maiores de {MIN_AGE} anos</h1>
        <p className="text-[15px] leading-6 text-[#3f6357]">Não guardámos nenhum dado teu. Quando fizeres {MIN_AGE} anos, volta e cria a tua conta.</p>
        <Link href="/" className={primary}>Voltar ao início</Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[420px] flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] text-[#202321]">
      <header className="flex h-12 items-center justify-between">
        {typeof step === 'number' && step > 1 ? (
          <button type="button" onClick={() => setStep((step - 1) as Step)} disabled={pending} aria-label="Voltar" className="-ml-2 flex size-11 items-center justify-center text-[#1d4d41]">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        ) : step === 'ready' && picking ? (
          <button type="button" onClick={() => setPicking(false)} disabled={Boolean(startingId)} aria-label="Voltar" className="-ml-2 flex size-11 items-center justify-center text-[#1d4d41]">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        ) : (
          <span className="size-11" aria-hidden="true" />
        )}
        <div role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step === 'ready' ? 3 : step} aria-label={step === 'ready' ? 'Tudo pronto' : `Passo ${step} de 3`} className="flex gap-1.5">
          {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 w-6 rounded-full ${step === 'ready' || n <= step ? 'bg-[#1d4d41]' : 'bg-[#cfe0d6]'}`} />)}
        </div>
        {/* A acção que se pode dispensar fica longe das principais: no canto de cima, à direita, com cor visível. */}
        {step === 3 ? (
          <button type="button" onClick={() => submitReminders('none')} disabled={pending} className="-mr-2 flex h-11 items-center px-2 text-[14px] font-semibold text-[#1d4d41]">Agora não</button>
        ) : step === 'ready' ? (
          <button type="button" onClick={goToPanel} disabled={Boolean(startingId)} className="-mr-2 flex h-11 items-center px-2 text-[14px] font-semibold text-[#1d4d41]">Mais tarde</button>
        ) : (
          <span className="size-11" aria-hidden="true" />
        )}
      </header>

      {step === 1 && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">Sobre ti</h1>

          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Como te chamas?
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} placeholder="O teu nome" className={field} />
            </label>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">Data de nascimento</legend>
              <div className="grid grid-cols-[72px_1fr_92px] gap-2">
                <SelectField name="dia" label="Dia" placeholder="Dia" defaultValue={day} onValueChange={setDay} triggerClassName={pick} options={DAY_OPTIONS} />
                <SelectField name="mes" label="Mês" placeholder="Mês" defaultValue={month} onValueChange={setMonth} triggerClassName={pick} options={MONTH_OPTIONS} />
                <SelectField name="ano" label="Ano" placeholder="Ano" defaultValue={year} onValueChange={setYear} triggerClassName={pick} options={yearOptions} />
              </div>
              {birthError && <p className="text-[13px] text-[#b03a28]">{birthError}</p>}
            </fieldset>

            {needsConsent && (
              <label className="flex items-start gap-3 text-[13px] leading-5 text-[#3f6357]">
                <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#1d4d41]" />
                <span>Aceito os <Link href="/termos" target="_blank" className="font-semibold text-[#1d4d41] underline">Termos</Link> e a <Link href="/privacidade" target="_blank" className="font-semibold text-[#1d4d41] underline">Privacidade</Link>.</span>
              </label>
            )}
          </div>

          <div className="mt-auto pt-5">
            <button type="button" onClick={submitAbout} disabled={!aboutValid || pending} aria-busy={pending} className={primary}>{pending ? <><Spinner />A guardar…</> : 'Continuar'}</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">O que preparas?</h1>

          <div className="mt-4">
            <TrackChoice value={choice} onChange={setChoice} disabled={pending} />
          </div>

          {track === 'admissao' && (
            <div className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
              A que instituição te candidatas?
              {institutions.length === 0 ? (
                <span className="rounded-xl border border-dashed border-[#d5dacd] bg-white p-3 text-[13px] font-normal text-[#3f6357]">Ainda não há instituições disponíveis. Escolhe a 10ª ou a 12ª classe.</span>
              ) : (
                <SelectField
                  name="instituicao"
                  label="Instituição"
                  placeholder="Escolhe a instituição"
                  defaultValue={institutionId}
                  onValueChange={setInstitutionId}
                  triggerClassName={pick}
                  options={institutions.map((item) => ({ value: item.id, label: `${item.shortName} · ${item.name}${item.soon ? ' (em breve)' : ''}` }))}
                />
              )}
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium" id="meta-titulo">Quantas questões queres responder por dia?</p>
            <div role="radiogroup" aria-labelledby="meta-titulo" className="mt-2 grid grid-cols-3 gap-2">
              {DAILY_GOALS.map((item) => {
                const selected = goal === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setGoal(item.value)}
                    className={`flex h-[64px] flex-col items-center justify-center rounded-2xl border transition ${selected ? 'border-2 border-[#1d4d41] bg-[#f3f7f4] text-[#1d4d41]' : 'border-[#e3e5dc] bg-white'}`}
                  >
                    <span className="text-[20px] font-semibold leading-6">{item.value}</span>
                    <span className="text-[11px] text-[#3f6357]">{item.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-auto pt-5">
            <button type="button" onClick={submitTrack} disabled={!trackValid || pending} aria-busy={pending} className={primary}>{pending ? <><Spinner />A guardar…</> : 'Continuar'}</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">Lembretes</h1>
          <p className="mt-1.5 text-[14px] leading-5 text-[#3f6357]">Escolhe se queres receber um aviso por e-mail quando passarem dias sem estudar. Podes mudar quando quiseres.</p>

          <div className="mt-5 flex flex-col gap-2.5">
            <button type="button" onClick={() => submitReminders('email')} disabled={pending} aria-busy={pending} className={primary}>
              {pending ? <><Spinner />A guardar…</> : 'Receber por e-mail'}
            </button>
          </div>

          {/* Avisos no telemóvel ainda não existem (Web Push, fase G): fica fora do caminho, em baixo à esquerda, com cor visível. */}
          <p className="mt-auto pt-5 text-[13px] font-semibold text-[#1d4d41]">Avisos no telemóvel: em breve</p>
        </section>
      )}

      {step === 'ready' && first && !picking && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">Queres praticar agora?</h1>
          <p className="mt-1.5 text-[14px] leading-5 text-[#3f6357]">Escolhes a disciplina e respondes a {first.goal} questões. Se preferires, começas mais tarde pelo painel.</p>
          <div className="mt-auto pt-5">
            <button type="button" onClick={() => setPicking(true)} className={primary}>Escolher a disciplina</button>
          </div>
        </section>
      )}

      {step === 'ready' && first && picking && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">Escolhe a disciplina</h1>
          <div className="mt-4 flex flex-col gap-2">
            {first.subjects.map((item) => {
              const busy = startingId === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => startWith(item.id)}
                  disabled={Boolean(startingId)}
                  aria-busy={busy}
                  className="flex h-[52px] items-center justify-between gap-3 rounded-2xl border border-[#e3e5dc] bg-white px-4 text-left text-[15px] font-semibold transition hover:border-[#1d4d41] disabled:opacity-60"
                >
                  <span className="min-w-0 truncate">{item.name}</span>
                  {busy ? <Spinner /> : <span className="shrink-0 text-[12px] font-medium text-[#3f6357]">{item.count} {item.count === 1 ? 'questão' : 'questões'}</span>}
                </button>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
EOF

echo "Escrever components/notifications-feed.tsx"
cat > "components/notifications-feed.tsx" <<'EOF'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { relativeTime } from '@/lib/relative-time'
import { kindLabel, previewOf, safeImage } from '@/lib/notifications-shared'

type Notification = { id: string; title: string; body: string; kind: string; imageUrl: string | null; readAt: Date | null; createdAt: Date }

// Lista compacta, como as conversas do Jonas: tipo, título, uma linha do texto e a hora. A mensagem inteira (e a imagem,
// nas promocionais) abre ao tocar; abrir é ler, por isso não há botão de «marcar como lida».
export function NotificationsFeed({ items }: { items: Notification[] }) {
  if (items.length === 0) {
    return <div className="rounded-3xl border border-[#e3e5dc] bg-white p-6 text-sm leading-6 text-[#3f6357]">Ainda não tens notificações. Quando houver novidades, aparecem aqui.</div>
  }
  return (
    <ul className="divide-y divide-[#eceee7] overflow-hidden rounded-2xl border border-[#e3e6dc] bg-white">
      {items.map((item) => {
        const unread = !item.readAt
        const image = safeImage(item.imageUrl)
        return (
          <li key={item.id}>
            <Link href={`/aluno/notificacoes/${encodeURIComponent(item.id)}`} className="flex min-h-[72px] items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f3f7f4] focus-visible:bg-[#f3f7f4] focus-visible:outline-none">
              <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${unread ? 'bg-[#1d4d41]' : 'bg-transparent'}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4d41]">{kindLabel(item.kind)}</span>
                  <span className="shrink-0 text-xs text-[#3f6357]">{relativeTime(item.createdAt)}</span>
                </span>
                <span className={`mt-0.5 block truncate text-[15px] text-[#17231d] ${unread ? 'font-semibold' : 'font-medium'}`}>{item.title}</span>
                <span className="block truncate text-[13px] text-[#3f6357]">{previewOf(item.body)}</span>
              </span>
              {image && <img src={image} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl object-cover" />}
              <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-[#1d4d41]" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
EOF

echo "Escrever components/skeletons/notificacoes-skeleton.tsx"
cat > "components/skeletons/notificacoes-skeleton.tsx" <<'EOF'
import { Skeleton } from './skeleton'
import { StudentShellSkeleton } from './student-shell'

/** /aluno/notificacoes: lista compacta (tipo e hora, título, uma linha de texto). */
export function NotificacoesSkeleton() {
  return (
    <StudentShellSkeleton>
      <div className="max-w-[640px] divide-y divide-[#eceee7] overflow-hidden rounded-2xl border border-[#e3e6dc] bg-white">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex min-h-[72px] items-center gap-3 px-4 py-3">
            <Skeleton className="size-2.5 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <Skeleton className="mt-1.5 h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </StudentShellSkeleton>
  )
}
EOF

echo "Escrever components/jonas-chat.tsx"
cat > "components/jonas-chat.tsx" <<'EOF'
'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, PanelLeft, RotateCcw, Square, SquarePen, X } from 'lucide-react'
import { SelectField } from '@/components/ui/select-field'
import { HistorySidebar } from '@/components/jonas/history-sidebar'
import { RichText } from '@/components/jonas/rich-text'
import { CopyButton, JonasAvatar, TypingDots } from '@/components/jonas/ui'
import { JonasRequestError, postStream } from '@/lib/jonas-client'
import type { ChatMessage, ConversationSummary } from '@/lib/jonas'

type UiMessage = ChatMessage
type Props = {
  firstName: string
  trackLabel: string | null
  subjects: { id: string; name: string }[]
  initialConversations: ConversationSummary[]
  loadFailed: boolean
  initialConversation: { summary: ConversationSummary; messages: ChatMessage[] } | null
}

// Exemplos simples e práticos: tocar preenche a caixa de texto (não envia), para o aluno completar.
const STARTERS: { text: string; prefill: (subject: string | null) => string }[] = [
  { text: 'Explica-me um conceito com um exemplo simples', prefill: (s) => `Explica-me ${s ? `um tema de ${s}` : 'um conceito'} com um exemplo simples: ` },
  { text: 'Ajuda-me a resolver um exercício passo a passo', prefill: () => 'Ajuda-me a resolver este exercício passo a passo:\n' },
  { text: 'Faz-me um plano de estudo de 2 semanas', prefill: (s) => `Faz-me um plano de estudo de 2 semanas para ${s ?? 'o meu exame'}.` },
]

export function JonasChat({ firstName, trackLabel, subjects, initialConversations, loadFailed, initialConversation }: Props) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeId, setActiveId] = useState<string | null>(initialConversation?.summary.id ?? null)
  const [messages, setMessages] = useState<UiMessage[]>(initialConversation?.messages ?? [])
  const [subjectId, setSubjectId] = useState<string | null>(initialConversation?.summary.subjectId ?? null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showJump, setShowJump] = useState(false)

  const activeRef = useRef(activeId)
  const abortRef = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const stick = useRef(true)
  const lastUserText = useRef('')
  const subjectIdRef = useRef(subjectId)
  useEffect(() => {
    subjectIdRef.current = subjectId
  }, [subjectId])

  const active = activeId ? (conversations.find((item) => item.id === activeId) ?? (initialConversation && initialConversation.summary.id === activeId ? initialConversation.summary : null)) : null
  const subjectName = active?.subjectName ?? subjects.find((item) => item.id === subjectId)?.name ?? null

  // Se o fluxo estiver a decorrer quando se sai da página, cancela-o (o servidor guarda o que já chegou).
  useEffect(() => () => abortRef.current?.abort(), [])

  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages, streaming, opening])

  useEffect(() => {
    const el = textarea.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`
  }, [input])

  function onScroll() {
    const el = scroller.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    stick.current = near
    setShowJump((current) => (current === !near ? current : !near))
  }

  function jumpToEnd() {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    stick.current = true
    setShowJump(false)
  }

  const adopt = useCallback((headers: Headers | null | undefined) => {
    const id = headers?.get('X-Conversation-Id')
    if (!id) return
    const rawTitle = headers?.get('X-Conversation-Title')
    let title = 'Nova conversa'
    try {
      title = rawTitle ? decodeURIComponent(rawTitle) : title
    } catch {
      // título ilegível: fica o genérico
    }
    const isNew = activeRef.current !== id
    if (isNew) {
      activeRef.current = id
      setActiveId(id)
      window.history.replaceState(null, '', `/jonas?c=${encodeURIComponent(id)}`)
    }
    setConversations((previous) => {
      const existing = previous.find((item) => item.id === id)
      const summary: ConversationSummary = { id, title: existing?.title ?? title, subjectId: existing?.subjectId ?? null, subjectName: existing?.subjectName ?? null, updatedAt: new Date().toISOString() }
      if (!existing && isNew) {
        const chosen = subjects.find((item) => item.id === subjectIdRef.current)
        summary.subjectId = chosen?.id ?? null
        summary.subjectName = chosen?.name ?? null
      }
      return [summary, ...previous.filter((item) => item.id !== id)]
    })
  }, [subjects])

  const send = useCallback(
    async (text: string, regenerate = false) => {
      if (streaming) return
      setError(null)
      const currentId = activeRef.current
      const stamp = Date.now()
      const assistantId = `tmp-a-${stamp}`
      if (!regenerate) lastUserText.current = text
      setMessages((previous) => {
        const base = regenerate && previous.length && previous[previous.length - 1].role === 'assistant' ? previous.slice(0, -1) : previous
        return [...base, ...(regenerate ? [] : [{ id: `tmp-u-${stamp}`, role: 'user' as const, content: text }]), { id: assistantId, role: 'assistant' as const, content: '' }]
      })
      stick.current = true
      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)
      try {
        const { headers } = await postStream(
          '/api/jonas',
          { conversationId: currentId ?? undefined, message: regenerate ? undefined : text, regenerate, subjectId: currentId ? undefined : (subjectIdRef.current ?? undefined) },
          (partial) => setMessages((previous) => previous.map((item) => (item.id === assistantId ? { ...item, content: partial } : item))),
          controller.signal,
        )
        adopt(headers)
      } catch (caught) {
        if (controller.signal.aborted) {
          // O aluno parou a resposta: o que já chegou fica (e o servidor guardou).
        } else if (caught instanceof JonasRequestError) {
          adopt(caught.headers)
          setError(caught.message)
        } else {
          setError('A resposta foi interrompida. Podes pedir de novo.')
        }
      } finally {
        setMessages((previous) => previous.filter((item) => !(item.id === assistantId && !item.content)))
        setStreaming(false)
        abortRef.current = null
      }
    },
    [streaming, adopt],
  )

  function submit(event?: React.FormEvent) {
    event?.preventDefault()
    const text = input.trim()
    if (!text || streaming || opening) return
    setInput('')
    void send(text)
  }

  function retry() {
    if (activeRef.current) return void send('', true)
    // Ainda não há conversa no servidor: volta a enviar a mesma pergunta.
    const text = lastUserText.current
    if (!text) return
    setMessages((previous) => (previous.length && previous[previous.length - 1].role === 'user' ? previous.slice(0, -1) : previous))
    void send(text)
  }

  function stop() {
    abortRef.current?.abort()
  }

  const newChat = useCallback(() => {
    abortRef.current?.abort()
    activeRef.current = null
    setActiveId(null)
    setMessages([])
    setSubjectId(null)
    setError(null)
    setInput('')
    setDrawer(false)
    stick.current = true
    window.history.replaceState(null, '', '/jonas')
    textarea.current?.focus()
  }, [])

  async function openConversation(id: string) {
    setDrawer(false)
    if (id === activeRef.current) return
    abortRef.current?.abort()
    setOpening(true)
    setError(null)
    try {
      const response = await fetch(`/api/jonas/conversas/${encodeURIComponent(id)}`, { credentials: 'same-origin' })
      if (!response.ok) throw new Error('falhou')
      const data = (await response.json()) as { summary: ConversationSummary; messages: ChatMessage[] }
      activeRef.current = id
      setActiveId(id)
      setMessages(data.messages)
      setSubjectId(data.summary.subjectId)
      stick.current = true
      window.history.replaceState(null, '', `/jonas?c=${encodeURIComponent(id)}`)
    } catch {
      setError('Não foi possível abrir a conversa. Tenta de novo.')
    } finally {
      setOpening(false)
    }
  }

  async function renameConversation(id: string, title: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/jonas/conversas/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
      if (!response.ok) throw new Error('falhou')
      setConversations((previous) => previous.map((item) => (item.id === id ? { ...item, title: title.trim().slice(0, 120) } : item)))
      return true
    } catch {
      setError('Não foi possível mudar o nome.')
      return false
    }
  }

  async function deleteConversation(id: string): Promise<boolean> {
    setBusyId(id)
    try {
      const response = await fetch(`/api/jonas/conversas/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('falhou')
      setConversations((previous) => previous.filter((item) => item.id !== id))
      if (activeRef.current === id) newChat()
      return true
    } catch {
      setError('Não foi possível eliminar a conversa.')
      return false
    } finally {
      setBusyId(null)
    }
  }

  function toggleSidebar() {
    if (window.matchMedia('(min-width: 1024px)').matches) setCollapsed((value) => !value)
    else setDrawer((value) => !value)
  }

  function fill(text: string) {
    setInput(text)
    requestAnimationFrame(() => {
      const el = textarea.current
      if (!el) return
      el.focus()
      el.setSelectionRange(text.length, text.length)
    })
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    // No telemóvel o Enter muda de linha (o envio é pelo botão); no computador envia.
    if (window.matchMedia('(pointer: coarse)').matches) return
    event.preventDefault()
    submit()
  }

  const lastIndex = messages.length - 1
  const empty = messages.length === 0

  return (
    <div className="fixed inset-0 flex bg-[#f8f8f5] text-[#202321]">
      {drawer && <button type="button" aria-label="Fechar o histórico" onClick={() => setDrawer(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />}

      <aside
        aria-label="Histórico de conversas"
        className={`fixed inset-y-0 left-0 z-40 w-[300px] max-w-[86vw] border-r border-[#e6e9e0] bg-[#f2f4ee] pt-[env(safe-area-inset-top)] transition-[transform,visibility] duration-200 lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:pt-0 lg:transition-[width,visibility] ${drawer ? 'visible translate-x-0' : 'invisible -translate-x-full'} ${collapsed ? 'lg:invisible lg:w-0 lg:overflow-hidden lg:border-r-0' : 'lg:visible lg:w-[300px]'}`}
      >
        <div className="h-full w-[300px] max-w-[86vw] lg:max-w-none">
          <HistorySidebar conversations={conversations} activeId={activeId} loadFailed={loadFailed} busyId={busyId} onNew={newChat} onOpen={(id) => void openConversation(id)} onRename={renameConversation} onDelete={deleteConversation} onClose={() => setDrawer(false)} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 shrink-0 items-center gap-1 border-b border-[#eceee7] bg-[#f8f8f5]/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-4">
          <Link href="/aluno" aria-label="Voltar ao painel" className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#3f6357] hover:bg-[#eceee7]"><ArrowLeft size={19} aria-hidden="true" /></Link>
          <button type="button" onClick={toggleSidebar} aria-label="Abrir ou fechar o histórico" className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#3f6357] hover:bg-[#eceee7]"><PanelLeft size={19} aria-hidden="true" /></button>
          <div className="min-w-0 flex-1 px-1.5">
            <h1 className="truncate text-[15px] font-semibold leading-5">{active?.title ?? 'Jonas'}</h1>
            {subjectName && <p className="truncate text-[11.5px] leading-4 text-[#3f6357]">{subjectName}</p>}
          </div>
          <button type="button" onClick={newChat} aria-label="Nova conversa" className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#1d4d41] hover:bg-[#e4ece6]"><SquarePen size={19} aria-hidden="true" /></button>
        </header>

        <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6">
            {opening ? (
              <div aria-busy="true" aria-label="A abrir a conversa" className="space-y-5">
                {[70, 100, 55].map((width, index) => <div key={index} style={{ width: `${width}%` }} className="h-16 animate-pulse rounded-2xl bg-[#eceee7]" />)}
              </div>
            ) : empty ? (
              <div className="flex min-h-[52vh] flex-col justify-center py-6">
                <h2 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.02em]">Olá, {firstName}. O que queres estudar?</h2>
                {trackLabel && <p className="mt-1 text-[13.5px] text-[#3f6357]">{trackLabel}</p>}
                {subjects.length > 0 && (
                  <div className="mt-5 max-w-xs">
                    <SelectField
                      name="disciplina"
                      label="Disciplina (opcional)"
                      defaultValue={subjectId ?? ''}
                      onValueChange={(value) => setSubjectId(value || null)}
                      triggerClassName="h-10 rounded-xl border border-[#dfe3d9] bg-white px-3 text-[14px] text-[#202321] outline-none focus-visible:border-[#1d4d41]"
                      options={[{ value: '', label: 'Todas as disciplinas' }, ...subjects.map((subject) => ({ value: subject.id, label: subject.name }))]}
                    />
                  </div>
                )}
                <ul className="mt-5 space-y-2">
                  {STARTERS.map(({ text, prefill }) => (
                    <li key={text}>
                      <button type="button" onClick={() => fill(prefill(subjects.find((item) => item.id === subjectId)?.name ?? null))} className="w-full rounded-xl border border-[#e1e4db] bg-white px-4 py-3 text-left text-[14.5px] leading-5 text-[#202321] transition hover:border-[#1d4d41]/40 active:scale-[0.99]">{text}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="space-y-7">
                {messages.map((message, index) => {
                  const isLast = index === lastIndex
                  if (message.role === 'user') {
                    return (
                      <li key={message.id} className="flex justify-end">
                        <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-gradient-to-br from-[#2f7260] to-[#1d4d41] px-4 py-2.5 text-[15.5px] leading-6 text-white">{message.content}</div>
                      </li>
                    )
                  }
                  const writing = streaming && isLast
                  return (
                    <li key={message.id} className="flex gap-3">
                      <JonasAvatar />
                      <div className="min-w-0 flex-1 pt-0.5" aria-busy={writing}>
                        {message.content ? <RichText text={message.content} /> : <TypingDots />}
                        {!writing && message.content && (
                          <div className="-ml-2.5 mt-1.5 flex items-center gap-1">
                            <CopyButton text={message.content} />
                            {isLast && !streaming && (
                              <button type="button" onClick={() => void send('', true)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-[#3f6357] transition-colors hover:bg-[#eef1e9] hover:text-[#1d4d41]"><RotateCcw size={13} aria-hidden="true" />Responder de novo</button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="relative shrink-0 bg-gradient-to-t from-[#f8f8f5] via-[#f8f8f5] to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
          <div className="mx-auto w-full max-w-[760px]">
            {showJump && !empty && (
              <button type="button" onClick={jumpToEnd} aria-label="Ir para o fim da conversa" className="absolute -top-11 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full bg-white text-[#1d4d41] shadow-[0_2px_10px_rgba(20,50,40,0.18)] ring-1 ring-black/[0.05]"><ArrowDown size={17} aria-hidden="true" /></button>
            )}
            {error && (
              <div role="alert" className="mb-2 flex items-center gap-2 rounded-2xl bg-[#fcefee] py-2 pl-4 pr-2 text-[13.5px] text-[#8e3730]">
                <span className="min-w-0 flex-1">{error}</span>
                {!streaming && <button type="button" onClick={retry} className="h-8 shrink-0 rounded-full bg-white px-3 text-[12.5px] font-semibold text-[#8e3730]">Tentar de novo</button>}
                <button type="button" onClick={() => setError(null)} aria-label="Fechar o aviso" className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/70"><X size={15} aria-hidden="true" /></button>
              </div>
            )}
            <form onSubmit={submit} className="flex items-end gap-2 rounded-[26px] bg-white p-2 shadow-[0_2px_12px_rgba(20,50,40,0.10)] ring-1 ring-black/[0.05] focus-within:ring-2 focus-within:ring-[#1d4d41]/25">
              <label htmlFor="jonas-input" className="sr-only">Mensagem para o Jonas</label>
              <textarea id="jonas-input" ref={textarea} rows={1} value={input} maxLength={4000} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} placeholder={empty ? 'Escreve a tua dúvida…' : 'Continua a conversa…'} className="max-h-44 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-[15.5px] leading-6 outline-none placeholder:text-[#3f6357]" />
              {streaming ? (
                <button type="button" onClick={stop} aria-label="Parar a resposta" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#202923] text-white"><Square size={13} fill="currentColor" aria-hidden="true" /></button>
              ) : (
                <button type="submit" disabled={!input.trim() || opening} aria-label="Enviar mensagem" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2f7260] to-[#1d4d41] text-white shadow-[0_2px_6px_rgba(29,77,65,0.25)] transition disabled:opacity-35 disabled:shadow-none"><ArrowUp size={18} aria-hidden="true" /></button>
              )}
            </form>
            <p className="mt-2 text-center text-[11px] text-[#3f6357]">O Jonas pode errar. Confirma sempre com o teu professor.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
EOF

echo "Escrever app/aluno/bem-vindo/actions.ts"
cat > "app/aluno/bem-vindo/actions.ts" <<'EOF'
'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomBytes, randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { AppError } from '@/lib/action-result'
import { cleanName, checkBirth, isDailyGoal, PRIVACY_VERSION, TERMS_VERSION, toIsoDate, validateName } from '@/lib/identity'
import { getOnboardingState } from '@/lib/onboarding'
import { cleanOtherLevel, isTrack } from '@/lib/percurso'
import { getVisibleModules } from '@/lib/exam-modules'
import { getSimulatorHub, startAttempt } from '@/lib/simulator'

// Onboarding (3 ecrãs). Cada passo guarda-se no servidor ao avançar: se o estudante fechar a aplicação, retoma onde parou.
// As acções devolvem o resultado em vez de lançar (em produção o Next.js esconde as mensagens de erro lançadas).

export type StepResult = { ok: true } | { ok: false; message: string; underAge?: boolean }

async function step(fallback: string, task: (user: { id: string; email: string }) => Promise<StepResult | void>): Promise<StepResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { ok: false, message: 'A tua sessão expirou. Inicia sessão outra vez.' }
    return (await task({ id: session.user.id, email: session.user.email })) ?? { ok: true }
  } catch (error) {
    const digest = error && typeof error === 'object' ? (error as { digest?: unknown }).digest : undefined
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw error
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[ONBOARDING]', fallback, error)
    return { ok: false, message: fallback }
  }
}

/** Ecrã 1: nome, data de nascimento (validada aqui, nunca só na interface) e, se ainda não existe, a aceitação dos Termos. */
export async function saveAboutYou(input: { name: string; day: number; month: number; year: number; acceptTerms: boolean }): Promise<StepResult> {
  return step('Não foi possível guardar. Tenta outra vez.', async (user) => {
    const nameError = validateName(input?.name)
    if (nameError) throw new AppError(nameError)
    const birth = checkBirth({ year: input?.year, month: input?.month, day: input?.day })

    if (!birth.ok) {
      if (birth.code === 'under_age') {
        // Menor de 13: nenhuma conta fica activa e nenhum dado é guardado. O apagamento leva consigo sessões e consentimentos (ON DELETE CASCADE).
        await pool.query('DELETE FROM "user" WHERE id = $1', [user.id])
        return { ok: false, message: birth.message, underAge: true }
      }
      throw new AppError(birth.message)
    }

    const state = await getOnboardingState(user.id)
    if (!state.hasConsent) {
      if (input.acceptTerms !== true) throw new AppError('Aceita os Termos e a Privacidade para continuar.')
      const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || null
      await pool.query(`INSERT INTO account_consents (user_id, kind, version, ip) VALUES ($1, 'terms', $2, $4), ($1, 'privacy', $3, $4)`, [user.id, TERMS_VERSION, PRIVACY_VERSION, ip])
    }

    // Menores de 18 recebem as predefinições de privacidade no momento em que a data é guardada pela primeira vez (ranking oculto).
    // Nas vezes seguintes a escolha do estudante mantém-se.
    await pool.query(
      `INSERT INTO student_profiles (user_id, birth_date, show_in_ranking) VALUES ($1, $2::date, $3)
       ON CONFLICT (user_id) DO UPDATE SET birth_date = $2::date, updated_at = now(),
         show_in_ranking = CASE WHEN student_profiles.birth_date IS NULL AND $4 THEN false ELSE student_profiles.show_in_ranking END`,
      [user.id, toIsoDate(birth.birth), !birth.minor, birth.minor],
    )
    await pool.query('UPDATE "user" SET name = $2, "updatedAt" = now() WHERE id = $1', [user.id, cleanName(input.name)])
    revalidatePath('/aluno')
  })
}

/** Ecrã 2: percurso (10ª, 12ª, admissão ou outra classe), instituição (só admissão) e meta diária. */
export async function saveTrackAndGoal(input: { track: string | null; otherLevel: string | null; institutionId: string | null; dailyGoal: number }): Promise<StepResult> {
  return step('Não foi possível guardar. Tenta outra vez.', async (user) => {
    const state = await getOnboardingState(user.id)
    if (!state.birthDate) throw new AppError('Falta o primeiro passo. Volta atrás e preenche a tua data de nascimento.')
    const track = isTrack(input?.track) ? input.track : null
    const otherLevel = track ? null : cleanOtherLevel(input?.otherLevel)
    if (!track && !otherLevel) throw new AppError('Escolhe o que estás a preparar.')
    if (!isDailyGoal(input.dailyGoal)) throw new AppError('Escolhe a tua meta diária.')

    let institutionId: string | null = null
    if (track === 'admissao') {
      institutionId = typeof input.institutionId === 'string' && input.institutionId.length <= 100 ? input.institutionId : null
      if (!institutionId) throw new AppError('Escolhe a instituição a que te candidatas.')
      const found = await pool.query('SELECT 1 FROM institutions WHERE id = $1 AND active = true', [institutionId])
      if (!found.rowCount) throw new AppError('Essa instituição já não está disponível. Escolhe outra.')
    }

    await pool.query(
      `INSERT INTO student_profiles (user_id, track, other_level, institution_id, daily_goal) VALUES ($1, $2::text, $3::text, $4::text, $5)
       ON CONFLICT (user_id) DO UPDATE SET track = $2::text, other_level = $3::text, institution_id = $4::text, daily_goal = $5, updated_at = now()`,
      [user.id, track, otherLevel, institutionId, input.dailyGoal],
    )
    revalidatePath('/aluno')
  })
}

/** Ecrã 3: lembretes. Fecha o onboarding. «push» fica registado como indisponível até o Web Push existir (fase G). */
export async function saveReminders(input: { choice: 'email' | 'none' }): Promise<StepResult> {
  return step('Não foi possível guardar. Tenta outra vez.', async (user) => {
    if (input?.choice !== 'email' && input?.choice !== 'none') throw new AppError('Escolhe uma opção.')
    const state = await getOnboardingState(user.id)
    if (!state.birthDate || (!state.track && !state.otherLevel) || !state.dailyGoal) throw new AppError('Faltam passos anteriores. Volta atrás.')

    // Só lembretes de estudo e resumo: nunca promoção (menores de 18 não recebem promoção; hoje ninguém recebe).
    await pool.query(
      `INSERT INTO notification_prefs (user_id, email_enabled, push_enabled, categories, unsubscribe_token)
       VALUES ($1, $2, false, $3::jsonb, $4)
       ON CONFLICT (user_id) DO UPDATE SET email_enabled = $2, categories = $3::jsonb, updated_at = now()`,
      [user.id, input.choice === 'email', JSON.stringify({ study: true, summary: true, promo: false }), randomBytes(24).toString('hex')],
    )
    await pool.query(`UPDATE student_profiles SET onboarded_at = coalesce(onboarded_at, now()), updated_at = now() WHERE user_id = $1`, [user.id])

    // Boas-vindas na plataforma, uma só vez.
    const firstName = state.name.split(' ')[0] || 'estudante'
    await pool
      .query(
        `INSERT INTO notifications (id, user_id, title, body, kind)
         SELECT $1, $2, $3, $4, 'boas-vindas' WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = $2 AND kind = 'boas-vindas')`,
        [randomUUID(), user.id, `Boas-vindas, ${firstName}`, 'Responde a algumas questões hoje e começa a tua sequência de dias de estudo.'],
      )
      .catch((error) => console.error('[ONBOARDING] notificação de boas-vindas', error))

    revalidatePath('/aluno')
    revalidatePath('/aluno/notificacoes')
  })
}

export type FirstSubjects = { subjects: { id: string; name: string; count: number }[]; goal: number }

/**
 * Disciplinas com questões para o percurso do aluno, para ele escolher onde começar. Vazio quando o percurso ainda não tem
 * questões (por exemplo «outra classe») ou a Prática não está activa: o estudante entra no painel.
 */
export async function listFirstSubjects(): Promise<FirstSubjects> {
  const empty: FirstSubjects = { subjects: [], goal: 0 }
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return empty
    const state = await getOnboardingState(session.user.id)
    if (state.step !== null || !isTrack(state.track) || !state.dailyGoal) return empty
    const modules = await getVisibleModules(state.track)
    if (!modules.some((item) => item.key === 'pratica' && item.status === 'active')) return empty
    const hub = await getSimulatorHub({ userId: session.user.id, track: state.track, institutionId: state.institutionId })
    return { subjects: hub.subjects, goal: state.dailyGoal }
  } catch (error) {
    console.error('[ONBOARDING] disciplinas', error)
    return empty
  }
}

/** Começa uma Prática curta (tamanho da meta diária) na disciplina que o estudante escolheu. Só quando ele escolhe começar. */
export async function startFirstSession(input: { subjectId: string }): Promise<{ href: string | null; message?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { href: null, message: 'A tua sessão expirou. Inicia sessão outra vez.' }
    const state = await getOnboardingState(session.user.id)
    if (state.step !== null || !isTrack(state.track) || !state.dailyGoal) return { href: null }
    const scope = { userId: session.user.id, track: state.track, institutionId: state.institutionId }
    // A disciplina tem de ser uma das que têm questões para este percurso (o cliente não decide sozinho).
    const hub = await getSimulatorHub(scope)
    if (typeof input?.subjectId !== 'string' || !hub.subjects.some((item) => item.id === input.subjectId)) return { href: null, message: 'Essa disciplina já não está disponível. Escolhe outra.' }
    const id = await startAttempt(scope, 'pratica', input.subjectId, null, null, { size: state.dailyGoal })
    return { href: `/aluno/simulador/sessao/${id}` }
  } catch (error) {
    if (error instanceof AppError) return { href: null, message: error.message }
    console.error('[ONBOARDING] primeiro simulado', error)
    return { href: null }
  }
}
EOF

echo "Escrever app/aluno/bem-vindo/page.tsx"
cat > "app/aluno/bem-vindo/page.tsx" <<'EOF'
import { redirect } from 'next/navigation'
import { requireSession, ONBOARDING_PATH } from '@/lib/require-student'
import { getOnboardingState } from '@/lib/onboarding'
import { listStudentInstitutions } from '@/lib/institutions'
import { provisionalName } from '@/lib/identity'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bem-vindo | Twisisa', description: 'Três passos rápidos para começares a estudar.', robots: { index: false, follow: false } }

// Onboarding: 3 ecrãs (docs/IDENTIDADE-ONBOARDING-RETENCAO.md, secção 3). Só há uma página; o passo vem do que falta no servidor.
export default async function BemVindoPage() {
  const session = await requireSession(ONBOARDING_PATH)
  const state = await getOnboardingState(session.user.id)
  if (state.step === null) redirect('/aluno')

  const institutions = await listStudentInstitutions().catch((error) => {
    console.error('[ONBOARDING] instituições', error)
    return []
  })
  // Quem criou conta só com e-mail tem um nome provisório (a parte antes do «@»): o campo começa vazio para escrever o verdadeiro.
  const provisional = state.name.trim().toLowerCase() === provisionalName(state.email).toLowerCase() || state.name === 'Estudante'

  return (
    <OnboardingFlow
      initialStep={state.step}
      initialName={provisional ? '' : state.name}
      initialBirth={state.birthDate}
      needsConsent={!state.hasConsent}
      initialTrack={state.track}
      initialOtherLevel={state.otherLevel}
      initialInstitutionId={state.institutionId}
      initialGoal={state.dailyGoal}
      institutions={institutions.map((item) => ({ id: item.id, shortName: item.shortName, name: item.name, soon: item.contentCount === 0 }))}
    />
  )
}
EOF

echo "Escrever app/aluno/percurso/actions.ts"
cat > "app/aluno/percurso/actions.ts" <<'EOF'
'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db, pool } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { cleanOtherLevel, isTrack } from '@/lib/percurso'

// Guarda o percurso. Só a admissão tem instituição; ao mudar para uma classe, a instituição é retirada. «Outra» guarda a classe em `other_level`.
// O histórico e os pontos não são tocados: só muda o conteúdo mostrado.
export async function savePercurso(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')

    const track = String(formData.get('track') ?? '')
    const otherLevel = isTrack(track) ? null : cleanOtherLevel(formData.get('otherLevel'))
    if (!isTrack(track) && !otherLevel) throw new AppError('Escolhe o que estás a preparar.')

    let institutionId: string | null = null
    if (track === 'admissao') {
      institutionId = String(formData.get('institutionId') ?? '').trim() || null
      if (!institutionId) throw new AppError('Escolhe a instituição a que te candidatas.')
      const found = await pool.query('SELECT 1 FROM institutions WHERE id = $1 AND active = true', [institutionId])
      if (!found.rowCount) throw new AppError('Essa instituição já não está disponível. Escolhe outra.')
    }

    // «Outra classe» fica sem `track` (o conteúdo existe só para a 10ª, 12ª e admissão); a classe vai para `other_level`.
    const savedTrack = isTrack(track) ? track : null
    await db
      .insert(studentProfiles)
      .values({ userId: session.user.id, track: savedTrack, otherLevel, institutionId })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { track: savedTrack, otherLevel, institutionId, updatedAt: new Date() } })

    revalidatePath('/aluno')
    revalidatePath('/aluno/perfil')
    revalidatePath('/aluno/percurso')
    return 'Percurso guardado.'
  }, 'Não foi possível guardar o percurso. Tenta outra vez.')
}
EOF

echo "Escrever app/aluno/percurso/page.tsx"
cat > "app/aluno/percurso/page.tsx" <<'EOF'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { listStudentInstitutions } from '@/lib/institutions'
import { isTrack } from '@/lib/percurso'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { PercursoPicker } from '@/components/percurso-picker'
import { requireStudent } from '@/lib/require-student'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'O teu percurso | Twisisa', description: 'Escolhe o que estás a preparar: 10ª classe, 12ª classe, admissão ao ensino superior ou outra classe.' }

export default async function PercursoPage() {
  const session = await requireStudent('/aluno/percurso')

  const [[profile], institutions] = await Promise.all([
    db.select({ track: studentProfiles.track, otherLevel: studentProfiles.otherLevel, institutionId: studentProfiles.institutionId }).from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)).limit(1),
    listStudentInstitutions(),
  ])
  const firstName = session.user.name.split(' ')[0]
  const savedTrack = profile?.track

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Percurso" title="O teu percurso" hideBackLink>
      <PercursoPicker
        initialTrack={isTrack(savedTrack) ? savedTrack : null}
        initialOtherLevel={profile?.otherLevel ?? null}
        initialInstitutionId={profile?.institutionId ?? null}
        institutions={institutions.map((item) => ({ id: item.id, shortName: item.shortName, name: item.name, description: item.description, logoUrl: item.logoUrl, soon: item.contentCount === 0 }))}
      />
    </StudentFeatureShell>
  )
}
EOF

echo "Escrever app/aluno/notificacoes/actions.ts"
cat > "app/aluno/notificacoes/actions.ts" <<'EOF'
'use server'

import { headers } from 'next/headers'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'

// Lista: as mais recentes primeiro.
export async function getNotifications() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return db.select().from(notifications).where(eq(notifications.userId, session.user.id)).orderBy(desc(notifications.createdAt)).limit(100)
}

// Abrir uma notificação é lê-la: devolve-a (só se for do aluno) e marca-a como lida na mesma chamada.
export async function openNotification(id: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const [item] = await db.select().from(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id))).limit(1)
  if (!item) return null
  if (!item.readAt) {
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id), isNull(notifications.readAt)))
  }
  return item
}
EOF

echo "Escrever app/aluno/notificacoes/page.tsx"
cat > "app/aluno/notificacoes/page.tsx" <<'EOF'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { NotificationsFeed } from '@/components/notifications-feed'
import { getNotifications } from './actions'
import { requireStudent } from '@/lib/require-student'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Notificações | Twisisa' }

export default async function NotificacoesPage() {
  const session = await requireStudent('/aluno/notificacoes')
  const firstName = session.user.name.split(' ')[0]
  const items = await getNotifications()
  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Notificações" title="Notificações" hideBackLink>
      <div className="max-w-[640px]">
        <NotificationsFeed items={items} />
      </div>
    </StudentFeatureShell>
  )
}
EOF

echo "Escrever app/aluno/notificacoes/[id]/page.tsx"
cat > "app/aluno/notificacoes/[id]/page.tsx" <<'EOF'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { requireStudent } from '@/lib/require-student'
import { kindLabel, safeAction, safeImage } from '@/lib/notifications-shared'
import { openNotification } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Notificação | Twisisa' }

// Mensagem inteira: texto (com parágrafos), imagem e botão, quando existem. Abrir a página marca a notificação como lida.
export default async function NotificacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStudent('/aluno/notificacoes')
  const { id } = await params
  const item = await openNotification(id)
  if (!item) notFound()

  const image = safeImage(item.imageUrl)
  const action = safeAction(item.actionHref)
  const date = item.createdAt.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Maputo' })

  return (
    <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="Notificações" title={item.title} hideTitle backHref="/aluno/notificacoes" backLabel="Notificações">
      <article className="mt-4 max-w-[640px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1d4d41]">{kindLabel(item.kind)} · {date}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17231d] sm:text-3xl">{item.title}</h1>
        {image && <img src={image} alt="" className="mt-5 w-full rounded-2xl object-cover" />}
        <p className="mt-5 whitespace-pre-line text-[16px] leading-7 text-[#202321]">{item.body}</p>
        {action && item.actionLabel && (
          <Link href={action} className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#1d4d41] px-6 text-sm font-semibold text-white hover:bg-[#163e34]">
            {item.actionLabel}
          </Link>
        )}
      </article>
    </StudentFeatureShell>
  )
}
EOF

echo "Escrever app/aluno/notificacoes/[id]/loading.tsx"
cat > "app/aluno/notificacoes/[id]/loading.tsx" <<'EOF'
import { StudentShellSkeleton } from '@/components/skeletons/student-shell'
import { Skeleton } from '@/components/skeletons/skeleton'

export default function Loading() {
  return (
    <StudentShellSkeleton>
      <div className="mt-4 max-w-[640px]">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-3 h-8 w-3/4" />
        <Skeleton className="mt-6 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </div>
    </StudentShellSkeleton>
  )
}
EOF

echo "Escrever app/aluno/perfil/page.tsx"
cat > "app/aluno/perfil/page.tsx" <<'EOF'
import Link from 'next/link'
import { BookOpen, GraduationCap, Lock, School, Sparkles, UserRound, Check } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { institutions, studentProfiles } from '@/lib/db/schema'
import { levelLabel } from '@/lib/percurso'
import { PROVINCES, profileSteps } from '@/lib/perfil'
import { getSubscription, isSubscriptionActive } from '@/lib/subscription'
import { getRanking } from '@/lib/ranking'
import { formatPoints } from '@/lib/simulator-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { SelectField } from '@/components/ui/select-field'
import { AvatarUploader } from '@/components/aluno/perfil/avatar-uploader'
import { Field, fieldClass } from '@/components/aluno/perfil/fields'
import { PasswordForm } from '@/components/aluno/perfil/password-form'
import { ProfileAccordion, type AccordionItem } from '@/components/aluno/perfil/profile-accordion'
import { SectionForm } from '@/components/aluno/perfil/section-form'
import { saveCandidate, savePersonal, saveSchool } from './actions'
import { requireStudent } from '@/lib/require-student'

export const metadata = { title: 'O meu perfil | Twisisa', description: 'Gere as tuas informações pessoais e preferências.' }

const linkButton = 'inline-flex h-10 items-center rounded-xl border border-[#dfe3d9] bg-white px-4 text-sm font-semibold text-[#1d4d41] transition-colors hover:bg-[#f1f4ef]'

export default async function PerfilPage() {
  const session = await requireStudent('/aluno/perfil')
  const [[current], subscription] = await Promise.all([
    db.select().from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)),
    getSubscription(session.user.id),
  ])
  // Posição desta semana (só se pontuou e está visível). Se falhar, o cabeçalho segue sem ela.
  const rank = current?.track && current.showInRanking
    ? await getRanking({ userId: session.user.id, track: current.track, period: 'semana', limit: 0 }).then((data) => data.me, () => null)
    : null
  const institution = current?.institutionId
    ? (await db.select({ shortName: institutions.shortName, name: institutions.name }).from(institutions).where(eq(institutions.id, current.institutionId)))[0]
    : undefined

  const name = session.user.name
  const firstName = name.split(' ')[0]
  const track = current?.track ?? null
  const isAdmission = track === 'admissao'
  const plus = isSubscriptionActive(subscription?.status)

  const steps = profileSteps({
    image: session.user.image ?? null,
    nickname: current?.nickname ?? null,
    province: current?.province ?? null,
    school: current?.school ?? null,
    track,
    otherLevel: current?.otherLevel ?? null,
    institutionId: current?.institutionId ?? null,
    targetCourse: current?.targetCourse ?? null,
  })
  const doneCount = steps.filter((step) => step.done).length
  const percent = Math.round((doneCount / steps.length) * 100)
  const missing = steps.filter((step) => !step.done).map((step) => step.label)
  const complete = missing.length === 0

  const has = (key: string) => steps.find((step) => step.key === key)?.done ?? false
  const schoolSummary = current?.school && current?.province ? `${current.school} · ${current.province}` : current?.school || current?.province || 'Onde estudas'
  const levelText = levelLabel(track, current?.otherLevel)
  const trackSummary = levelText
    ? [levelText, isAdmission ? (institution?.shortName ?? 'sem instituição') : null, isAdmission ? current?.targetCourse : null].filter(Boolean).join(' · ')
    : 'O que estás a preparar'

  const items: AccordionItem[] = [
    {
      id: 'pessoal',
      icon: <UserRound />,
      title: 'Dados pessoais',
      summary: [name, current?.nickname ? `@${current.nickname}` : null].filter(Boolean).join(' · '),
      done: has('nickname'),
      content: (
        <SectionForm sectionId="pessoal" action={savePersonal}>
          <Field label="Nome de exibição">
            <input name="displayName" required minLength={2} maxLength={80} defaultValue={name} autoComplete="name" className={fieldClass} />
          </Field>
          <Field label="@Nickname" hint="O teu identificador único: 3 a 20 letras, números, _ ou ponto.">
            <input name="nickname" maxLength={21} defaultValue={current?.nickname ? `@${current.nickname}` : ''} placeholder="@juvencio" autoCapitalize="none" autoCorrect="off" className={fieldClass} />
          </Field>
          <Field label={<>Telefone <span className="font-normal text-[#3f6357]">(opcional)</span></>}>
            <input name="phone" type="tel" maxLength={30} defaultValue={current?.phone ?? ''} placeholder="+258 84 000 0000" autoComplete="tel" className={fieldClass} />
          </Field>
          <Field label="Email">
            <input value={session.user.email} readOnly aria-readonly="true" className={fieldClass} />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#f8f8f5] p-3 text-sm">
            <input type="checkbox" name="showInRanking" defaultChecked={current?.showInRanking ?? true} className="mt-0.5 size-4 accent-[#1d4d41]" />
            <span><span className="font-medium text-[#202321]">Aparecer no ranking</span><span className="block text-xs text-[#3f6357]">Mostramos só o teu nome abreviado e o @nickname.</span></span>
          </label>
        </SectionForm>
      ),
    },
    {
      id: 'escola',
      icon: <School />,
      title: 'Escola',
      summary: schoolSummary,
      done: has('escola'),
      content: (
        <SectionForm sectionId="escola" action={saveSchool}>
          <Field label="Província" custom>
            <SelectField name="province" label="Província" placeholder="Escolhe a província" defaultValue={current?.province ?? ''} triggerClassName={fieldClass} options={PROVINCES.map((province) => ({ value: province, label: province }))} />
          </Field>
          <Field label="Escola">
            <input name="school" maxLength={120} defaultValue={current?.school ?? ''} placeholder="Ex.: Escola Secundária Josina Machel" className={fieldClass} />
          </Field>
        </SectionForm>
      ),
    },
    {
      id: 'percurso',
      icon: <GraduationCap />,
      title: 'Percurso',
      summary: trackSummary,
      done: has('percurso') && (!isAdmission || (has('instituicao') && has('curso'))),
      content: (
        <div className="grid gap-4">
          <p className="text-sm text-[#3f6357]">
            {levelText ? `${levelText}${isAdmission ? (institution ? ` · ${institution.name}` : ' · sem instituição escolhida') : ''}` : 'Ainda não escolheste o que estás a preparar.'}
          </p>
          <div>
            <Link href="/aluno/percurso" className={linkButton}>{levelText ? 'Alterar percurso' : 'Escolher percurso'}</Link>
          </div>
          {isAdmission && (
            <div className="border-t border-[#eceee7] pt-4">
              <SectionForm sectionId="percurso" action={saveCandidate}>
                <Field label="Curso alvo">
                  <input name="targetCourse" maxLength={160} defaultValue={current?.targetCourse ?? ''} placeholder="Ex.: Engenharia de Telecomunicações" className={fieldClass} />
                </Field>
                <Field label="Meta de nota" hint="Escala de 0 a 20." custom>
                  <SelectField name="targetScore" label="Meta de nota" defaultValue={String(current?.targetScore ?? 12)} triggerClassName={fieldClass} options={[10, 12, 14, 16, 18, 20].map((score) => ({ value: String(score), label: String(score) }))} />
                </Field>
              </SectionForm>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'seguranca',
      icon: <Lock />,
      title: 'Segurança',
      summary: 'Palavra-passe',
      content: <PasswordForm />,
    },
    {
      id: 'plano',
      icon: <Sparkles />,
      title: 'Plano',
      summary: plus ? 'Plus ativo' : 'Gratuito',
      content: (
        <div className="grid gap-4">
          <p className="text-sm text-[#3f6357]">{plus ? 'Tens o Twisisa Plus ativo.' : 'Estás no plano gratuito.'}</p>
          <div>
            <Link href="/planos" className={linkButton}><BookOpen className="mr-2 size-4" aria-hidden="true" />{plus ? 'Ver o meu plano' : 'Ver planos'}</Link>
          </div>
        </div>
      ),
    },
  ]

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Perfil" title="Meu Perfil" hideTitle hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <AvatarUploader name={name} image={session.user.image ?? null} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{name}</h1>
            <p className="truncate text-sm text-[#3f6357]">{current?.nickname ? `@${current.nickname}` : session.user.email}</p>
            {(trackSummary !== 'O que estás a preparar' || current?.school) && (
              <p className="mt-0.5 truncate text-sm font-semibold text-[#1d4d41]">{[levelText ? trackSummary : null, current?.school].filter(Boolean).join(' · ')}</p>
            )}
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#e3e6dc]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Perfil completo">
                <div className="h-full rounded-full bg-[#1d4d41] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-[#3f6357]">
                {complete ? (
                  <><Check size={13} className="text-[#1d4d41]" aria-hidden="true" />Perfil completo</>
                ) : (
                  <>{doneCount} de {steps.length} · falta {missing.slice(0, 2).join(' e ')}{missing.length > 2 ? '…' : ''}</>
                )}
              </p>
              {rank && (
                <Link href="/aluno/ranking" className="mt-1 inline-block text-xs font-semibold text-[#1d4d41] hover:underline">#{rank.position} no ranking da semana · {formatPoints(rank.points)} pts</Link>
              )}
            </div>
          </div>
        </div>
        <ProfileAccordion items={items} />
      </div>
    </StudentFeatureShell>
  )
}
EOF

echo "Escrever app/aluno/(painel)/page.tsx"
cat > "app/aluno/(painel)/page.tsx" <<'EOF'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { isAdminEmail } from '@/lib/admin'
import { getStaffRole } from '@/lib/staff'
import { getGreeting } from '@/lib/greeting'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { getAlunoOverview, type MaterialItem, type Part } from '@/lib/aluno-overview'
import { isTrack, levelLabel, type Track } from '@/lib/percurso'
import { relativeTime } from '@/lib/relative-time'
import { cn } from '@/lib/utils'
import { StudentSidebar } from '@/components/student-sidebar'
import { UrlFeedback } from '@/components/url-feedback'
import { AlunoMenuButton } from '@/components/aluno/aluno-menu-button'
import { Ic } from '@/components/aluno/icons'
import { ContinuarCard, DescobreCursoCard, ErrosCard, ProgressoPorDisciplina } from '@/components/aluno/inicio-cards'
import { getInicioAluno, type ResumeItem } from '@/lib/aluno-inicio'
import { requireStudent } from '@/lib/require-student'

export const dynamic = 'force-dynamic'

const fileHref = (id: string) => `/api/biblioteca/${encodeURIComponent(id)}/ficheiro`

// Sem bordas pesadas: a separação vem de uma sombra suave e de degradês na mesma família verde da plataforma.
const soft = 'shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)]'

function ListEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-[16px] py-[14px]">
      <p className="text-[14px] font-medium text-[#202321]">{title}</p>
      <p className="mt-[2px] text-[12px] text-[#3f6357]">{text}</p>
    </div>
  )
}

function MaterialCard({ tone, items, emptyTitle, emptyText }: { tone: 'white' | 'sand'; items: Part<MaterialItem[]>; emptyTitle: string; emptyText: string }) {
  const sand = tone === 'sand'
  return (
    <div className={cn('overflow-hidden rounded-[18px]', soft, sand ? 'bg-gradient-to-br from-[#fbf8ee] to-[#f2ecd9]' : 'bg-gradient-to-br from-white to-[#f6f8f3]')}>
      {!items.ok ? (
        <ListEmpty title="Não foi possível carregar" text="Tenta outra vez mais tarde." />
      ) : items.value.length === 0 ? (
        <ListEmpty title={emptyTitle} text={emptyText} />
      ) : (
        items.value.map((item, index) => (
          <a
            key={item.id}
            href={fileHref(item.id)}
            target="_blank"
            rel="noopener"
            className={cn(
              'flex h-[48px] items-center gap-[12px] px-[16px] text-[14px] font-medium text-inherit no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1d4d41]',
              index > 0 && 'border-t border-black/[0.05]',
            )}
          >
            <Ic name="file" size={16} className="text-[#3f6357]" />
            <p className="min-w-0 truncate">{item.title}</p>
            <small className="ml-auto flex-none whitespace-nowrap text-[12px] font-normal text-[#3f6357]">{relativeTime(item.at)}</small>
          </a>
        ))
      )}
    </div>
  )
}

const rowBase = 'flex h-[64px] items-center gap-[12px] rounded-[16px] px-[16px] text-[16px] font-semibold no-underline'
const iconBox = 'flex size-[40px] flex-none items-center justify-center rounded-[12px]'
const sectionLabel = 'text-[11px] uppercase tracking-[0.12em] text-[#202321] [font-family:inherit]'

export default async function StudentPage() {
  const session = await requireStudent('/aluno')

  const [profile] = await db
    .select({ track: studentProfiles.track, otherLevel: studentProfiles.otherLevel, institutionId: studentProfiles.institutionId, birthDate: studentProfiles.birthDate, dailyGoal: studentProfiles.dailyGoal })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id))
    .limit(1)

  const firstName = session.user.name.split(' ')[0]
  const isAdmin = isAdminEmail(session.user.email)
  // Entrada na administração para quem tem papel na equipa (admin ou revisor). Se a consulta falhar, a página continua sem o botão.
  const staffRole = isAdmin ? ('admin' as const) : await getStaffRole(session.user).catch(() => null)
  const rawTrack = profile?.track
  const track: Track | null = isTrack(rawTrack) ? rawTrack : null
  // Primeiro acesso: o aluno escolhe o percurso. A administração fica de fora para poder criar as instituições antes de escolher.
  const otherLevel = track ? null : (profile?.otherLevel ?? null)
  if (!track && !otherLevel && !isAdmin) redirect('/aluno/percurso')

  // O Início do Simulador e a orientação de curso correm ao mesmo tempo que o resto; se falharem, essas secções não aparecem (nunca um zero inventado).
  const inicioPromise = track
    ? getInicioAluno({ userId: session.user.id, track, institutionId: profile?.institutionId ?? null }).then(
        (value) => ({ ok: true as const, value }),
        (error: unknown) => {
          console.error('[ALUNO] início', error)
          return { ok: false as const }
        },
      )
    : Promise.resolve(null)
  const { progress, unread, downloads, saved, recent, savedItems, institution, simulador } = await getAlunoOverview({
    userId: session.user.id,
    track,
    institutionId: profile?.institutionId ?? null,
  })

  const unreadCount = unread.ok ? unread.value : 0
  const chipLabel =
    track === 'admissao'
      ? institution.ok && institution.value
        ? `Admissão · ${institution.value}`
        : 'Admissão'
      : (levelLabel(track, otherLevel) ?? 'Escolher percurso')
  const week = progress.ok ? progress.value : null
  // O cartão «Continuar» só existe quando há mesmo algo para continuar.
  const last = recent.ok ? recent.value[0] : undefined
  const inicio = await inicioPromise
  // Ordem: orientação a meio, sessão do Simulador a meio, último material aberto.
  const resume: ResumeItem | null =
    (inicio?.ok ? inicio.value.resume : null) ?? (last ? { kind: 'material', title: last.title, at: last.at, href: fileHref(last.id) } : null)
  const greeting = getGreeting({ name: session.user.name, userId: session.user.id, createdAt: session.user.createdAt, birthDate: profile?.birthDate ?? null, streak: week?.streak ?? null })
  // Linha discreta com dados reais de study_days (sem cartão): «Hoje 4/10 · 3 dias seguidos». Sem dados, não aparece.
  const goal = profile?.dailyGoal ?? null
  const activityParts: string[] = []
  if (week && (goal || week.today > 0)) activityParts.push(goal ? `Hoje ${week.today}/${goal}` : `Hoje ${week.today}`)
  if (week && week.streak >= 2) activityParts.push(`${week.streak} dias seguidos`)
  const activity = activityParts.join(' · ')

  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-[#f8f8f5] text-[#202321]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <UrlFeedback />
      <div className="flex min-h-screen">
        <StudentSidebar firstName={firstName} image={session.user.image ?? null} />
        <div className="w-0 min-w-0 flex-1 overflow-x-clip leading-[normal]">
          <header className="flex h-[60px] items-center justify-between border-b border-[#eceee7] px-[16px] lg:px-8">
            <div className="flex items-center gap-[8px]">
              <AlunoMenuButton firstName={firstName} image={session.user.image ?? null} />
              <Link href="/aluno" className="text-[18px] font-semibold tracking-[-0.04em] lg:hidden">
                Twisisa
              </Link>
            </div>
            <div className="flex items-center gap-[4px]">
              {staffRole && (
                <Link href={staffRole === 'admin' ? '/admin' : '/admin/questoes'} className="inline-flex h-[32px] items-center rounded-[16px] bg-gradient-to-br from-[#eaf1ec] to-[#dbe9e0] px-[12px] text-[12px] font-semibold text-[#1d4d41] no-underline">
                  {staffRole === 'admin' ? 'Administração' : 'Revisão'}
                </Link>
              )}
              <Link
                href="/aluno/notificacoes"
                aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} por ler` : 'Notificações'}
                className="relative flex size-[44px] items-center justify-center text-[#3f6357]"
              >
                <Ic name="bell" />
                {unreadCount > 0 && <span className="absolute right-[11px] top-[11px] size-[8px] rounded-[4px] bg-[#c27645]" />}
              </Link>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[16px] px-[16px] pb-[24px] pt-[12px] lg:px-8 lg:pb-12 lg:pt-8">
            <div className="flex min-w-0 flex-col gap-[16px]">
              <div className="flex min-h-[32px] items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className={cn('block text-[13px] font-bold leading-[16px] text-[#1d4d41]', activity ? 'truncate' : 'line-clamp-2')}>{greeting}</span>
                  {activity && <span title={week ? `${week.week} questões esta semana` : undefined} className="block truncate text-[11px] leading-[14px] text-[#3f6357]">{activity}</span>}
                </div>
                <Link
                  href="/aluno/percurso"
                  aria-label={`Mudar percurso: ${chipLabel}`}
                  className="inline-flex h-[32px] flex-none items-center gap-[2px] rounded-[16px] bg-gradient-to-br from-[#eaf1ec] to-[#d9e8de] pl-[12px] pr-[8px] text-[12px] font-semibold text-[#1d4d41] no-underline"
                >
                  {chipLabel}
                  <Ic name="chev" size={14} />
                </Link>
              </div>

              {resume && <ContinuarCard resume={resume} />}

              {otherLevel && (
                <p className="rounded-[16px] bg-[#f4eddb] px-[16px] py-[12px] text-[13px] font-medium leading-[18px] text-[#805f19]">
                  O Simulador ainda não tem questões para a {levelLabel(null, otherLevel)}. A Biblioteca e o Jonas já estão ao teu dispor.
                </p>
              )}

              <section aria-label="O que queres fazer?" className={cn('rounded-[20px] bg-white p-[14px]', soft)}>
                <div className="flex flex-col gap-[10px]">
                  <Link href="/biblioteca" className={cn(rowBase, 'bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]')}>
                    <span className={cn(iconBox, 'bg-white/[0.7]')}>
                      <Ic name="book" />
                    </span>
                    Biblioteca
                    <Ic name="up" className="ml-auto opacity-[.55]" />
                  </Link>
                  {track && (
                    <Link href="/aluno/simulador" className={cn(rowBase, 'bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]')}>
                      <span className={cn(iconBox, 'bg-white/[0.7]')}>
                        <Ic name="test" />
                      </span>
                      Simulador
                      <Ic name="up" className={'ml-auto opacity-[.55]'} />
                    </Link>
                  )}
                  <Link href="/jonas" className={cn(rowBase, 'bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]')}>
                    <span className={cn(iconBox, 'bg-white/[0.7]')}>
                      <Ic name="spark" />
                    </span>
                    Jonas
                    <Ic name="up" className="ml-auto opacity-[.55]" />
                  </Link>
                </div>
              </section>
            </div>

            <div className="flex min-w-0 flex-col gap-[16px]">
              {inicio?.ok && inicio.value.practice && (
                <>
                  <ProgressoPorDisciplina subjects={inicio.value.practice.subjects.slice(0, 5)} />
                  {inicio.value.practice.showErrors && <ErrosCard count={inicio.value.practice.errorCount} href={inicio.value.practice.errorsHref} />}
                </>
              )}
              {inicio?.ok && inicio.value.orientacao && <DescobreCursoCard data={inicio.value.orientacao} />}
              {(!savedItems.ok || savedItems.value.length > 0) && (
              <section aria-label="Guardados">
                <h2 className={cn(sectionLabel, 'mb-[8px] ml-[4px] flex items-center gap-[6px] font-bold')}>
                  <Ic name="mark" size={14} />
                  Guardados
                </h2>
                <MaterialCard tone="sand" items={savedItems} emptyTitle="Ainda sem materiais guardados" emptyText="Os materiais que guardares aparecem aqui." />
              </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
EOF

echo "Escrever app/aluno/ranking/page.tsx"
cat > "app/aluno/ranking/page.tsx" <<'EOF'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { isTrack, trackLabel } from '@/lib/percurso'
import { getRanking, parsePeriod, type RankingData, type RankingPeriod } from '@/lib/ranking'
import { formatPoints } from '@/lib/simulator-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { Avatar } from '@/components/aluno/avatar'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'
import { requireStudent } from '@/lib/require-student'

export const metadata = { title: 'Ranking | Twisisa', description: 'Os pontos do Simulador, entre estudantes do teu percurso.' }
export const dynamic = 'force-dynamic'

const TOP = 20

function Row({ row }: { row: RankingData['rows'][number] }) {
  const podium = row.position <= 3
  return (
    <li className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${row.isMe ? 'bg-[#eef3ee]' : ''}`} aria-current={row.isMe ? 'true' : undefined}>
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${podium ? 'bg-[#1d4d41] text-white' : 'bg-[#f1f2ec] text-[#3f6357]'}`}>{row.position}</span>
      <Avatar name={row.name} image={row.image} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#202321]">{row.name}{row.isMe && <span className="ml-1.5 text-xs font-medium text-[#1d4d41]">(tu)</span>}</span>
        {row.nickname && <span className="block truncate text-xs text-[#3f6357]">@{row.nickname}</span>}
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold text-[#1d4d41]">{formatPoints(row.points)} pts</span>
        <span className="block text-xs text-[#3f6357]">{row.correct} {row.correct === 1 ? 'certa' : 'certas'}</span>
      </span>
    </li>
  )
}

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const session = await requireStudent('/aluno/ranking')
  const period: RankingPeriod = parsePeriod((await searchParams).p)

  const [profile] = await db
    .select({ track: studentProfiles.track, otherLevel: studentProfiles.otherLevel, showInRanking: studentProfiles.showInRanking })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id))
    .limit(1)
  const track = isTrack(profile?.track) ? profile.track : null
  const hidden = profile ? !profile.showInRanking : false

  let data: RankingData | null = null
  if (track) {
    try {
      data = await getRanking({ userId: session.user.id, track, period, limit: TOP })
    } catch (error) {
      console.error('[RANKING]', error)
    }
  }

  const pill = (value: RankingPeriod, label: string) => (
    <Link
      href={value === 'semana' ? '/aluno/ranking' : '/aluno/ranking?p=geral'}
      aria-current={period === value ? 'page' : undefined}
      className={`flex h-9 flex-1 items-center justify-center rounded-full text-sm font-semibold transition-colors ${period === value ? 'bg-white text-[#1d4d41] shadow-sm' : 'text-[#3f6357] hover:text-[#1d4d41]'}`}
    >
      {label}
    </Link>
  )

  const me = data?.me ?? null
  const outside = me && me.position > TOP

  return (
    <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="Ranking" title="Ranking" hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[#3f6357]">{track ? `Estudantes de ${trackLabel(track)}` : 'Sem percurso'}</p>
          <nav aria-label="Período" className="flex w-52 gap-1 rounded-full bg-[#e8ebe3] p-1">{pill('semana', 'Esta semana')}{pill('geral', 'Geral')}</nav>
        </div>

        {!track ? (
          profile?.otherLevel ? (
            <EmptyState title="Ranking ainda não disponível" description="O ranking compara estudantes da 10ª classe, da 12ª e da admissão. Para a tua classe ainda não existe." actionLabel="Voltar ao painel" actionHref="/aluno" icon={Trophy} />
          ) : (
            <EmptyState title="Escolhe o teu percurso" description="O ranking compara estudantes do mesmo percurso." actionLabel="Escolher percurso" actionHref="/aluno/percurso" icon={Trophy} />
          )
        ) : !data ? (
          <ErrorState title="Não foi possível carregar o ranking" description="Tenta outra vez daqui a pouco." />
        ) : (
          <>
            {hidden ? (
              <div className="rounded-2xl border border-[#e3e6dc] bg-white p-4 text-sm text-[#3f6357] sm:p-5">
                Estás fora do ranking. <Link href="/aluno/perfil" className="font-semibold text-[#1d4d41] hover:underline">Voltar a aparecer no perfil</Link>
              </div>
            ) : me ? (
              <div className="rounded-2xl bg-gradient-to-br from-[#2a6a57] to-[#1d4d41] p-5 text-white shadow-[0_10px_26px_-14px_rgba(29,77,65,0.7)]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">A tua posição</p>
                <p className="mt-1 flex items-baseline gap-3"><span className="text-4xl font-semibold tracking-[-0.04em]">#{me.position}</span><span className="text-base font-semibold">{formatPoints(me.points)} pts</span></p>
                <p className="mt-1 text-sm text-white/80">{me.missing === null ? 'Estás no topo.' : `Faltam ${formatPoints(me.missing)} pts para subires.`}</p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e3e6dc] bg-white p-4 sm:p-5">
                <p className="text-sm text-[#3f6357]">{period === 'semana' ? 'Ainda não pontuaste esta semana.' : 'Ainda não pontuaste.'}</p>
                <Link href="/aluno/simulador" className="inline-flex h-10 shrink-0 items-center rounded-xl bg-[#1d4d41] px-4 text-sm font-semibold text-white hover:bg-[#173f35]">Praticar</Link>
              </div>
            )}

            {data.rows.length === 0 ? (
              <EmptyState title="Ainda sem pontuações" description={period === 'semana' ? 'Ninguém pontuou esta semana. Sê a primeira pessoa.' : 'Resolve questões no Simulador para entrares no ranking.'} actionLabel="Ir ao Simulador" actionHref="/aluno/simulador" icon={Trophy} />
            ) : (
              <ol className="divide-y divide-[#eceee7] overflow-hidden rounded-2xl border border-[#e3e6dc] bg-white">
                {data.rows.map((row) => <Row key={row.userId} row={row} />)}
                {outside && me && (
                  <>
                    <li aria-hidden="true" className="py-1 text-center text-xs text-[#3f6357]">···</li>
                    <Row row={me} />
                  </>
                )}
              </ol>
            )}

            <p className="flex items-start gap-2 text-xs leading-5 text-[#3f6357]"><Trophy size={14} className="mt-0.5 shrink-0 text-[#1d4d41]" aria-hidden="true" />Os pontos vêm das questões que acertas no Simulador. Questões repetidas valem menos. Só aparece o teu nome abreviado e o @nickname.</p>
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
EOF

echo "Escrever app/admin/cursos/page.tsx"
cat > "app/admin/cursos/page.tsx" <<'EOF'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, ArchiveRestore, GraduationCap, Pencil, Trash2 } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listInstitutions, type InstitutionRow } from '@/lib/institutions'
import { listSubjects, type SubjectRow } from '@/lib/subjects'
import { MAX_OPTIONS, MAX_PAPERS, PERIODS, VARIANTS, describeOptions, groupByCombo, listCourses, periodLabel, type CourseRow } from '@/lib/courses'
import { deleteCourse, saveCourse, setCourseActive } from './actions'
import { RowMenu } from '@/components/admin/row-menu'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminSearchBar, normalizeSearch } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { SelectField } from '@/components/ui/select-field'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cursos | Administração | Twisisa' }

const pickClass = 'mt-1 h-11 rounded-xl border border-[#dfe3d9] bg-white px-3 text-sm outline-none focus-visible:border-[#1d4d41] focus-visible:ring-2 focus-visible:ring-[#1d4d41]/10'
const input = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'

function CourseForm({ editing, institutions, subjects, courses }: { editing: CourseRow | null; institutions: InstitutionRow[]; subjects: SubjectRow[]; courses: CourseRow[] }) {
  const units = [...new Set(courses.map((c) => c.unit).filter((u): u is string => Boolean(u)))]
  const campuses = [...new Set(courses.map((c) => c.campus).filter((u): u is string => Boolean(u)))]
  return (
    <FeedbackForm
      action={saveCourse}
      successMessage={editing ? 'Curso actualizado.' : 'Curso criado.'}
      errorMessage="Não foi possível guardar o curso. Tenta outra vez."
      resetOnSuccess={!editing}
      className="grid gap-5"
    >
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <div className="text-sm font-medium">Instituição *
        <SelectField name="institution_id" label="Instituição" required requiredMessage="Escolhe a instituição." placeholder="Escolhe a instituição" defaultValue={editing?.institutionId ?? (institutions.length === 1 ? institutions[0].id : '')} triggerClassName={pickClass} options={institutions.map((item) => ({ value: item.id, label: item.shortName }))} />
      </div>
      <label className="text-sm font-medium">Nome do curso *<input name="name" required minLength={2} maxLength={120} defaultValue={editing?.name ?? ''} className={input} placeholder="Ex.: Engenharia Civil" /></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">Faculdade / escola<input name="unit" list="course-units" maxLength={120} defaultValue={editing?.unit ?? ''} className={input} placeholder="Ex.: Faculdade de Engenharia" /></label>
        <label className="text-sm font-medium">Local<input name="campus" list="course-campuses" maxLength={80} defaultValue={editing?.campus ?? ''} className={input} placeholder="Ex.: Cidade de Maputo" /></label>
      </div>
      <datalist id="course-units">{units.map((u) => <option key={u} value={u} />)}</datalist>
      <datalist id="course-campuses">{campuses.map((u) => <option key={u} value={u} />)}</datalist>

      <div>
        <p className="text-sm font-medium">Provas de admissão *</p>
        <p className="mt-0.5 text-xs text-[#3f6357]">Cada opção é uma combinação de provas que dá acesso ao curso (o candidato escolhe uma). Os pesos de cada opção somam 100%.</p>
        <div className="mt-3 grid gap-3">
          {Array.from({ length: MAX_OPTIONS }).map((_, i) => {
            const option = editing?.options[i]
            return (
              <details key={i} open={i === 0 || Boolean(option)} className="rounded-2xl border border-[#e3e5dc] bg-[#fbfbf9] p-3 open:bg-white">
                <summary className="cursor-pointer text-sm font-semibold">Opção {i + 1}{option ? ` · ${periodLabel(option.period)}` : i === 0 ? '' : ' (opcional)'}</summary>
                <div className="mt-3 grid gap-3">
                  <div className="text-xs font-medium text-[#3f6357]">Período
                    <SelectField name={`opt${i}_period`} label="Período" defaultValue={option?.period ?? ''} triggerClassName={pickClass} options={[{ value: '', label: i === 0 ? 'Escolhe' : 'Não usar esta opção' }, ...PERIODS.map((p) => ({ value: p.value, label: p.label }))]} />
                  </div>
                  {Array.from({ length: MAX_PAPERS }).map((__, j) => {
                    const paper = option?.papers[j]
                    return (
                      <div key={j} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_9rem_5rem]">
                        <div className="col-span-2 text-xs font-medium text-[#3f6357] sm:col-span-1">Prova {j + 1}
                          <SelectField name={`opt${i}_p${j}_subject`} label={`Prova ${j + 1}`} defaultValue={paper?.subjectId ?? ''} triggerClassName={pickClass} options={[{ value: '', label: j === 0 ? 'Escolhe a disciplina' : '— sem prova' }, ...subjects.filter((s) => s.active || s.id === paper?.subjectId).map((s) => ({ value: s.id, label: s.name }))]} />
                        </div>
                        <div className="text-xs font-medium text-[#3f6357]">Variante
                          <SelectField name={`opt${i}_p${j}_variant`} label="Variante" defaultValue={VARIANTS.some((v) => v.value === paper?.variant) ? (paper?.variant ?? '') : VARIANTS[0].value} triggerClassName={pickClass} options={VARIANTS.map((v) => ({ value: v.value, label: v.label }))} />
                        </div>
                        <label className="text-xs font-medium text-[#3f6357]">Peso %
                          <input name={`opt${i}_p${j}_weight`} type="number" inputMode="numeric" min={1} max={100} step={1} defaultValue={paper?.weight ?? ''} className={input} placeholder="50" />
                        </label>
                      </div>
                    )
                  })}
                </div>
              </details>
            )
          })}
        </div>
      </div>
      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">{editing ? 'Guardar alterações' : 'Criar curso'}</button>
    </FeedbackForm>
  )
}

function ViewSwitch({ view, q }: { view: 'cursos' | 'provas'; q: string }) {
  const href = (target: string) => `/admin/cursos${target === 'provas' ? '?vista=provas' : ''}${q ? `${target === 'provas' ? '&' : '?'}q=${encodeURIComponent(q)}` : ''}`
  const item = (target: 'cursos' | 'provas', label: string) => (
    <Link href={href(target)} aria-current={view === target ? 'page' : undefined} className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${view === target ? 'bg-[#1d4d41] font-semibold text-white' : 'text-[#3f6357] hover:bg-white'}`}>{label}</Link>
  )
  return <div className="flex shrink-0 gap-1 self-start rounded-full border border-[#dfe3d9] bg-[#f3f4ef] p-1">{item('cursos', 'Por curso')}{item('provas', 'Por provas')}</div>
}

export default async function AdminCursosPage({ searchParams }: { searchParams: Promise<{ editar?: string; q?: string; vista?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)
  const view = params.vista === 'provas' ? 'provas' : 'cursos'

  let courses: CourseRow[] | null = null
  let institutions: InstitutionRow[] = []
  let subjects: SubjectRow[] = []
  try {
    ;[courses, institutions, subjects] = await Promise.all([listCourses(), listInstitutions(), listSubjects()])
  } catch (error) {
    console.error('[ADMIN CURSOS]', error)
  }

  const editing = courses?.find((item) => item.id === params.editar) ?? null
  const term = normalizeSearch(q)
  const visible = courses?.filter((item) => !term || normalizeSearch(`${item.name} ${item.unit ?? ''} ${item.institutionShortName}`).includes(term)) ?? []
  const groups = groupByCombo(visible)
  const countLabel = courses ? (q ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}` : view === 'provas' ? `${groups.length} combinações de provas` : `${courses.length} ${courses.length === 1 ? 'curso' : 'cursos'}`) : undefined

  return (
    <AdminPage>
      <AdminPageHeader
        icon={GraduationCap}
        title="Cursos"
        description="Os cursos de cada instituição e as provas de admissão que dão acesso a cada um."
        action={
          <FormModal label="Adicionar" title="Adicionar curso" description="Escolhe a instituição e as provas de admissão do curso.">
            <CourseForm editing={null} institutions={institutions} subjects={subjects} courses={courses ?? []} />
          </FormModal>
        }
      />
      {editing && (
        <RouteModal title={`Editar ${editing.name}`} closeHref="/admin/cursos">
          <CourseForm editing={editing} institutions={institutions} subjects={subjects} courses={courses ?? []} />
        </RouteModal>
      )}
      <ViewSwitch view={view} q={q} />
      <AdminSearchBar q={q} placeholder="Pesquisar curso ou faculdade" countLabel={countLabel} hidden={view === 'provas' ? { vista: 'provas' } : undefined} />

      <AdminListPanel>
        {courses === null ? (
          <AdminLoadError href="/admin/cursos" />
        ) : courses.length === 0 ? (
          <div className="m-4"><EmptyState title="Ainda sem cursos" description="Usa o botão Adicionar para criar o primeiro." /></div>
        ) : visible.length === 0 ? (
          <div className="m-4"><EmptyState title="Sem resultados" description={`Nenhum curso corresponde a “${q}”.`} actionLabel="Limpar pesquisa" actionHref="/admin/cursos" /></div>
        ) : view === 'provas' ? (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {groups.map((group) => (
              <li key={group.key} className="py-3">
                <p className="text-sm font-semibold leading-5">{group.key} <span className="font-normal text-[#3f6357]">· {group.courses.length} {group.courses.length === 1 ? 'curso' : 'cursos'}</span></p>
                <p className="mt-1 text-xs leading-5 text-[#3f6357]">
                  {group.courses.map((c, index) => (
                    <span key={c.id}>{index > 0 && ', '}<Link href={`/admin/cursos?editar=${c.id}`} className="hover:text-[#1d4d41] hover:underline">{c.name}</Link>{c.periods.length === 1 && c.periods[0] === 'pos_laboral' ? ' (pós-laboral)' : ''}</span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {visible.map((item) => (
              <li key={item.id} className={`flex items-start gap-3 py-3 ${item.active ? '' : 'opacity-70'}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-5">{item.name}</p>
                  <p className="mt-0.5 text-xs text-[#3f6357]">{[item.institutionShortName, item.unit, item.campus && item.campus !== 'Cidade de Maputo' ? item.campus : null].filter(Boolean).join(' · ')}</p>
                  {describeOptions(item.options).map((line) => (
                    <p key={line.periods} className="mt-1 text-xs leading-5 text-[#3f6357]"><span className="font-semibold text-[#1d4d41]">{line.periods}:</span> {line.text}</p>
                  ))}
                </div>
                {!item.active && <span className="shrink-0 rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[11px] font-semibold text-[#3f6357]">Arquivado</span>}
                <RowMenu
                  label={`Acções de ${item.name}`}
                  items={[
                    { label: 'Editar', icon: <Pencil size={16} />, href: `/admin/cursos?editar=${item.id}` },
                    item.active
                      ? { label: 'Arquivar', icon: <Archive size={16} />, action: setCourseActive, fields: { id: item.id, active: 'false' }, confirm: 'Arquivar' }
                      : { label: 'Activar', icon: <ArchiveRestore size={16} />, action: setCourseActive, fields: { id: item.id, active: 'true' } },
                    { label: 'Eliminar', icon: <Trash2 size={16} />, action: deleteCourse, fields: { id: item.id }, confirm: 'Eliminar', tone: 'danger' },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </AdminListPanel>
    </AdminPage>
  )
}
EOF

echo "Escrever tests/percurso.test.ts"
cat > "tests/percurso.test.ts" <<'EOF'
import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanOtherLevel, levelLabel, otherLevelLabel } from '../lib/percurso'

test('cleanOtherLevel: classes predefinidas, texto livre limpo, lixo recusado', () => {
  assert.equal(cleanOtherLevel('8'), '8')
  assert.equal(cleanOtherLevel('  Curso   técnico  '), 'Curso técnico')
  assert.equal(cleanOtherLevel('a'), null)
  assert.equal(cleanOtherLevel('   '), null)
  assert.equal(cleanOtherLevel(42), null)
  assert.equal(cleanOtherLevel('<b>x</b>y'), 'b x /b y')
  assert.equal(cleanOtherLevel('x'.repeat(100))?.length, 40)
})

test('levelLabel: classe principal, predefinida ou texto livre', () => {
  assert.equal(levelLabel('10', null), '10ª classe')
  assert.equal(levelLabel(null, '9'), '9ª classe')
  assert.equal(otherLevelLabel('Curso técnico'), 'Curso técnico')
  assert.equal(levelLabel(null, null), null)
})
EOF

echo "Escrever State.md"
cat > "State.md" <<'EOF'
# State.md — Twisisa

Última actualização: 30/10/2026 (depois da revisão do onboarding, percurso e notificações).
Este ficheiro é o único documento vivo do estado do projecto. O registo detalhado dos 171 itens anteriores (até 27/10/2026) está no histórico do git: `git log -p -- State.md`.

## Como usar
- Uma página só passa a FEITO E TESTADO depois de ser usada por uma pessoa num telemóvel (não basta compilar).
- Dado sem fonte real não se mostra: usa-se "—" ou um estado vazio. Nunca um número escrito no código.
- Tabela sem quem escreva nela, ou sem quem leia, é dívida: regista-se aqui.
- Nenhuma pasta de cópia de segurança dentro do repositório: o git é a cópia.
- Ao acabar uma alteração, actualizar a linha da página ou do item afectado.

Estados: FEITO E TESTADO · FEITO, FALTA TESTE · FICTÍCIO (dados inventados) · NÃO FEITO.

## Comandos
- `npm run build` (`next build --webpack`), `npm run migrate`, `npm run migrate:status`, `npm test`.
- O `State.md` antigo falava em `pnpm`; o repositório tem `package-lock.json` e `pnpm-workspace.yaml` ao mesmo tempo. Decidir um gestor de pacotes (ver Decisões).

## Páginas do estudante

| Página | Estado | Nota |
|---|---|---|
| `/sign-up`, `/sign-in` | FEITO, FALTA TESTE | Registo de 1 ecrã: e-mail, palavra-passe, caixa dos Termos (versão e data em `account_consents`). Validação em tempo real e repetida no servidor (`hooks.before` em `lib/auth.ts`). Botão Google desactivado até existirem `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Sessão de 30 dias; «Computador partilhado» na entrada (`rememberMe: false`, a confirmar em ensaio); depois de entrar volta ao sítio de origem (`?next=`). Limite de pedidos na base de dados (tabela `rateLimit`). |
| `/aluno/bem-vindo` (onboarding) | FEITO, FALTA TESTE | 3 ecrãs: Sobre ti (nome, data de nascimento, Termos se faltarem), O que preparas (10ª, 12ª, admissão ou Outra; instituição; meta diária), Lembretes (e-mail; «Agora não» no canto de cima à direita). Cada passo guarda-se ao avançar. Menor de 13 anos: conta apagada e ecrã de recusa. Menores de 18: ranking oculto por omissão. No fim pergunta «Queres praticar agora?»: o estudante escolhe a disciplina e começa (Prática com o tamanho da meta) ou toca em «Mais tarde» e vai ao painel. Nada começa sozinho. Sem questões para o percurso (ex.: outra classe), entra directo no painel. Critério nº 1: o ecrã 2 caber em 360x640 sem scroll (não testado em aparelho; agora tem 4 opções). |
| `/esqueci-a-senha`, `/redefinir-senha` | FEITO, FALTA TESTE | Depende do domínio no Resend (`docs/EMAIL.md`). |
| `/aluno/percurso` | FEITO, FALTA TESTE | 10ª, 12ª ou admissão (com instituição), ou «Outra»: ao tocar, as principais saem e entram 8ª, 9ª, 11ª e um campo para escrever outra classe (componente `components/track-choice.tsx`, usado também no onboarding). «Outra» guarda a classe em `student_profiles.other_level` e deixa `track` vazio, porque questões, módulos e disciplinas só existem para 10ª, 12ª e admissão (CHECK nas tabelas). Quem escolhe «Outra» usa a Biblioteca e o Jonas; o painel diz que o Simulador e o ranking ainda não existem para a classe. |
| `/aluno` (painel) | FEITO, FALTA TESTE | Linha discreta «Hoje 4/10 · 3 dias seguidos» com dados reais de `study_days` (escritos pelo simulador, pela Biblioteca e pelo Jonas). Parabéns no aniversário (dia e mês, fuso de Maputo; 29/02 celebra a 28/02 nos anos não bissextos). |
| `/aluno/simulador` (+ sessão, histórico, configurações) | FEITO, FALTA TESTE | Servidor avalia respostas, valida o dono da tentativa, fecha o tempo do modo rápido, limita inícios por hora. Testes de unidade só do motor (`tests/quiz-engine.test.ts`). Precisa de questões publicadas. |
| `/biblioteca` (+ categoria, explorar, pesquisa) | FEITO, FALTA TESTE | Entrega de PDF pelo Cloudinary por confirmar (Definições, Segurança, "Allow delivery of PDF and ZIP files"). |
| `/aluno/perfil` | FEITO, FALTA TESTE | Foto no Cloudinary com upload assinado. |
| `/aluno/ranking` | FEITO, FALTA TESTE | Real (pontos de `attempt_items`). `show_in_ranking` é verdadeiro por omissão. |
| `/jonas` | FEITO, FALTA TESTE | Groq. Só travão de 25 mensagens por minuto; sem limites por plano. |
| `/aluno/notificacoes` (+ `/aluno/notificacoes/[id]`) | FEITO, FALTA TESTE | Lista compacta (tipo, título, uma linha, hora, ponto de por ler, miniatura se houver imagem), mais recentes primeiro. Tocar abre a mensagem inteira (texto com parágrafos, imagem, botão) e marca-a como lida: não há botão «marcar como lida». Colunas novas `image_url`, `action_label`, `action_href`. Falta quem crie notificações além das boas-vindas: o compositor do admin (texto, imagem do Cloudinary, botão) fica por fazer. |
| `/aluno/favoritos` | FICTÍCIO | Página estática; a Biblioteca já guarda em `library_favorites`. |
| `/aluno/desafios` | FICTÍCIO | Números fixos no código; missões só no browser. |
| `/comunidade` | FICTÍCIO | Pessoas fixas; "seguir" grava ids que não são utilizadores (`follows` sem chave estrangeira); a lista não vem da base. |
| `/aluno/convites` | NÃO VERIFICADO | Tratar como fictícia até prova em contrário. |
| `/aluno/descobrir-curso` | NÃO VERIFICADO | |
| `/planos`, `/pagamentos/sucesso` | FEITO, FALTA TESTE | Stripe em USD 9,99; a landing diz 197 MT; nada na plataforma é reservado a quem paga. |
| `/blog` | FEITO | 5 artigos em `lib/blog.ts`. |

## Administração (`/admin`)
Instituições, Disciplinas, Temas, Classificação (categorias e níveis), Módulos, Materiais, Banco de questões, Variantes, Cursos, Equipa, Jonas (modelo). Todas FEITO, FALTA TESTE no telemóvel.
- Formulários usam `FeedbackForm`: durante o envio os campos ficam desactivados e o botão de envio mostra um indicador (CSS em `app/globals.css`, marcador `Estado de processamento`).
- Acções em linha usam `RowMenu` (já tem estado de processamento).
- O botão de confirmação do diálogo em `components/admin/question-bulk-form.tsx` desactiva-se durante o processamento, mas não mostra indicador: por fazer.

## Regras do projecto
- Cores: nada de cinzento. O texto secundário usa o verde escuro `#3f6357`. O que o estudante pode dispensar («Agora não», «Mais tarde») fica longe das acções principais (canto de cima à direita ou em baixo à esquerda), com cor visível.
- Selectores: sempre o `SelectField` personalizado (`components/ui/select-field.tsx`), nunca `<select>` nativo.
- Textos de ajuda dizem o que fazer, nunca porque pedimos o dado.
- Nunca passar componentes (ícones) como propriedade de uma página de servidor para um componente de cliente. Passar o nome (texto) ou usar um componente de servidor.
- Acções de servidor devolvem `ActionResult` (`lib/action-result.ts`, `runAction`, `AppError`); o erro aparece no modal de feedback. Não lançar erros para o cliente.
- Páginas de lista do admin seguem `components/admin/page-parts.tsx`.
- Um módulo só pode estar "Ativo" quando tem `ready: true` em `lib/exam-modules.ts`.
- Anos vêm de `lib/years.ts`; a ordem de listas de `lib/reorder.ts`.
- Fórmulas em KaTeX por `lib/math-text.tsx` (`$...$` e `$$...$$`); o texto fora das fórmulas nunca é HTML.
- As pastas do Cloudinary `estuda-mz/materiais` e `estuda-mz/logotipos` mantêm-se (já há ficheiros nelas).
- Sem emojis na interface nova.

## Pendentes, por prioridade
P0 (antes de receber estudantes)
1. Ensaio completo com 3 a 5 estudantes reais num telemóvel (conta, e-mail, percurso, simulado, ranking, Jonas, Biblioteca).
2. Conteúdo mínimo carregado: instituições, disciplinas, temas, questões publicadas, materiais.
3. Confirmar a entrega de PDF no Cloudinary.
4. Verificar o domínio no Resend e testar a recuperação de conta com e-mail real.
5. Retirar do menu o que é FICTÍCIO, ou terminá-lo.

P1
6. Registo: FEITO (idade, Termos, validação). Falta ligar o Google: criar as credenciais, registar `<BETTER_AUTH_URL>/api/auth/callback/google`, preencher as duas variáveis e passar a aplicação a «In production» na Google.
7. FEITO: guarda única `requireStudent()` (`lib/require-student.ts`) nas páginas do estudante, `/jonas`, `/biblioteca` e `/comunidade`. Faltam as acções de servidor e rotas de API, que continuam a validar a sessão uma a uma.
8. FEITO: ranking oculto por omissão para menores de 18 (decisão: idade mínima 13).
9. Ligação à base com pooler; monitorização de erros; eventos de utilização (primeiro simulado, primeira mensagem ao Jonas).
10. Jonas: limites por plano, tecto diário, estado quando a Groq recusa por quota, política de dados da Groq nos Termos.
11. Testar fluxo Stripe de ponta a ponta, ou trocar o meio de pagamento.

P2
12. FEITO por outra via: `study_days` (`lib/study-days.ts`). A tabela `study_progress` ficou sem leitura nem escrita: remover (ver 16).
13. Criar notificações reais (e ligá-las ao e-mail).
14. Ligar `/aluno/favoritos` a `library_favorites`.
15. Remover as dependências sem uso (`ai`, `@ai-sdk/react`, `@stripe/stripe-js`, `@base-ui/react`, `class-variance-authority`): script à parte, depois do build passar.
16. Tabelas sem uso: `study_progress`, `quiz_attempts`, linhas antigas de `exam_modules`, `post_likes`. Decidir: ligar ou migração para remover.

Herdado do registo anterior (número do item antigo)
- #7 dados reais das instituições (sigla, nome, descrição, logótipo).
- #10 `/planos` sem ligação em nenhuma página.
- #11 depois de entrar, vai sempre para `/aluno` (perde o contexto de onde veio).
- #13 PNGs de 1,6 MB e 1,8 MB com `images.unoptimized: true`.
- #22 `/biblioteca/partilhar` continua acessível por URL e não envia nada.
- #50 eliminar tema não verifica uso.
- #61 o envio de material cria a disciplina por texto livre.
- #127 CSV gravado pelo Excel com `;` falha; só aceita vírgulas.
- #134 revisor sem percurso é enviado para `/aluno/percurso`.
- #138 confirmar pesos no edital da UEM (`docs/CURSOS-UEM-2026.md`).
- #139 ligação aluno-curso: o curso-alvo é texto livre; materiais e questões sem marca de prova.
- #146 as secções da Biblioteca dependem do `slug` das categorias (`MAIN_SECTIONS` em `lib/library-shared.ts`).
- #147 instituição dos materiais é texto livre.

## Identidade, onboarding e retenção (docs/IDENTIDADE-ONBOARDING-RETENCAO.md)
Feito (fases A a D, ainda por testar com estudantes): guarda central, limite de pedidos em base de dados, chaves estrangeiras com CASCADE (`student_profiles`, `notifications`, `quiz_attempts`, `posts`), registo de 1 ecrã, onboarding de 3 ecrãs, regras de idade, `study_days`, saudação de aniversário. Migrações `0024_identidade_onboarding.sql` e `0025_outra_classe_notificacoes.sql`: correr `npm run migrate` antes de publicar (o código lê `other_level` e as colunas novas das notificações).
Por fazer:
- Fase C (resto): lista de dispositivos com sessão aberta e «terminar sessão» no perfil; mudar e-mail; apagar conta e exportar dados.
- Fase E: marcos na plataforma, banner de anúncios do admin, barra de cookies com Aceitar e Recusar para o Google Analytics.
- Fase F: e-mail de lembretes com orçamento diário, `notification_outbox`, cron, desligar com um clique, pré-visualização no admin, e-mail de aniversário. Hoje `notification_prefs` só guarda a escolha do ecrã 3: nada a lê.
- Fase G: Web Push (o botão «No telemóvel» do onboarding está desactivado).
- Fase H: datas de exame por instituição e contagem no painel.
- Estudantes que já tinham conta passam pelo onboarding no próximo acesso (falta-lhes data de nascimento, meta e escolha de lembretes).
- Quem entra por Google, com consentimento por registar, vê a caixa dos Termos no ecrã 1 do onboarding.

## Decisões por tomar
- Pagamento: moeda, meio (cartão ou carteira móvel) e o que o plano pago desbloqueia. Sugestão: lançar gratuito e cobrar depois.
- Menores de idade: decidido idade mínima de conta 13 (`MIN_AGE` em `lib/identity.ts`) e predefinições de privacidade abaixo de 18. Falta confirmar com quem conheça a lei local.
- Comunidade e Desafios: terminar ou retirar até haver estudantes.
- Conteúdo mínimo para lançar (percursos, disciplinas, número de questões).
- Gestor de pacotes: npm ou pnpm.
- Origens de questão jogáveis (`PLAYABLE_ORIGINS` em `lib/simulator.ts`).
- Decisões em aberto de `SIMULADOR.md` (secção 11) e `JONAS.md` (secção 7).

## Documentos
- `docs/IDENTIDADE-ONBOARDING-RETENCAO.md`: desenho final de identidade, onboarding, actividade e retenção (fases A a H).
- `SIMULADOR.md`, `JONAS.md`, `CONVITES.md`, `ADMIN-MATERIAIS.md`, `docs/EMAIL.md`, `docs/CURSOS-UEM-2026.md`, `docs/prompt-csv-questoes.md`: mantidos; ainda não foram revistos contra o código.
EOF


# Cores: o cinzento sai de todo o projecto. Texto secundário e ícones passam a verde escuro visível (#3f6357).
echo "A trocar os cinzentos por verde escuro"
find app components lib -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -print0 \
  | xargs -0 sed -i -E 's/#(4b574f|4d5851|4f574f|526057|59615b|5d675f|5d6b64|5f6962|5f6a63|5f6d63|606860|62675e|626a62|657067|667066|68716a|68716b|68716c|68736a|6b716c|6b756e|6e756f|727a73|737a73|737c75|788178|7a8179|7a827b|7a827c|7c847c|7d857e|7d887f|899088|8a9188|8a918a|8a928b|8a928c|8a948c|929991|929b94|98a19a|9aa29b|9aa29c|9aa39c|9aa49c|9aa59e|9da49d|b0b6b1|b9c0b4)\b/#3f6357/g'

# A migração 0025 tem de estar aplicada antes de publicar: o código lê other_level e as colunas novas das notificações.
if [ "${SKIP_MIGRATE:-0}" != "1" ]; then
  echo "A aplicar migrações"
  npm run migrate
else
  echo "AVISO: migrações saltadas. Corre npm run migrate antes de a Vercel publicar."
fi

# Barreira: nada vai para o git se a compilação falhar.
npm run build

git add -A
git commit -m "Onboarding pergunta se quer praticar agora, percurso Outra, selectores personalizados, notificacoes compactas, textos de ajuda e cores sem cinzento"
git push
echo "Concluido."
