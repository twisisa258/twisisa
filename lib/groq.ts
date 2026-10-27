// Cliente mínimo da Groq (API compatível com a da OpenAI), só para o servidor. Sem dependências novas: usa `fetch`.
// A chave nunca chega ao navegador. Variáveis: GROQ_API_KEY (obrigatória), GROQ_MODEL (opcional), GROQ_BASE_URL (opcional, para testes).

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
  if (status === 400 || status === 404) return new GroqError('config', status, 'A Groq recusou o pedido (confirma o nome do modelo em GROQ_MODEL).')
  return new GroqError('upstream', status, 'A Groq não respondeu bem.')
}

async function openModel(model: string, apiKey: string, base: string, options: { messages: ChatMessage[]; temperature?: number; maxTokens?: number; signal?: AbortSignal }): Promise<AsyncGenerator<string>> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  // Os modelos gpt-oss «pensam» antes de responder e esse pensamento conta para o limite de tokens: esforço baixo e margem maior.
  const reasoning = isReasoningModel(model)
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
        max_completion_tokens: (options.maxTokens ?? 1800) + (reasoning ? 1500 : 0),
        ...(reasoning ? { reasoning_effort: 'low' } : {}),
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
 */
export async function openGroqStream(options: { messages: ChatMessage[]; temperature?: number; maxTokens?: number; signal?: AbortSignal }): Promise<AsyncGenerator<string>> {
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) throw new GroqError('config', 503, 'GROQ_API_KEY não está definida no servidor.')
  const base = (process.env.GROQ_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')

  const all = groqModels()
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
