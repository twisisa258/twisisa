// Cliente mínimo da Groq (API compatível com a da OpenAI), só para o servidor. Sem dependências novas: usa `fetch`.
// A chave nunca chega ao navegador. Variáveis: GROQ_API_KEY (obrigatória), GROQ_MODEL (opcional), GROQ_BASE_URL (opcional, para testes).
// O admin pode escolher os modelos no painel (`/admin/jonas`); o painel tem prioridade sobre GROQ_MODEL.

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export class GroqError extends Error {
  readonly status: number
  /** `config` = chave em falta ou recusada; `busy` = limite de pedidos; `upstream` = falha do serviço; `aborted` = cancelado. */
  readonly kind: 'config' | 'busy' | 'upstream' | 'aborted'
  constructor(kind: GroqError['kind'], status: number, message: string) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

// Modelos por ordem de preferência. Cada modelo tem os seus próprios limites na Groq, e os que estão disponíveis no plano
// gratuito mudam: por isso o Jonas tenta o seguinte quando um não existe na conta (400/403/404) ou está com o limite cheio (429).
// `GROQ_MODEL` (opcional) aceita um ou vários nomes separados por vírgulas e substitui esta lista.
export const DEFAULT_GROQ_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant']
const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1'
const REQUEST_TIMEOUT_MS = 60_000

export const REASONING_EFFORTS = ['low', 'medium', 'high'] as const
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]
export const isReasoningEffort = (value: unknown): value is ReasoningEffort => typeof value === 'string' && (REASONING_EFFORTS as readonly string[]).includes(value)

// Margem de tokens para o «pensamento» dos modelos gpt-oss (conta para o limite de tokens da resposta).
const REASONING_HEADROOM: Record<ReasoningEffort, number> = { low: 1500, medium: 2500, high: 4000 }

export const MAX_ADMIN_MODELS = 3

/** Nome de modelo aceitável (ex.: `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`). Não confirma que existe na conta. */
export const isValidModelName = (value: string) => /^[A-Za-z0-9][A-Za-z0-9._\-/:]{0,99}$/.test(value)

/** Limpa uma lista vinda do painel: tira espaços e vazios, repetidos e nomes inválidos (devolve só os válidos), no máximo `MAX_ADMIN_MODELS`. */
export function normalizeModelList(raw: unknown[]): string[] {
  const seen = new Set<string>()
  for (const item of raw) {
    const name = typeof item === 'string' ? item.trim() : ''
    if (name && isValidModelName(name)) seen.add(name)
  }
  return [...seen].slice(0, MAX_ADMIN_MODELS)
}

export const groqKeyConfigured = () => Boolean(process.env.GROQ_API_KEY?.trim())
const baseUrl = () => (process.env.GROQ_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')

/** `true` se o servidor tem GROQ_MODEL definido (usado só para dizer ao admin de onde vem a lista). */
export const groqModelFromEnv = () => (process.env.GROQ_MODEL ?? '').split(',').some((name) => name.trim())

export function groqModels(): string[] {
  const configured = (process.env.GROQ_MODEL ?? '').split(',').map((name) => name.trim()).filter(Boolean)
  return configured.length ? configured : DEFAULT_GROQ_MODELS
}

// Modelos que falharam há pouco: não se insiste neles em cada pedido (o aluno ficaria à espera de uma falha certa).
const resting = new Map<string, number>()
const REST_UNAVAILABLE_MS = 10 * 60_000
const REST_BUSY_MS = 45_000
export const resetModelMemory = () => resting.clear()

const isReasoningModel = (model: string) => model.startsWith('openai/gpt-oss')

/**
 * Lê um fluxo SSE («data: {json}\n\n») e devolve os pedaços de texto. Aceita pedaços partidos a meio de uma linha.
 * Separado do `fetch` para poder ser testado sem rede.
 */
export async function* readSseDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let newline: number
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, '')
        buffer = buffer.slice(newline + 1)
        const delta = parseSseLine(line)
        if (delta === END) return
        if (delta) yield delta
      }
    }
    const last = parseSseLine(buffer.replace(/\r$/, ''))
    if (last && last !== END) yield last
  } finally {
    reader.releaseLock?.()
  }
}

const END = Symbol('end')

function parseSseLine(line: string): string | typeof END | null {
  if (!line.startsWith('data:')) return null
  const data = line.slice(5).trim()
  if (!data) return null
  if (data === '[DONE]') return END
  try {
    const json = JSON.parse(data) as { choices?: { delta?: { content?: unknown } }[]; error?: { message?: string } }
    if (json.error) throw new GroqError('upstream', 502, json.error.message ?? 'Erro do fornecedor de IA.')
    const content = json.choices?.[0]?.delta?.content
    return typeof content === 'string' && content.length > 0 ? content : null
  } catch (error) {
    if (error instanceof GroqError) throw error
    return null // linha que não é JSON: ignora
  }
}

function friendly(status: number): GroqError {
  if (status === 401 || status === 403) return new GroqError('config', status, 'A chave da Groq foi recusada.')
  if (status === 429) return new GroqError('busy', 429, 'A Groq atingiu o limite de pedidos.')
  if (status === 400 || status === 404) return new GroqError('config', status, 'A Groq recusou o pedido (confirma o nome do modelo no painel do Jonas).')
  return new GroqError('upstream', status, 'A Groq não respondeu bem.')
}

type StreamOptions = { messages: ChatMessage[]; temperature?: number; maxTokens?: number; signal?: AbortSignal; models?: string[]; reasoningEffort?: ReasoningEffort }

