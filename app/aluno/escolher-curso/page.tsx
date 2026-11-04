import { redirect } from 'next/navigation'

// A escolha do curso é um modal no painel. Esta rota só existe para links antigos.
export default async function EscolherCursoPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  redirect(`/aluno?curso=1${next ? `&next=${encodeURIComponent(next)}` : ''}`)
}
