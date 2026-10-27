import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, LayoutDashboard } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { getActivity, getCatalog, timeAgo, type Activity, type CatalogRow } from '@/lib/admin-overview'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminTabs } from '@/components/admin/page-parts'
import { EmptyState } from '@/components/states/empty-state'
import { UrlFeedback } from '@/components/url-feedback'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Visão geral | Administração | Twisisa' }

const nf = new Intl.NumberFormat('pt-PT')

function Stat({ label, value, hint, alert = false }: { label: string; value: number; hint?: string; alert?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border p-3.5 sm:p-5 ${alert ? 'border-[#ead9ae] bg-[#fbf6e8]' : 'border-[#e3e5dc] bg-white'}`}>
      <p className={`text-xl font-semibold tracking-tight sm:text-3xl ${alert ? 'text-[#805f19]' : 'text-[#1d4d41]'}`}>{nf.format(value)}</p>
      <p className="mt-1 truncate text-xs leading-4 text-[#737c75] sm:text-sm">{label}</p>
      {hint && <p className="mt-0.5 hidden truncate text-xs text-[#9aa39c] sm:block">{hint}</p>}
    </div>
  )
}

export default async function AdminHomePage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const { aba } = await searchParams
  const tab = aba === 'catalogo' ? 'catalogo' : 'actividade'

  let activity: Activity | null = null
  let catalog: CatalogRow[] | null = null
  try {
    if (tab === 'actividade') activity = await getActivity()
    else catalog = await getCatalog()
  } catch (error) {
    console.error('[ADMIN] Erro ao consultar a visão geral', error)
  }
  const failed = tab === 'actividade' ? activity === null : catalog === null

  return (
    <AdminPage>
      <UrlFeedback />
      <AdminPageHeader icon={LayoutDashboard} title="Visão geral" description="O que está a acontecer e o que está publicado." />
      <AdminTabs
        label="Secções da visão geral"
        tabs={[
          { href: '/admin', label: 'Actividade', active: tab === 'actividade' },
          { href: '/admin?aba=catalogo', label: 'Catálogo', active: tab === 'catalogo' },
        ]}
      />

      {failed ? (
        <AdminListPanel><AdminLoadError href={tab === 'catalogo' ? '/admin?aba=catalogo' : '/admin'} /></AdminListPanel>
      ) : tab === 'actividade' && activity ? (
        <>
          <dl className="grid shrink-0 grid-cols-3 gap-3">
            <Stat label="Por tratar" value={activity.pendingReports} hint="denúncias de materiais" alert={activity.pendingReports > 0} />
            <Stat label="Downloads" value={activity.downloads7d} hint="últimos 7 dias" />
            <Stat label="Novos alunos" value={activity.newUsers7d} hint={`${nf.format(activity.totalUsers)} no total`} />
          </dl>
          <AdminListPanel>
            <div className="shrink-0 border-b border-[#edf0e9] px-4 py-3 text-sm font-semibold sm:px-5">Registo recente</div>
            {activity.recent.length === 0 ? (
              <div className="m-4"><EmptyState title="Ainda sem actividade" description="As alterações feitas no admin aparecem aqui." /></div>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
                {activity.recent.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-5">{entry.title}</p>
                      {entry.subtitle && <p className="mt-0.5 truncate text-xs text-[#737c75]">{entry.subtitle}</p>}
                    </div>
                    <time dateTime={entry.at.toISOString()} className="shrink-0 text-xs text-[#9aa39c]">{timeAgo(entry.at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </AdminListPanel>
        </>
      ) : (
        <AdminListPanel>
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-2 sm:px-3">
            {catalog?.map((row) => (
              <li key={row.label}>
                <Link href={row.href} className="flex items-center gap-3 rounded-xl px-2 py-3.5 hover:bg-[#f7f8f4] sm:px-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-5">{row.label}</p>
                    <p className="mt-0.5 truncate text-xs text-[#737c75]">{nf.format(row.on)} {row.unit}{row.total !== row.on ? ` · ${nf.format(row.total)} no total` : ''}</p>
                  </div>
                  <span className="shrink-0 text-lg font-semibold tracking-tight text-[#1d4d41]">{nf.format(row.on)}</span>
                  <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-[#9aa39c]" />
                </Link>
              </li>
            ))}
          </ul>
        </AdminListPanel>
      )}
    </AdminPage>
  )
}
