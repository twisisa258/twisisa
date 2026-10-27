import { getAdminUser } from '@/lib/admin'
import { DRAFT_ID, sanitizeDraft } from '@/lib/question-draft-shared'
import { saveDraft } from '@/lib/question-drafts'

export const dynamic = 'force-dynamic'

const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

// Guardamento automático do editor «Adicionar questão». Chamado pelo browser enquanto o admin escreve.
// Só aceita JSON (um formulário de outro site não consegue enviá-lo) e do mesmo site.
export async function POST(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return json({ ok: false }, 404)
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ ok: false }, 403)
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json({ ok: false }, 415)

  const raw = await request.text()
  if (raw.length > 80_000) return json({ ok: false }, 413)
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ ok: false }, 400)
  }
  const id = body && typeof body === 'object' ? (body as { id?: unknown }).id : undefined
  if (typeof id !== 'string' || !DRAFT_ID.test(id)) return json({ ok: false }, 400)

  try {
    await saveDraft(admin.id, id, sanitizeDraft((body as { payload?: unknown }).payload))
    return json({ ok: true })
  } catch (error) {
    console.error('[ADMIN QUESTOES] rascunho em curso', error)
    return json({ ok: false }, 500)
  }
}
