import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { popularTerms, recentSearches, suggestMaterials } from '@/lib/library'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'private, no-store' }

// GET /api/biblioteca/sugestoes?q=texto&scope=exames
// Devolve o histórico do aluno, os termos em alta (só sem texto) e até 6 materiais que correspondem ao texto.
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return Response.json({ recent: [], popular: [], items: [] }, { status: 401, headers: noStore })

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)
  const scopeRaw = url.searchParams.get('scope') ?? ''
  const scope = /^[a-z0-9-]{1,40}$/.test(scopeRaw) ? scopeRaw : undefined

  try {
    const [recent, popular, items] = await Promise.all([
      recentSearches(session.user.id, q).catch(() => [] as string[]),
      q ? Promise.resolve([] as string[]) : popularTerms().catch(() => [] as string[]),
      q.length >= 2 ? suggestMaterials(q, scope).catch(() => []) : Promise.resolve([]),
    ])
    return Response.json({ recent, popular, items }, { headers: noStore })
  } catch (error) {
    console.error('[BIBLIOTECA] Erro nas sugestões', error)
    return Response.json({ recent: [], popular: [], items: [] }, { status: 500, headers: noStore })
  }
}
