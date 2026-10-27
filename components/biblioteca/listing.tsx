import Link from 'next/link'
import { SearchX, FolderOpen } from 'lucide-react'
import { getCategoryCounts, getFacets, getSavedIds, listMaterials } from '@/lib/library'
import { withParams, type ListParams } from '@/lib/library-shared'
import { LibraryProvider } from '@/components/biblioteca/library-provider'
import { MaterialCard } from '@/components/biblioteca/material-card'
import { LibrarySearch } from '@/components/biblioteca/library-search'
import { ListingFilters } from '@/components/biblioteca/listing-filters'
import { ChipRow, type Chip } from '@/components/biblioteca/chip-row'
import { Pagination } from '@/components/biblioteca/pagination'
import { EmptyState } from '@/components/states/empty-state'

// Lista de uma secção (ou de todos os materiais): pesquisa, instituição, disciplina, ano e páginas.
// Tudo é filtrado e paginado na base de dados: com 800 exames por instituição a página continua leve.
export async function Listing({ userId, basePath, category, params }: { userId: string; basePath: string; category?: string; params: ListParams }) {
  const filters = { category: category ?? (params.categoria || undefined), q: params.q, institution: params.institution, subject: params.subject, year: params.year }
  const categoria = category ? '' : params.categoria

  let data: Awaited<ReturnType<typeof listMaterials>> | null = null
  let facets: Awaited<ReturnType<typeof getFacets>> | null = null
  let counts: Awaited<ReturnType<typeof getCategoryCounts>> = []
  let savedIds: string[] = []
  try {
    ;[data, facets, counts, savedIds] = await Promise.all([
      listMaterials(filters, params.page),
      getFacets(filters),
      category ? Promise.resolve([]) : getCategoryCounts(),
      getSavedIds(userId).catch(() => [] as string[]),
    ])
  } catch (error) {
    console.error('[BIBLIOTECA] Erro ao listar', error)
  }

  const hrefFor = (override: Partial<{ instituicao: string; categoria: string; pagina: number }>) =>
    withParams(basePath, {
      q: params.q,
      categoria: override.categoria ?? categoria,
      instituicao: override.instituicao ?? params.institution,
      disciplina: override.instituicao !== undefined ? '' : params.subject,
      ano: override.instituicao !== undefined ? '' : params.year,
      pagina: override.pagina,
    })

  const institutionChips: Chip[] = facets && facets.institutions.length > 0
    ? [
        { key: 'todas', label: 'Todas', href: hrefFor({ instituicao: '' }), active: !params.institution },
        ...facets.institutions.map((item) => ({ key: item.value, label: item.label, count: item.count, href: hrefFor({ instituicao: item.value }), active: params.institution === item.value })),
      ]
    : []

  const categoryChips: Chip[] = !category && counts.length > 0
    ? [
        { key: 'todos', label: 'Tudo', href: withParams(basePath, { q: params.q }), active: !params.categoria },
        ...counts.map((item) => ({ key: item.slug, label: item.name, count: item.count, href: withParams(basePath, { q: params.q, categoria: item.slug }), active: params.categoria === item.slug })),
      ]
    : []

  const anyFilter = !!(params.q || params.institution || params.subject || params.year || params.categoria)

  return (
    <div className="space-y-4">
      <LibrarySearch scope={category} initialQuery={params.q} placeholder={category ? 'Pesquisar nesta secção' : 'Pesquisar na biblioteca'} />
      <ChipRow label="Tipo de material" chips={categoryChips} />
      <ChipRow label="Instituição" chips={institutionChips} />
      {facets && (
        <ListingFilters
          basePath={basePath}
          q={params.q}
          categoria={categoria}
          institution={params.institution}
          subject={params.subject}
          year={params.year ? String(params.year) : ''}
          subjects={facets.subjects}
          years={facets.years}
        />
      )}

      {!data ? (
        <EmptyState title="Não foi possível carregar" description="Tenta outra vez dentro de instantes." actionLabel="Voltar à Biblioteca" actionHref="/biblioteca" icon={FolderOpen} />
      ) : data.total === 0 ? (
        anyFilter ? (
          <div className="rounded-3xl bg-white px-5 py-10 text-center shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)]">
            <SearchX size={26} className="mx-auto text-[#788178]" />
            <p className="mt-3 text-sm font-semibold text-[#202923]">Nenhum resultado</p>
            <Link href={basePath} className="mt-4 inline-flex h-10 items-center rounded-full bg-gradient-to-br from-[#2a6a57] to-[#1d4d41] px-5 text-sm font-semibold text-white">
              Limpar pesquisa
            </Link>
          </div>
        ) : (
          <EmptyState title="Ainda sem materiais aqui" actionLabel="Voltar à Biblioteca" actionHref="/biblioteca" icon={FolderOpen} />
        )
      ) : (
        <LibraryProvider savedIds={savedIds}>
          <p className="text-xs text-[#788178]">{data.total === 1 ? '1 material' : `${data.total} materiais`}</p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {data.items.map((item) => (
              <li key={item.id} className="min-w-0">
                <MaterialCard item={item} />
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <Pagination page={data.page} pages={data.pages} hrefFor={(page) => hrefFor({ pagina: page })} />
          </div>
        </LibraryProvider>
      )}
    </div>
  )
}
