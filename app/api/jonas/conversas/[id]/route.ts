import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { deleteConversation, getConversation, renameConversation } from '@/lib/jonas'
import { jsonResponse } from '@/lib/jonas-stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

async function userIdOrNull() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function GET(_request: Request, { params }: Context) {
  const userId = await userIdOrNull()
  if (!userId) return jsonResponse({ error: 'Entra na tua conta.' }, 401)
  const { id } = await params
  try {
    const conversation = await getConversation(userId, id)
    return conversation ? jsonResponse(conversation) : jsonResponse({ error: 'Conversa não encontrada.' }, 404)
  } catch (error) {
    console.error('[JONAS] abrir conversa', error)
    return jsonResponse({ error: 'Não foi possível abrir a conversa.' }, 500)
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const userId = await userIdOrNull()
  if (!userId) return jsonResponse({ error: 'Entra na tua conta.' }, 401)
  const { id } = await params
  const body = (await request.json().catch(() => null)) as { title?: unknown } | null
  if (typeof body?.title !== 'string' || !body.title.trim()) return jsonResponse({ error: 'Escreve um nome para a conversa.' }, 400)
  try {
    return (await renameConversation(userId, id, body.title)) ? jsonResponse({ ok: true }) : jsonResponse({ error: 'Conversa não encontrada.' }, 404)
  } catch (error) {
    console.error('[JONAS] mudar o nome', error)
    return jsonResponse({ error: 'Não foi possível mudar o nome.' }, 500)
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const userId = await userIdOrNull()
  if (!userId) return jsonResponse({ error: 'Entra na tua conta.' }, 401)
  const { id } = await params
  try {
    return (await deleteConversation(userId, id)) ? jsonResponse({ ok: true }) : jsonResponse({ error: 'Conversa não encontrada.' }, 404)
  } catch (error) {
    console.error('[JONAS] eliminar conversa', error)
    return jsonResponse({ error: 'Não foi possível eliminar a conversa.' }, 500)
  }
}
