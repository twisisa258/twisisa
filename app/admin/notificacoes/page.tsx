import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { countNotifications, listNotifications, type FiltroAvisos } from '@/lib/admin-notify'
import { timeAgo } from '@/lib/admin-overview'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminTabs } from '@/components/admin/page-parts'
import { MarcarLida, MarcarTodasLidas } from '@/components/admin/notificacoes-acoes'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Notificações | Administração | Twisisa' }

const ICONES = { info: Info, sucesso: CircleCheck, aviso: TriangleAlert, erro: CircleAlert }
const TONS = { info: 'text-[#526057] bg-[#eef0ea]', sucesso: 'text-marca bg-[#e6f0e9]', aviso: 'text-aviso-texto bg-[#fbf6e8]', erro: 'text-[#a33a3a] bg-[#fbeaea]' }

export default async function NotificacoesPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const { ver } = await searchParams
  const filtro: FiltroAvisos = ver === 'por_ler' ? 'por_ler' : ver === 'avisos' ? 'avisos' : 'todas'

  let itens: Awaited<ReturnType<typeof listNotifications>> | null = null
  let totais: Awaited<ReturnType<typeof countNotifications>> | null = null
  try {
    ;[itens, totais] = await Promise.all([listNotifications(admin.id, filtro), countNotifications(admin.id)])
  } catch (error) {
    console.error('[ADMIN] Erro ao consultar as notificações', error)
  }

  return (
    <AdminPage>
      <AdminPageHeader
        icon={Bell}
        title="Notificações"
        description="Tudo o que acontece na administração chega aqui."
        action={totais ? <MarcarTodasLidas desativado={totais.porLer === 0} /> : undefined}
      />
      <AdminTabs
        label="Filtrar notificações"
        tabs={[
          { href: '/admin/notificacoes', label: 'Todas', count: totais?.todas, active: filtro === 'todas' },
          { href: '/admin/notificacoes?ver=por_ler', label: 'Por ler', count: totais?.porLer, active: filtro === 'por_ler' },
          { href: '/admin/notificacoes?ver=avisos', label: 'Avisos', count: totais?.avisos, active: filtro === 'avisos' },
        ]}
      />
      <AdminListPanel>
        {!itens ? (
          <AdminLoadError href="/admin/notificacoes" />
        ) : itens.length === 0 ? (
          <div className="m-4"><EmptyState title="Sem notificações" description="Quando importares, publicares ou alterares algo, o aviso aparece aqui." /></div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {itens.map((item) => {
              const Icone = ICONES[item.level]
              return (
                <li key={item.id} className="flex items-start gap-3 py-3.5">
                  <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${TONS[item.level]}`}><Icone size={17} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-5 ${item.read ? 'font-medium' : 'font-semibold'}`}>
                      {!item.read && <span aria-label="Por ler" className="mr-1.5 inline-block size-2 rounded-full bg-marca align-middle" />}
                      {item.title}
                    </p>
                    {item.body && <p className="mt-1 text-sm leading-6 text-texto-2">{item.body}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <time dateTime={item.createdAt.toISOString()} className="text-xs text-[#9aa39c]">{timeAgo(item.createdAt)}</time>
                      {item.link && <Link href={item.link} className="text-xs font-semibold text-marca hover:underline">Abrir</Link>}
                      {!item.read && <MarcarLida id={item.id} />}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </AdminListPanel>
    </AdminPage>
  )
}
