import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listImportMaterials, type ImportMaterial } from '@/lib/importar-exame'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminSearchBar, normalizeSearch } from '@/components/admin/page-parts'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Importar exames | Administração | Twisisa' }

const STATUS: Record<ImportMaterial['status'], { label: string; tone: string }> = {
  nova: { label: 'Por ler', tone: 'bg-[#eef1ea] text-[#526057]' },
  em_curso: { label: 'A meio', tone: 'bg-aviso-suave text-aviso-texto' },
  concluida: { label: 'Concluída', tone: 'bg-sucesso-suave text-sucesso-texto' },
  erro: { label: 'Com erro', tone: 'bg-erro-suave text-erro-texto' },
}

function listHref(params: { inst: string; q?: string }) {
  const search = new URLSearchParams()
  search.set('inst', params.inst)
  if (params.q) search.set('q', params.q)
  return `/admin/importar?${search.toString()}`
}

export default async function AdminImportarPage({ searchParams }: { searchParams: Promise<{ inst?: string; q?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)

  let materials: ImportMaterial[] | null = null
  try {
    materials = await listImportMaterials()
  } catch (error) {
    console.error('[ADMIN IMPORTAR]', error)
  }

  const counts = new Map<string, number>()
  for (const item of materials ?? []) counts.set(item.institution ?? 'Sem instituição', (counts.get(item.institution ?? 'Sem instituição') ?? 0) + 1)
  const names = [...counts.keys()].sort((a, b) => a.localeCompare(b, 'pt'))
  const inst = params.inst === 'todas' || (params.inst && counts.has(params.inst)) ? (params.inst as string) : (names[0] ?? 'todas')
  const tabs = [...names.map((name) => ({ id: name, count: counts.get(name) ?? 0 })), { id: 'todas', count: materials?.length ?? 0 }]
  const term = normalizeSearch(q)
  const visible = (materials ?? []).filter((item) => (inst === 'todas' || (item.institution ?? 'Sem instituição') === inst) && (!term || normalizeSearch(`${item.title} ${item.subject ?? ''} ${item.year ?? ''}`).includes(term)))

  return (
    <AdminPage>
      <AdminPageHeader icon={Sparkles} title="Importar exames" description="O Jonas lê os exames da Biblioteca, 10 questões de cada vez, e propõe-nas como rascunho para rever." />
      {materials === null ? (
        <AdminLoadError href="/admin/importar" />
      ) : (
        <>
          <nav aria-label="Instituição" className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1">
            {tabs.map((tab) => {
              const active = tab.id === inst
              return (
                <Link key={tab.id} href={listHref({ inst: tab.id, q })} aria-current={active ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${active ? 'border-marca bg-marca font-semibold text-white' : 'border-[#dfe3d9] bg-white text-[#526057] hover:bg-[#f3f4ef]'}`}>
                  {tab.id === 'todas' ? 'Todas' : tab.id}
                  <span className={`text-xs tabular-nums ${active ? 'text-white/80' : 'text-texto-2'}`}>{tab.count}</span>
                </Link>
              )
            })}
          </nav>
          <AdminSearchBar q={q} placeholder="Procurar por título, disciplina ou ano" hidden={{ inst }} />
          <AdminListPanel>
            {visible.length === 0 ? (
              <EmptyState title={materials.length === 0 ? 'Ainda não há exames em PDF na Biblioteca' : 'Sem resultados'} description={materials.length === 0 ? 'Publica os exames em Materiais académicos e volta aqui.' : 'Tenta outra pesquisa ou outra instituição.'} />
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto">
                {visible.map((item) => (
                  <li key={item.id}>
                    <Link href={`/admin/importar/${item.id}`} className="flex items-center gap-3 px-4 py-3 text-texto no-underline transition-colors hover:bg-[#f6f8f3] sm:px-5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                        <span className="block truncate text-xs text-texto-2">{[item.institution, item.year, item.subject].filter(Boolean).join(' · ') || 'Sem classificação'}</span>
                      </span>
                      {item.imported > 0 && <span className="shrink-0 text-xs tabular-nums text-texto-2">{item.imported} questões</span>}
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS[item.status].tone}`}>{STATUS[item.status].label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminListPanel>
        </>
      )}
    </AdminPage>
  )
}
