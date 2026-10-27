import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { listConversations } from '@/lib/jonas'
import { jsonResponse } from '@/lib/jonas-stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Lista de conversas do aluno (mais recentes primeiro).
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return jsonResponse({ error: 'Entra na tua conta.' }, 401)
  try {
    return jsonResponse({ conversations: await listConversations(session.user.id) })
  } catch (error) {
    console.error('[JONAS] listar conversas', error)
    return jsonResponse({ error: 'Não foi possível carregar o histórico.' }, 500)
  }
}
