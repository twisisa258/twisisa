import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { activeSubjectId, addMessage, checkAllowance, createConversation, deleteTrailing, getStudyContext, lastMessageRole, lastMessages, ownsConversation } from '@/lib/jonas'
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_CHARS, buildChatSystem } from '@/lib/jonas-prompts'
import { jsonResponse, streamReply } from '@/lib/jonas-stream'
import { recordStudy } from '@/lib/study-days'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Chat do Jonas. Corpo: { conversationId?, message, subjectId? } ou { conversationId, regenerate: true } («Responder de novo»
// e «Tentar de novo»). A resposta é texto em fluxo; os cabeçalhos X-Conversation-Id e X-Conversation-Title dizem a que conversa pertence.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return jsonResponse({ error: 'Entra na tua conta para falar com o Jonas.' }, 401)
  const userId = session.user.id

  const body = (await request.json().catch(() => null)) as { conversationId?: unknown; message?: unknown; subjectId?: unknown; regenerate?: unknown } | null
  if (!body) return jsonResponse({ error: 'Pedido inválido.' }, 400)
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const regenerate = body.regenerate === true
  const requestedId = typeof body.conversationId === 'string' && body.conversationId.length <= 100 ? body.conversationId : ''
  if (!regenerate && !message) return jsonResponse({ error: 'Escreve a tua dúvida.' }, 400)
  if (message.length > MAX_MESSAGE_CHARS) return jsonResponse({ error: `A mensagem é demasiado longa (máximo ${MAX_MESSAGE_CHARS} caracteres).` }, 400)
  if (regenerate && !requestedId) return jsonResponse({ error: 'Pedido inválido.' }, 400)

  try {
    const allowance = await checkAllowance(userId)
    if (!allowance.ok) return jsonResponse({ error: allowance.message }, 429)

    let conversationId = requestedId
    let title: string
    let subjectId: string | null
    if (conversationId) {
      const owned = await ownsConversation(userId, conversationId)
      if (!owned) return jsonResponse({ error: 'Conversa não encontrada.' }, 404)
      title = owned.title
      subjectId = owned.subjectId
    } else {
      subjectId = await activeSubjectId(typeof body.subjectId === 'string' && body.subjectId.length <= 100 ? body.subjectId : null)
      conversationId = await createConversation(userId, message, subjectId)
      const created = await ownsConversation(userId, conversationId)
      title = created?.title ?? 'Nova conversa'
    }

    if (regenerate) {
      if ((await lastMessageRole(conversationId)) === 'assistant') await deleteTrailing(conversationId, 'assistant')
      if ((await lastMessageRole(conversationId)) !== 'user') return jsonResponse({ error: 'Não há nenhuma pergunta por responder.' }, 400)
    } else {
      await addMessage(conversationId, 'user', message)
      // Dia de estudo: uma mensagem ao Jonas conta (não conta «Responder de novo»).
      await recordStudy(userId, 'jonas')
    }

    const [history, context] = await Promise.all([lastMessages(conversationId, MAX_HISTORY_MESSAGES), getStudyContext(userId, conversationId, subjectId)])
    const id = conversationId
    return await streamReply({
      messages: [{ role: 'system', content: buildChatSystem(context) }, ...history],
      signal: request.signal,
      temperature: 0.5,
      maxTokens: 1800,
      headers: { 'X-Conversation-Id': id, 'X-Conversation-Title': encodeURIComponent(title) },
      onComplete: (text) => addMessage(id, 'assistant', text),
    })
  } catch (error) {
    console.error('[JONAS] chat', error)
    return jsonResponse({ error: 'O Jonas não conseguiu responder. Tenta de novo.' }, 500)
  }
}
