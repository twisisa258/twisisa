import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { addMessage, checkAllowance, deleteTrailing, getExplainMessages, getExplainTarget, getOrCreateExplainConversation, lastMessageRole, lastMessages } from '@/lib/jonas'
import { MAX_HISTORY_MESSAGES, buildExplainSystem, explainConversation, explainUserText, isExplainAction } from '@/lib/jonas-prompts'
import { jsonResponse, streamReply } from '@/lib/jonas-stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_QUESTION_CHARS = 1000

async function userIdOrNull() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

// Explicação já guardada de uma questão (sem gastar IA). Só existe depois de o aluno responder.
export async function GET(request: Request) {
  const userId = await userIdOrNull()
  if (!userId) return jsonResponse({ error: 'Entra na tua conta.' }, 401)
  const url = new URL(request.url)
  const attemptId = url.searchParams.get('attemptId') ?? ''
  const position = Number.parseInt(url.searchParams.get('position') ?? '', 10)
  if (!attemptId || attemptId.length > 100 || !Number.isInteger(position) || position < 0 || position > 200) return jsonResponse({ error: 'Pedido inválido.' }, 400)
  try {
    if (!(await getExplainTarget(userId, attemptId, position))) return jsonResponse({ error: 'Responde primeiro à questão.' }, 404)
    const messages = await getExplainMessages(userId, attemptId, position)
    // Um pedido que ficou sem resposta (falha de ligação) não se mostra.
    if (messages.length && messages[messages.length - 1].role === 'user') messages.pop()
    return jsonResponse({ messages })
  } catch (error) {
    console.error('[JONAS] ler explicação', error)
    return jsonResponse({ error: 'Não foi possível carregar a explicação.' }, 500)
  }
}

// Pede ao Jonas que explique uma questão do Simulador. Corpo: { attemptId, position, action, text? }.
// `action`: passo (explicação passo a passo), devagar, exemplo, outras, resumo ou pergunta (com `text`).
export async function POST(request: Request) {
  const userId = await userIdOrNull()
  if (!userId) return jsonResponse({ error: 'Entra na tua conta.' }, 401)

  const body = (await request.json().catch(() => null)) as { attemptId?: unknown; position?: unknown; action?: unknown; text?: unknown } | null
  const attemptId = typeof body?.attemptId === 'string' ? body.attemptId : ''
  const position = typeof body?.position === 'number' ? body.position : Number.NaN
  const action = body?.action
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!attemptId || attemptId.length > 100 || !Number.isInteger(position) || position < 0 || position > 200 || !isExplainAction(action)) return jsonResponse({ error: 'Pedido inválido.' }, 400)
  if (action === 'pergunta' && (!text || text.length > MAX_QUESTION_CHARS)) return jsonResponse({ error: text ? `A pergunta é demasiado longa (máximo ${MAX_QUESTION_CHARS} caracteres).` : 'Escreve a tua dúvida.' }, 400)

  try {
    const target = await getExplainTarget(userId, attemptId, position)
    if (!target) return jsonResponse({ error: 'Responde primeiro à questão.' }, 404)

    const conversationId = await getOrCreateExplainConversation(userId, attemptId, position, target)

    // A explicação passo a passo já feita para esta questão volta tal como estava: não se gasta IA outra vez.
    if (action === 'passo') {
      const stored = await getExplainMessages(userId, attemptId, position)
      const first = stored.find((message) => message.role === 'assistant')
      if (first) return new Response(first.content, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
    }

    const allowance = await checkAllowance(userId)
    if (!allowance.ok) return jsonResponse({ error: allowance.message }, 429)

    // Um pedido anterior que ficou sem resposta é substituído por este.
    if ((await lastMessageRole(conversationId)) === 'user') await deleteTrailing(conversationId, 'user')
    const history = await lastMessages(conversationId, MAX_HISTORY_MESSAGES)
    await addMessage(conversationId, 'user', explainUserText(action, text))

    return await streamReply({
      messages: [{ role: 'system', content: buildExplainSystem(target.question, { trackLabel: target.trackLabel }) }, ...explainConversation(target.question, history, action, text)],
      signal: request.signal,
      temperature: 0.3,
      maxTokens: 1400,
      onComplete: (answer) => addMessage(conversationId, 'assistant', answer),
    })
  } catch (error) {
    console.error('[JONAS] explicar', error)
    return jsonResponse({ error: 'O Jonas não conseguiu responder. Tenta de novo.' }, 500)
  }
}
