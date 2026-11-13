import { timingSafeEqual } from 'node:crypto'
import { classificarTemas } from '@/lib/classificar-temas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

// Todas as noites o Jonas dá tema às questões que ficaram sem ele.
export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Não autorizado.' }, { status: 401 })
  try {
    return Response.json(await classificarTemas({ limite: 40 }), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[CRON] temas', error)
    return Response.json({ error: 'Falhou.' }, { status: 500 })
  }
}
