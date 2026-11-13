import { getAdminUser } from '@/lib/admin'
import { modeloSessao } from '@/lib/importacao-sessao'

export const dynamic = 'force-dynamic'

// Modelo do CSV de uma sessão de importação: só as questões (a instituição, a disciplina e o nível escolhem-se nos passos).
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return new Response('Não encontrado', { status: 404 })
  return new Response(`\uFEFF${modeloSessao()}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-importacao.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
