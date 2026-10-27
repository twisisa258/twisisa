import { GroqError, openGroqStream, type ChatMessage } from '@/lib/groq'
import type { JonasRuntime } from '@/lib/jonas-settings'

// Resposta em fluxo do Jonas (só servidor). Falhas ANTES do primeiro texto viram uma resposta JSON com o estado certo;
// o texto que chegou é sempre guardado (mesmo que o aluno cancele a meio).

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })
}

/** Mensagem para o aluno (nunca expõe detalhes técnicos; esses ficam nos registos do servidor). */
export function studentMessage(error: unknown): { status: number; message: string } {
  if (error instanceof GroqError) {
    if (error.kind === 'busy') return { status: 429, message: 'O Jonas está com muitos pedidos agora. Tenta daqui a um minuto.' }
    if (error.kind === 'config') {
      console.error('[JONAS] configuração da Groq:', error.message)
      return { status: 503, message: 'O Jonas não está disponível neste momento. Tenta mais tarde.' }
    }
    if (error.kind === 'aborted') return { status: 499, message: 'Pedido cancelado.' }
    console.error('[JONAS] falha da Groq:', error.status, error.message)
    return { status: 502, message: 'O Jonas não conseguiu responder. Tenta de novo.' }
  }
  console.error('[JONAS]', error)
  return { status: 500, message: 'O Jonas não conseguiu responder. Tenta de novo.' }
}

export const PAUSED_MESSAGE = 'O Jonas está em pausa neste momento. Volta mais tarde.'

// As definições do admin (modelo, esforço, pausa) vêm da base de dados. Sem DATABASE_URL (testes) ou se a leitura falhar,
// o Jonas funciona com as predefinições: nunca fica parado por causa das definições.
async function loadRuntime(): Promise<JonasRuntime | null> {
  if (!process.env.DATABASE_URL) return null
  try {
    const { getJonasRuntime } = await import('@/lib/jonas-settings')
    return await getJonasRuntime()
  } catch (error) {
    console.error('[JONAS] definições', error)
    return null
  }
}

export async function streamReply(options: {
  messages: ChatMessage[]
  signal: AbortSignal
  temperature?: number
  maxTokens?: number
  headers?: Record<string, string>
  /** Chamado uma vez com o texto completo (ou o que chegou, se o aluno cancelou). */
  onComplete: (text: string) => Promise<void>
}): Promise<Response> {
  const runtime = await loadRuntime()
  if (runtime && !runtime.enabled) return jsonResponse({ error: PAUSED_MESSAGE }, 503, options.headers)

  let source: AsyncGenerator<string>
  try {
    source = await openGroqStream({
      messages: options.messages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      signal: options.signal,
      // Só a lista escolhida no painel é passada; sem ela, o cliente da Groq usa GROQ_MODEL ou a predefinição.
      models: runtime?.modelSource === 'admin' ? runtime.models : undefined,
      reasoningEffort: runtime?.reasoningEffort,
    })
  } catch (error) {
    const { status, message } = studentMessage(error)
    return jsonResponse({ error: message }, status, options.headers)
  }

  const encoder = new TextEncoder()
  let full = ''
  let saved = false
  const save = async () => {
    if (saved) return
    saved = true
    if (!full.trim()) return
    try {
      await options.onComplete(full)
    } catch (error) {
      console.error('[JONAS] não foi possível guardar a resposta', error)
    }
  }

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await source.next()
        if (next.done) {
          await save()
          controller.close()
          return
        }
        full += next.value
        controller.enqueue(encoder.encode(next.value))
      } catch (error) {
        await save()
        if (options.signal.aborted) {
          try {
            controller.close()
          } catch {
            // já fechado
          }
        } else {
          console.error('[JONAS] o fluxo da Groq foi interrompido', error)
          controller.error(error)
        }
      }
    },
    async cancel() {
      await source.return(undefined).catch(() => undefined)
      await save()
    },
  })

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no', ...options.headers },
  })
}
