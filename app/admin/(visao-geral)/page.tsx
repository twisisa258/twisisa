import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, ChevronRight, CircleAlert, CircleCheck, Circle, ClipboardCheck, Flag, LayoutDashboard, Plus, TriangleAlert, Users } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listNotifications } from '@/lib/admin-notify'
import { getCatalog, timeAgo, type CatalogRow } from '@/lib/admin-overview'
import { getPainel, type Painel } from '@/lib/admin-painel'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminTabs } from '@/components/admin/page-parts'
import { UrlFeedback } from '@/components/url-feedback'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Painel | Administração | Twisisa' }

const nf = new Intl.NumberFormat('pt-PT')

function Numero({ rotulo, valor, dica, href, alerta = false }: { rotulo: string; valor: number; dica?: string; href: string; alerta?: boolean }) {
  return (
    <Link href={href} className={`min-w-0 rounded-2xl border p-3.5 transition hover:shadow-sm sm:p-5 ${alerta ? 'border-[#ead9ae] bg-[#fbf6e8]' : 'border-linha bg-white'}`}>
      <p className={`text-2xl font-semibold tracking-tight sm:text-3xl ${alerta ? 'text-aviso-texto' : 'text-marca'}`}>{nf.format(valor)}</p>
      <p className="mt-1 truncate text-xs leading-4 text-texto-2 sm:text-sm">{rotulo}</p>
      {dica && <p className="mt-0.5 truncate text-xs text-[#9aa39c]">{dica}</p>}
    </Link>
  )
}

function Cartao({ titulo, acao, children }: { titulo: string; acao?: { href: string; rotulo: string }; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-linha bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#edf0e9] px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        {acao && <Link href={acao.href} className="text-xs font-semibold text-marca hover:underline">{acao.rotulo}</Link>}
      </div>
      {children}
    </section>
  )
}

// O que precisa de existir antes de convidar alguém ou criar questões.
function Preparacao({ painel }: { painel: Painel }) {
  const { preparacao: p } = painel
  const passos = [
    { feito: p.instituicoes > 0, texto: `Instituições: ${p.instituicoes}`, href: '/admin/instituicoes' },
    { feito: p.disciplinas === 10, texto: `Disciplinas gerais: ${p.disciplinas} de 10`, href: '/admin/disciplinas' },
    { feito: p.variantes > 0, texto: `Variantes da UEM: ${p.variantes}`, href: '/admin/variantes' },
    { feito: p.temas > 0, texto: `Temas: ${p.temas} (cada questão pede um tema)`, href: '/admin/temas' },
    { feito: painel.questoes.publicadas + painel.questoes.rascunhos > 0, texto: 'Primeira questão criada', href: '/admin/questoes/nova' },
  ]
  if (passos.every((passo) => passo.feito)) return null
  return (
    <Cartao titulo="Primeiros passos">
      <ul className="divide-y divide-[#edf0e9] px-4 sm:px-5">
        {passos.map((passo) => (
          <li key={passo.texto}>
            <Link href={passo.href} className="flex items-center gap-3 py-3 text-sm">
              {passo.feito ? <CircleCheck size={18} aria-hidden="true" className="shrink-0 text-marca" /> : <Circle size={18} aria-hidden="true" className="shrink-0 text-[#b0b6b1]" />}
              <span className={passo.feito ? 'text-texto-2' : 'font-semibold'}>{passo.texto}</span>
              <ChevronRight size={16} aria-hidden="true" className="ml-auto shrink-0 text-[#9aa39c]" />
            </Link>
          </li>
        ))}
      </ul>
    </Cartao>
  )
}

