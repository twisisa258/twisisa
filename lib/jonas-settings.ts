import { pool } from '@/lib/db'
import { groqModelFromEnv, groqModels, isReasoningEffort, normalizeModelList, type ReasoningEffort } from '@/lib/groq'

// Definições do Jonas controladas pelo admin (só servidor). A chave da Groq NÃO passa por aqui: vive em GROQ_API_KEY.
// Se a tabela ainda não existe (migração 0020 por aplicar) ou a base falha, o Jonas continua com as predefinições.

export type ModelSource = 'admin' | 'env' | 'default'

export type JonasSettings = {
  enabled: boolean
  /** Modelos escolhidos no painel, por ordem. Vazio = automático. */
  adminModels: string[]
  reasoningEffort: ReasoningEffort
  updatedBy: string | null
  updatedAt: Date | null
}

export type JonasRuntime = {
  enabled: boolean
  /** Lista que o Jonas vai mesmo usar, por ordem. */
  models: string[]
  modelSource: ModelSource
  reasoningEffort: ReasoningEffort
}

const DEFAULTS: JonasSettings = { enabled: true, adminModels: [], reasoningEffort: 'low', updatedBy: null, updatedAt: null }
const CACHE_MS = 15_000
let cache: { at: number; value: JonasSettings } | null = null

const isMissingTable = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const { code, cause } = error as { code?: unknown; cause?: unknown }
  return code === '42P01' || isMissingTable(cause)
}

/** Lê as definições (com cache curto, para não ir à base de dados em cada mensagem). */
export async function getJonasSettings(options: { fresh?: boolean } = {}): Promise<JonasSettings> {
  if (!options.fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value
  let value = DEFAULTS
  try {
    const found = await pool.query(`SELECT enabled, models, reasoning_effort, updated_by, updated_at FROM jonas_settings WHERE id = 'default'`)
    const row = found.rows[0]
    if (row) {
      value = {
        enabled: row.enabled === true,
        adminModels: normalizeModelList(Array.isArray(row.models) ? row.models : []),
        reasoningEffort: isReasoningEffort(row.reasoning_effort) ? row.reasoning_effort : 'low',
        updatedBy: (row.updated_by as string | null) ?? null,
        updatedAt: row.updated_at ? new Date(row.updated_at) : null,
      }
    }
  } catch (error) {
    if (!isMissingTable(error)) throw error
    console.error('[JONAS] tabela jonas_settings em falta: aplica a migração 0020 (npm run migrate). A usar as predefinições.')
  }
  cache = { at: Date.now(), value }
  return value
}

export function resolveRuntime(settings: JonasSettings): JonasRuntime {
  if (settings.adminModels.length) return { enabled: settings.enabled, models: settings.adminModels, modelSource: 'admin', reasoningEffort: settings.reasoningEffort }
  return { enabled: settings.enabled, models: groqModels(), modelSource: groqModelFromEnv() ? 'env' : 'default', reasoningEffort: settings.reasoningEffort }
}

/** O que o Jonas usa agora. Nunca lança: se a base falhar, devolve as predefinições (ligado). */
export async function getJonasRuntime(): Promise<JonasRuntime> {
  try {
    return resolveRuntime(await getJonasSettings())
  } catch (error) {
    console.error('[JONAS] não foi possível ler as definições', error)
    return resolveRuntime(DEFAULTS)
  }
}

export async function saveJonasSettings(admin: { email: string }, input: { enabled: boolean; models: string[]; reasoningEffort: ReasoningEffort }): Promise<void> {
  await pool.query(
    `INSERT INTO jonas_settings (id, enabled, models, reasoning_effort, updated_by, updated_at)
     VALUES ('default', $1, $2::text[], $3, $4, now())
     ON CONFLICT (id) DO UPDATE SET enabled = $1, models = $2::text[], reasoning_effort = $3, updated_by = $4, updated_at = now()`,
    [input.enabled, input.models, input.reasoningEffort, admin.email],
  )
  cache = null
}

export const isMissingSettingsTable = isMissingTable

// ───────────── Uso (só números agregados: o admin não lê conversas dos alunos) ─────────────

export type JonasUsage = { conversations: number; messages7d: number; students7d: number; explanations: number }

export async function getJonasUsage(): Promise<JonasUsage> {
  const [conversations, messages, students, explanations] = await Promise.all([
    pool.query(`SELECT count(*)::int AS n FROM jonas_conversations WHERE kind = 'chat'`),
    pool.query(`SELECT count(*)::int AS n FROM jonas_messages WHERE role = 'user' AND created_at > now() - interval '7 days'`),
    pool.query(
      `SELECT count(DISTINCT c.user_id)::int AS n FROM jonas_messages m JOIN jonas_conversations c ON c.id = m.conversation_id
       WHERE m.role = 'user' AND m.created_at > now() - interval '7 days'`,
    ),
    pool.query(`SELECT count(*)::int AS n FROM jonas_conversations WHERE kind = 'simulador'`),
  ])
  return { conversations: conversations.rows[0].n, messages7d: messages.rows[0].n, students7d: students.rows[0].n, explanations: explanations.rows[0].n }
}
