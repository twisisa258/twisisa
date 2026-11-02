import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pushConfigError, pushConfigured, pushToUserReport } from '@/lib/push'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'A tua sessão expirou. Inicia sessão outra vez.' }, { status: 401 })
  if (!pushConfigured()) return NextResponse.json({ error: `As notificações não estão configuradas no servidor. ${pushConfigError() ?? ''}`.trim() }, { status: 503 })
  const report = await pushToUserReport(session.user.id, { title: 'Twisisa', body: 'Está a funcionar. Os lembretes de estudo chegam assim.', url: '/aluno/lembretes' })
  if (report.ok > 0) return NextResponse.json({ ok: true, sent: report.ok })
  if (report.total === 0) return NextResponse.json({ error: 'Este aparelho não está registado no servidor. Desliga e liga outra vez.' }, { status: 502 })
  if (report.statuses.some((s) => s === 401 || s === 403)) return NextResponse.json({ error: 'O serviço de notificações recusou as chaves do servidor. Confirma que VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY são do mesmo par, faz novo deploy, desliga e liga outra vez neste aparelho.' }, { status: 502 })
  if (report.removed > 0) return NextResponse.json({ error: 'O registo deste aparelho tinha expirado e foi apagado. Desliga e liga outra vez.' }, { status: 502 })
  return NextResponse.json({ error: `Não foi possível enviar para este aparelho (código ${report.statuses.join(', ') || 'desconhecido'}). Desliga e liga outra vez.` }, { status: 502 })
}
