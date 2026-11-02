import { GroqError, openGroqStream } from '@/lib/groq'
import { studentMessage } from '@/lib/jonas-stream'
import { AppError } from '@/lib/action-result'

// Pedidos curtos à IA para as ferramentas do Kit (dica, questão parecida): sem fluxo, devolvem o texto inteiro.
// Passam pelas mesmas definições do Jonas (pausa, modelos, esforço) e pelas mesmas mensagens de erro para o aluno.
async function runtime() {
  if (!process.env.DATABASE_URL) return null
  try {
    const { getJonasRuntime } = await import('@/lib/jonas-settings')
    return await getJonasRuntime()
  } catch (error) {
    console.error('[KIT] definições do Jonas', error)
    return null
  }
}

export async function askAi(input: { system: string; user: string; maxTokens: number; temperature?: number }): Promise<string> {
  const settings = await runtime()
  if (settings && !settings.enabled) throw new AppError('O Jonas está em pausa neste momento. Volta mais tarde.')
  try {
    const stream = await openGroqStream({
      messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.user }],
      temperature: input.temperature ?? 0.3,
      maxTokens: input.maxTokens,
      models: settings?.modelSource === 'admin' ? settings.models : undefined,
      reasoningEffort: settings?.reasoningEffort,
    })
    let text = ''
    for await (const piece of stream) text += piece
    const clean = text.trim()
    if (!clean) throw new AppError('A IA não devolveu nada. Tenta de novo.')
    return clean
  } catch (error) {
    if (error instanceof AppError) throw error
    if (error instanceof GroqError) throw new AppError(studentMessage(error).message)
    throw error
  }
}
