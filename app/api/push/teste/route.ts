import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pushConfigured, pushToUser } from '@/lib/push'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'A tua sessão expirou. Inicia sessão outra vez.' }, { status: 401 })
  if (!pushConfigured()) return NextResponse.json({ error: 'As notificações ainda não estão configuradas no servidor (chaves VAPID em falta).' }, { status: 503 })
  const sent = await pushToUser(session.user.id, { title: 'Twisisa', body: 'Está a funcionar. Os lembretes de estudo chegam assim.', url: '/aluno/lembretes' })
  if (sent === 0) return NextResponse.json({ error: 'Não foi possível enviar para este aparelho. Desliga e liga outra vez.' }, { status: 502 })
  return NextResponse.json({ ok: true, sent })
}
