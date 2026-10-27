import { streamText } from 'ai'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return new Response('Não autorizado', { status: 401 })

  const { messages } = await request.json()
  const result = streamText({
    model: 'openai/gpt-oss-120b',
    system: 'És o Jonas, um explicador académico para estudantes moçambicanos. Responde em português claro, explica passo a passo, reconhece incertezas e nunca inventes fontes. Não substituis professores nem fontes oficiais.',
    messages,
  })

  return result.toUIMessageStreamResponse()
}
