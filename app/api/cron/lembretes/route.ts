import { timingSafeEqual } from 'node:crypto'
import { pool } from '@/lib/db'
import { flushOutbox, queueReminders } from '@/lib/lembretes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Corre de hora a hora (vercel.json). A Vercel envia «Authorization: Bearer <CRON_SECRET>»; sem o segredo, a rota recusa tudo.
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const given = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Não autorizado.' }, { status: 401 })
  try {
    // Questões criadas pela IA para treino só servem durante uns dias.
    await pool.query(`DELETE FROM ai_practice WHERE created_at < now() - interval '7 days'`)
    const queued = await queueReminders()
    const flushed = await flushOutbox()
    return Response.json({ ...queued, ...flushed }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[CRON] lembretes', error)
    return Response.json({ error: 'Falhou.' }, { status: 500 })
  }
}