export default async function AdminHomePage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const { aba } = await searchParams
  const tab = aba === 'catalogo' ? 'catalogo' : 'painel'

  let painel: Painel | null = null
  let avisos: Awaited<ReturnType<typeof listNotifications>> = []
  let catalogo: CatalogRow[] | null = null
  try {
    if (tab === 'painel') {
      ;[painel, avisos] = await Promise.all([getPainel(), listNotifications(admin.id, 'por_ler', 5)])
    } else {
      catalogo = await getCatalog()
    }
  } catch (error) {
    console.error('[ADMIN] Erro ao consultar o painel', error)
  }
  const falhou = tab === 'painel' ? painel === null : catalogo === null
  const maior = painel ? Math.max(1, ...painel.disciplinas.map((item) => item.publicadas + item.rascunhos)) : 1

  return (
    <AdminPage>
      <UrlFeedback />
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Painel"
        description="O estado do banco de questões e o que precisa de ti."
        action={
          <Link href="/admin/questoes/nova" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-escura">
            <Plus size={16} aria-hidden="true" /> Criar questões
          </Link>
        }
      />
      <AdminTabs
        label="Secções do painel"
        tabs={[
          { href: '/admin', label: 'Painel', active: tab === 'painel' },
          { href: '/admin?aba=catalogo', label: 'Catálogo', active: tab === 'catalogo' },
        ]}
      />

      {falhou ? (
        <AdminListPanel><AdminLoadError href={tab === 'catalogo' ? '/admin?aba=catalogo' : '/admin'} /></AdminListPanel>
      ) : tab === 'painel' && painel ? (
        <div className="grid gap-4">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Numero rotulo="Publicadas" valor={painel.questoes.publicadas} dica="o que os alunos veem" href="/admin/questoes?estado=publicadas" />
            <Numero rotulo="Rascunhos" valor={painel.questoes.rascunhos} dica="por publicar" href="/admin/questoes" />
            <Numero rotulo="Em revisão" valor={painel.questoes.emRevisao} dica="sem ano, tema ou variante" href="/admin/revisao" alerta={painel.questoes.emRevisao > 0} />
            <Numero rotulo="Reportes" valor={painel.reportes} dica="de alunos, por tratar" href="/admin/reportes" alerta={painel.reportes > 0} />
          </dl>

          <Preparacao painel={painel} />

          <Cartao titulo="Precisa de ti" acao={{ href: '/admin/notificacoes', rotulo: 'Ver todas' }}>
            {avisos.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-4 text-sm text-texto-2 sm:px-5"><Bell size={16} aria-hidden="true" /> Nada por ler.</p>
            ) : (
              <ul className="divide-y divide-[#edf0e9] px-4 sm:px-5">
                {avisos.map((aviso) => (
                  <li key={aviso.id}>
                    <Link href={aviso.link ?? '/admin/notificacoes'} className="flex items-start gap-3 py-3">
                      {aviso.level === 'aviso' || aviso.level === 'erro' ? <TriangleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-aviso-texto" /> : <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-marca" />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-5">{aviso.title}</span>
                        {aviso.body && <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-texto-2">{aviso.body}</span>}
                      </span>
                      <time dateTime={aviso.createdAt.toISOString()} className="shrink-0 text-xs text-[#9aa39c]">{timeAgo(aviso.createdAt)}</time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao titulo="Disciplinas" acao={{ href: '/admin/revisao', rotulo: 'Revisão' }}>
            <ul className="divide-y divide-[#edf0e9] px-4 sm:px-5">
              {painel.disciplinas.map((disciplina) => {
                const total = disciplina.publicadas + disciplina.rascunhos
                return (
                  <li key={disciplina.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-medium">{disciplina.name}</p>
                      <p className="shrink-0 text-xs text-texto-2">
                        {disciplina.publicadas} publicadas · {disciplina.rascunhos} rascunhos
                        {disciplina.revisao > 0 && <span className="font-semibold text-aviso-texto"> · {disciplina.revisao} em revisão</span>}
                      </p>
                    </div>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-[#eceee8]" role="img" aria-label={`${disciplina.name}: ${disciplina.publicadas} publicadas, ${disciplina.rascunhos} rascunhos`}>
                      <span className="bg-marca" style={{ width: `${(disciplina.publicadas / maior) * 100}%` }} />
                      <span className="bg-[#9bbfa8]" style={{ width: `${(disciplina.rascunhos / maior) * 100}%` }} />
                    </div>
                    {disciplina.temas === 0 && (
                      <Link href="/admin/temas" className="mt-1.5 inline-block text-xs font-semibold text-aviso-texto hover:underline">Sem temas: cria os temas desta disciplina</Link>
                    )}
                    {total === 0 && disciplina.temas > 0 && <p className="mt-1.5 text-xs text-[#9aa39c]">Ainda sem questões.</p>}
                  </li>
                )
              })}
            </ul>
          </Cartao>

          <div className="grid gap-4 lg:grid-cols-2">
            <Cartao titulo="Instituições">
              <ul className="divide-y divide-[#edf0e9] px-4 sm:px-5">
                {painel.instituicoes.map((instituicao) => (
                  <li key={instituicao.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="font-medium">{instituicao.label}</span>
                    <span className="text-xs text-texto-2">{instituicao.publicadas} publicadas · {instituicao.rascunhos} rascunhos</span>
                  </li>
                ))}
              </ul>
            </Cartao>
            <Cartao titulo="Contas" acao={{ href: '/admin/equipa', rotulo: 'Equipa' }}>
              <p className="flex items-center gap-3 px-4 py-4 text-sm sm:px-5">
                <Users size={18} aria-hidden="true" className="text-marca" />
                <span><strong>{nf.format(painel.contas.total)}</strong> no total · {nf.format(painel.contas.novos7d)} nos últimos 7 dias</span>
              </p>
              <p className="flex items-center gap-3 border-t border-[#edf0e9] px-4 py-4 text-sm sm:px-5">
                <ClipboardCheck size={18} aria-hidden="true" className="text-marca" />
                <span><strong>{nf.format(painel.questoes.arquivadas)}</strong> questões arquivadas</span>
              </p>
              <Link href="/admin/reportes" className="flex items-center gap-3 border-t border-[#edf0e9] px-4 py-4 text-sm sm:px-5">
                <Flag size={18} aria-hidden="true" className="text-marca" />
                <span>Reportes dos alunos</span>
                <ChevronRight size={16} aria-hidden="true" className="ml-auto text-[#9aa39c]" />
              </Link>
            </Cartao>
          </div>
        </div>
      ) : (
        <AdminListPanel>
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-2 sm:px-3">
            {catalogo?.map((row) => (
              <li key={row.label}>
                <Link href={row.href} className="flex items-center gap-3 rounded-xl px-2 py-3.5 hover:bg-[#f7f8f4] sm:px-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-5">{row.label}</p>
                    <p className="mt-0.5 truncate text-xs text-texto-2">{nf.format(row.on)} {row.unit}{row.total !== row.on ? ` · ${nf.format(row.total)} no total` : ''}</p>
                  </div>
                  <span className="shrink-0 text-lg font-semibold tracking-tight text-marca">{nf.format(row.on)}</span>
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
