import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { removeSubscription, saveSubscription } from '@/lib/push'

const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status })

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return bad('A tua sessão expirou. Inicia sessão outra vez.', 401)
  const body = await request.json().catch(() => null)
  const endpoint = body?.endpoint
  const p256dh = body?.keys?.p256dh
  const authKey = body?.keys?.auth
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 1000 || typeof p256dh !== 'string' || typeof authKey !== 'string' || p256dh.length > 200 || authKey.length > 100) return bad('Registo inválido.')
  await saveSubscription(session.user.id, { endpoint, p256dh, auth: authKey, userAgent: request.headers.get('user-agent')?.slice(0, 200) ?? null })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return bad('A tua sessão expirou. Inicia sessão outra vez.', 401)
  const body = await request.json().catch(() => null)
  if (typeof body?.endpoint !== 'string') return bad('Registo inválido.')
  await removeSubscription(session.user.id, body.endpoint)
  return NextResponse.json({ ok: true })
}
