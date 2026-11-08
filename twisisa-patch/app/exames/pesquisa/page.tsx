import Link from 'next/link'
import { Search } from 'lucide-react'
import { ExamRow } from '@/components/exames/exam-row'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
import { findExams } from '@/lib/exames'
import { pageMetadata } from '@/lib/seo'

const PAGE_SIZE = 24

type Search = Promise<Record<string, string | string[] | undefined>>
const one = (value: string | string[] | undefined) => ((Array.isArray(value) ? value[0] : value) ?? '').trim()

// Resultados de pesquisa não se indexam (o Google indexa as páginas de cada exame); os links continuam a ser seguidos.
export const metadata = pageMetadata({ title: 'Pesquisar exames | Twisisa', description: 'Pesquisa exames de admissão por universidade, disciplina e ano.', path: '/exames/pesquisa', index: false })

export default async function PesquisaExamesPage({ searchParams }: { searchParams: Search }) {
  const raw = await searchParams
  const q = one(raw.q).replace(/\s+/g, ' ').slice(0, 80)
  const page = Math.min(Math.max(1, parseInt(one(raw.pagina), 10) || 1), 500)
  const { items, total } = await findExams({ q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }).catch(() => ({ items: [], total: 0 }))
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const link = (n: number) => `/exames/pesquisa?${new URLSearchParams({ ...(q ? { q } : {}), ...(n > 1 ? { pagina: String(n) } : {}) }).toString()}`

  return (
    <PublicShell>
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: 'Pesquisa' }]} />
      <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{q ? `Exames para «${q}»` : 'Todos os exames'}</h1>
      <form role="search" action="/exames/pesquisa" method="get" className="mt-5 flex max-w-[560px] items-center gap-2">
        <label htmlFor="pesq-q" className="sr-only">Pesquisar exames</label>
        <div className="relative min-w-0 flex-1">
          <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-texto-2" />
          <input id="pesq-q" name="q" type="search" defaultValue={q} maxLength={80} autoComplete="off" placeholder="Ex.: Matemática UEM 2023" className="min-h-[52px] w-full rounded-2xl border border-linha bg-white pl-11 pr-4 text-[16px] outline-none placeholder:text-texto-2 focus:border-marca" />
        </div>
        <button type="submit" className="btn btn-primario btn-grande shrink-0">Pesquisar</button>
      </form>
      <p className="mt-3 text-sm text-texto-2">{total === 0 ? 'Nenhum exame encontrado.' : `${total} ${total === 1 ? 'exame' : 'exames'}`}</p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-linha bg-white p-6">
          <p className="font-semibold">Não encontrámos nada{q ? ` para «${q}»` : ''}.</p>
          <p className="mt-1 text-sm leading-6 text-texto-2">Tenta só a disciplina (Matemática), a universidade (UEM) ou o ano (2023). Também podes escolher a universidade na página dos exames.</p>
          <Link href="/exames" className="btn btn-secundario mt-4">Ver as universidades</Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2.5 md:grid-cols-2">
          {items.map((exam, index) => <Reveal as="li" key={exam.id} delay={Math.min(index, 6) * 0.04}><ExamRow exam={exam} /></Reveal>)}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Paginação" className="mt-8 flex items-center justify-between gap-3 border-t border-linha pt-6">
          {page > 1 ? <Link href={link(page - 1)} rel="prev" className="btn btn-secundario btn-grande">Anterior</Link> : <span />}
          <span className="text-sm text-texto-2">Página {page} de {pages}</span>
          {page < pages ? <Link href={link(page + 1)} rel="next" className="btn btn-secundario btn-grande">Seguinte</Link> : <span />}
        </nav>
      )}
    </PublicShell>
  )
}