async function openModel(model: string, apiKey: string, base: string, options: StreamOptions): Promise<AsyncGenerator<string>> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  // Os modelos gpt-oss «pensam» antes de responder e esse pensamento conta para o limite de tokens: esforço (por omissão baixo) e margem maior.
  const reasoning = isReasoningModel(model)
  const effort = options.reasoningEffort ?? 'low'
  let response: Response
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: options.messages,
        stream: true,
        temperature: options.temperature ?? 0.5,
        max_completion_tokens: (options.maxTokens ?? 1800) + (reasoning ? REASONING_HEADROOM[effort] : 0),
        ...(reasoning ? { reasoning_effort: effort } : {}),
      }),
      signal,
    })
  } catch (error) {
    if (options.signal?.aborted) throw new GroqError('aborted', 499, 'Pedido cancelado.')
    throw new GroqError('upstream', 504, error instanceof Error && error.name === 'TimeoutError' ? 'A Groq demorou demasiado.' : 'Não foi possível contactar a Groq.')
  }
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '')
    console.error('[JONAS] Groq recusou o pedido', model, response.status, detail.slice(0, 300))
    throw friendly(response.status)
  }
  return readSseDeltas(response.body)
}

/**
 * Abre a resposta em fluxo, tentando os modelos por ordem. Falhas antes do primeiro texto lançam `GroqError` aqui
 * (antes de se enviar qualquer coisa ao aluno). Só uma chave recusada (401) pára logo: trocar de modelo não a resolve.
 * `options.models` (vindo do painel do admin) tem prioridade sobre GROQ_MODEL e sobre a lista predefinida.
 */
export async function openGroqStream(options: StreamOptions): Promise<AsyncGenerator<string>> {
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) throw new GroqError('config', 503, 'GROQ_API_KEY não está definida no servidor.')
  const base = baseUrl()

  const all = options.models?.length ? options.models : groqModels()
  const now = Date.now()
  const ready = all.filter((model) => (resting.get(model) ?? 0) <= now)
  const order = ready.length ? ready : all // se todos estão de «castigo», tenta-os na mesma

  let busy: GroqError | null = null
  let last: GroqError | null = null
  for (const model of order) {
    try {
      return await openModel(model, apiKey, base, options)
    } catch (error) {
      if (!(error instanceof GroqError)) throw error
      if (error.kind === 'aborted' || error.status === 401) throw error
      if (error.kind === 'busy') {
        resting.set(model, Date.now() + REST_BUSY_MS)
        busy = error
      } else if (error.kind === 'config') {
        resting.set(model, Date.now() + REST_UNAVAILABLE_MS)
        last = error
      } else {
        last = error
      }
    }
  }
  // Se algum modelo só estava ocupado, é isso que o aluno deve ouvir («tenta daqui a pouco»).
  throw busy ?? last ?? new GroqError('upstream', 502, 'A Groq não respondeu bem.')
}

// ───────────── Painel do admin: lista de modelos da conta e teste de ligação ─────────────

export type ModelList = { ok: true; models: string[] } | { ok: false; reason: 'no-key' | 'unavailable' }

// Modelos que não servem para conversar (voz, moderação, etc.).
const NOT_CHAT = /whisper|tts|guard|orpheus|playai|embed|distil-whisper/i
let listCache: { at: number; models: string[] } | null = null

/** Modelos que a conta da Groq tem disponíveis agora (`GET /models`). Guardada 60 s para o painel não repetir o pedido. */
export async function listGroqModels(): Promise<ModelList> {
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) return { ok: false, reason: 'no-key' }
  if (listCache && Date.now() - listCache.at < 60_000) return { ok: true, models: listCache.models }
  try {
    const response = await fetch(`${baseUrl()}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(6_000), cache: 'no-store' })
    if (!response.ok) return { ok: false, reason: 'unavailable' }
    const json = (await response.json()) as { data?: { id?: unknown; active?: unknown }[] }
    const models = (json.data ?? [])
      .filter((item) => typeof item.id === 'string' && item.active !== false)
      .map((item) => item.id as string)
      .filter((id) => isValidModelName(id) && !NOT_CHAT.test(id))
      .sort()
    if (!models.length) return { ok: false, reason: 'unavailable' }
    listCache = { at: Date.now(), models }
    return { ok: true, models }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}

export type ModelTest = { model: string; ok: boolean; ms: number; message: string }

/** Pedido mínimo (sem fluxo) para confirmar que a chave e o modelo funcionam. Nunca devolve nem regista a chave. */
export async function testGroqModel(model: string): Promise<ModelTest> {
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) return { model, ok: false, ms: 0, message: 'GROQ_API_KEY não está definida no servidor.' }
  const started = Date.now()
  const reasoning = isReasoningModel(model)
  try {
    const response = await fetch(`${baseUrl()}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Responde só com a palavra: ok' }],
        stream: false,
        temperature: 0,
        max_completion_tokens: reasoning ? 300 : 12,
        ...(reasoning ? { reasoning_effort: 'low' } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
      cache: 'no-store',
    })
    const ms = Date.now() - started
    if (!response.ok) return { model, ok: false, ms, message: friendly(response.status).message }
    return { model, ok: true, ms, message: 'Respondeu bem.' }
  } catch (error) {
    const ms = Date.now() - started
    return { model, ok: false, ms, message: error instanceof Error && error.name === 'TimeoutError' ? 'A Groq demorou demasiado.' : 'Não foi possível contactar a Groq.' }
  }
}
