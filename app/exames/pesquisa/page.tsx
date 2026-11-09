import Link from 'next/link'
import { Search } from 'lucide-react'
import { ExamRow } from '@/components/exames/exam-row'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
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
      <section className="tw5-top">
        <h1 className="tw5-h1">{q ? <>«{q}»</> : <>Todos os <em>exames.</em></>}</h1>
        <form role="search" action="/exames/pesquisa" method="get" className="tw5-search">
          <div>
            <label htmlFor="pesq-q" className="sr-only">Pesquisar exames</label>
            <input id="pesq-q" name="q" type="search" defaultValue={q} maxLength={80} autoComplete="off" placeholder="Ex.: Matemática UEM 2023" />
          </div>
          <button type="submit" className="tw-btn"><Search size={18} aria-hidden /> Pesquisar</button>
        </form>
        <p className="tw5-sub">{total === 0 ? 'Nenhum exame encontrado.' : `${total} ${total === 1 ? 'exame' : 'exames'}`}</p>
      </section>

      {items.length === 0 ? (
        <div className="tw5-sec tw5-vazio">
          <p style={{ margin: 0 }}>Tenta só a disciplina, a universidade ou o ano.</p>
          <div className="tw5-actions"><Link href="/exames" className="tw-btn">Ver as universidades</Link></div>
        </div>
      ) : (
        <ul className="tw5-rows" style={{ marginTop: 34 }}>
          {items.map((exam) => <li key={exam.id}><ExamRow exam={exam} /></li>)}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Paginação" className="tw5-pager">
          {page > 1 ? <Link href={link(page - 1)} rel="prev" className="tw-btn ol">← Anterior</Link> : <span />}
          <span>{page} / {pages}</span>
          {page < pages ? <Link href={link(page + 1)} rel="next" className="tw-btn">Seguinte →</Link> : <span />}
        </nav>
      )}
    </PublicShell>
  )
}
