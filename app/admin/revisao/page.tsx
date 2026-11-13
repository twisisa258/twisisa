import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClipboardCheck, Flag } from 'lucide-react'
import { getStaffAccess } from '@/lib/staff'
import { contarReportesAbertos, listarRevisao } from '@/lib/revisao-db'
import { ORDEM_RAZOES, razaoLabel } from '@/lib/revisao'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminPager, AdminTabs } from '@/components/admin/page-parts'
import { EmptyState } from '@/components/states/empty-state'
import { ClassificarTemasButton } from '@/components/admin/classificar-temas-button'
import { classificarTemasComJonas } from '@/app/admin/questoes/actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revisão | Administração | Twisisa' }

const PAGE_SIZE = 15

function href(razao: string | null, page: number) {
  const params = new URLSearchParams()
  if (razao) params.set('razao', razao)
  if (page > 1) params.set('pagina', String(page))
  const query = params.toString()
  return `/admin/revisao${query ? `?${query}` : ''}`
}

export default async function RevisaoPage({ searchParams }: { searchParams: Promise<{ razao?: string; pagina?: string }> }) {
  const access = await getStaffAccess()
  if (!access) redirect('/aluno')
  const params = await searchParams
  const razao = ORDEM_RAZOES.find((item) => item === params.razao) ?? null
  const page = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1)

  let dados: Awaited<ReturnType<typeof listarRevisao>> | null = null
  let reportes = 0
  try {
    ;[dados, reportes] = await Promise.all([listarRevisao(razao, page, PAGE_SIZE), contarReportesAbertos()])
  } catch (error) {
    console.error('[ADMIN] Erro ao consultar a revisão', error)
  }
  const pages = dados ? Math.max(1, Math.ceil(dados.total / PAGE_SIZE)) : 1
  const todas = dados ? Object.values(dados.porRazao).reduce((soma, n) => soma + n, 0) : 0

  return (
    <AdminPage>
      <AdminPageHeader icon={ClipboardCheck} title="Revisão" description="Questões a que falta alguma coisa: ano, tema, variante." />
      {reportes > 0 && (
        <Link href="/admin/reportes" className="flex shrink-0 items-center gap-3 rounded-2xl border border-[#ead9ae] bg-[#fbf6e8] px-4 py-3 text-sm font-semibold text-aviso-texto">
          <Flag size={18} aria-hidden="true" /> {reportes} {reportes === 1 ? 'reporte de aluno por tratar' : 'reportes de alunos por tratar'}
        </Link>
      )}
      {(dados?.porRazao.sem_tema ?? 0) > 0 && <ClassificarTemasButton action={classificarTemasComJonas} />}
      <AdminTabs
        label="Filtrar por motivo"
        tabs={[
          { href: '/admin/revisao', label: 'Todas', active: razao === null, count: razao === null ? dados?.total : undefined },
          ...ORDEM_RAZOES.map((item) => ({ href: href(item, 1), label: razaoLabel(item).replace('Possível duplicada', 'Duplicadas'), count: dados?.porRazao[item] ?? 0, active: razao === item })),
        ]}
      />
      <AdminListPanel>
        {!dados ? (
          <AdminLoadError href="/admin/revisao" />
        ) : dados.items.length === 0 ? (
          <div className="m-4"><EmptyState title="Nada para rever" description={todas === 0 ? 'Todas as questões têm ano, tema e variante.' : 'Não há questões com este motivo.'} /></div>
        ) : (
          <>
            <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
              {dados.items.map((item) => (
                <li key={item.id} className="py-3.5">
                  <Link href={`/admin/questoes?editar=${item.id}`} className="block">
                    <p className="line-clamp-2 text-sm font-medium leading-5">{item.statement.replace(/\s+/g, ' ')}</p>
                    <p className="mt-1 truncate text-xs text-texto-2">
                      {[item.institution ?? (item.track ? `${item.track}ª classe` : ''), item.subjectName, item.variant ? `Variante ${item.variant}` : '', item.examYear ? String(item.examYear) : ''].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {item.reasons.map((motivo) => (
                        <span key={motivo} className="rounded-full bg-[#fbf6e8] px-2.5 py-1 text-[11px] font-semibold text-aviso-texto">{razaoLabel(motivo)}</span>
                      ))}
                      <span className="ml-auto text-xs font-semibold text-marca">Corrigir</span>
                    </div>
                    {item.note && <p className="mt-1.5 text-xs text-texto-2">{item.note}</p>}
                  </Link>
                </li>
              ))}
            </ul>
            <AdminPager page={page} pages={pages} prevHref={href(razao, page - 1)} nextHref={href(razao, page + 1)} />
          </>
        )}
      </AdminListPanel>
    </AdminPage>
  )
}
