import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell, BookOpen, ChevronRight, CircleCheck, Circle, FileSearch, Megaphone, Plus, UserPlus } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listNotifications } from '@/lib/admin-notify'
import { getActivity, timeAgo, type Activity } from '@/lib/admin-overview'
import { getPainel, type Painel } from '@/lib/admin-painel'
import { AdminLoadError, AdminPage, AdminPageHeader } from '@/components/admin/page-parts'
import { UrlFeedback } from '@/components/url-feedback'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Painel | Administração | Twisisa' }

const nf = new Intl.NumberFormat('pt-PT')

function Kpi({ rotulo, valor, dica, href, alerta = false }: { rotulo: string; valor: number; dica?: string; href: string; alerta?: boolean }) {
  return (
    <Link href={href} className={`ad-kpi ${alerta ? 'ad-kpi-al' : ''}`}>
      <small>{rotulo}</small>
      <b>{nf.format(valor)}</b>
      {dica && <i>{dica}</i>}
    </Link>
  )
}

function Cartao({ titulo, acao, extra, children }: { titulo: string; acao?: { href: string; rotulo: string }; extra?: string; children: React.ReactNode }) {
  return (
    <section className="ad-cd">
      <div className="ad-ch">
        <h2>{titulo}</h2>
        {acao ? <Link href={acao.href}>{acao.rotulo}</Link> : extra ? <span>{extra}</span> : null}
      </div>
      {children}
    </section>
  )
}

type Atencao = { tom: 'erro' | 'aviso' | 'info'; titulo: string; apoio: string; href: string; acao: string }

// O que precisa de ti agora, só com o que a base já sabe: reportes, revisão, avisos por ler e disciplinas sem temas.
function atencoes(painel: Painel, porLer: number): Atencao[] {
  const itens: Atencao[] = []
  if (painel.reportes > 0) itens.push({ tom: 'erro', titulo: `${nf.format(painel.reportes)} ${painel.reportes === 1 ? 'reporte por tratar' : 'reportes por tratar'}`, apoio: 'Questões que os alunos assinalaram como erradas ou ilegíveis', href: '/admin/reportes', acao: 'Ver reportes' })
  if (painel.questoes.emRevisao > 0) itens.push({ tom: 'aviso', titulo: `${nf.format(painel.questoes.emRevisao)} ${painel.questoes.emRevisao === 1 ? 'questão à espera de revisão' : 'questões à espera de revisão'}`, apoio: 'Falta-lhes ano, tema ou variante exata', href: '/admin/revisao', acao: 'Rever' })
  const semTemas = painel.disciplinas.filter((item) => item.temas === 0).length
  if (semTemas > 0) itens.push({ tom: 'aviso', titulo: `${semTemas} ${semTemas === 1 ? 'disciplina sem temas' : 'disciplinas sem temas'}`, apoio: 'Cada questão pede um tema', href: '/admin/temas', acao: 'Criar temas' })
  if (porLer > 0) itens.push({ tom: 'info', titulo: `${nf.format(porLer)} ${porLer === 1 ? 'aviso por ler' : 'avisos por ler'}`, apoio: 'O que aconteceu na administração', href: '/admin/notificacoes', acao: 'Abrir' })
  return itens
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
      <ul className="ad-lista">
        {passos.map((passo) => (
          <li key={passo.texto}>
            <Link href={passo.href} className="ad-linha">
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
  // O antigo separador «Catálogo» é agora a página do grupo.
  if ((await searchParams).aba === 'catalogo') redirect('/admin/grupo/catalogo')

  let painel: Painel | null = null
  let avisos: Awaited<ReturnType<typeof listNotifications>> = []
  let atividade: Activity | null = null
  try {
    ;[painel, avisos, atividade] = await Promise.all([getPainel(), listNotifications(admin.id, 'por_ler', 50), getActivity().catch(() => null)])
  } catch (error) {
    console.error('[ADMIN] Erro ao consultar o painel', error)
  }

  const q = painel?.questoes
  const total = q ? Math.max(1, q.rascunhos + q.emRevisao + q.publicadas) : 1
  const maior = painel ? Math.max(1, ...painel.disciplinas.map((item) => item.publicadas + item.rascunhos)) : 1
  const itens = painel ? atencoes(painel, avisos.length) : []

  return (
    <AdminPage>
      <UrlFeedback />
      <AdminPageHeader
        title="Painel"
        description="O estado da plataforma e o que precisa de ti."
        action={
          <>
            <Link href="/admin/importar" className="ad-bt"><FileSearch size={16} aria-hidden="true" /> Importar exame</Link>
            <Link href="/admin/questoes/nova" className="ad-bt ad-bt-p"><Plus size={16} aria-hidden="true" /> Criar questões</Link>
          </>
        }
      />

      {!painel || !q ? (
        <AdminLoadError href="/admin" />
      ) : (
        <div className="grid gap-3">
          <dl className="ad-kpis">
            <Kpi rotulo="Publicadas" valor={q.publicadas} dica="o que os alunos veem" href="/admin/questoes?estado=publicadas" />
            <Kpi rotulo="Em revisão" valor={q.emRevisao} dica="sem ano, tema ou variante" href="/admin/revisao" alerta={q.emRevisao > 0} />
            <Kpi rotulo="Reportes por tratar" valor={painel.reportes} dica="de alunos" href="/admin/reportes" alerta={painel.reportes > 0} />
            <Kpi rotulo="Novos alunos (7 dias)" valor={painel.contas.novos7d} dica={`${nf.format(painel.contas.total)} no total`} href="/admin/equipa" />
          </dl>

          <Preparacao painel={painel} />

          <div className="ad-g2">
            <Cartao titulo="Precisa de atenção" extra={itens.length ? `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}` : undefined}>
              {itens.length === 0 ? (
                <p className="ad-vazio"><CircleCheck size={16} aria-hidden="true" /> Tudo em dia.</p>
              ) : (
                <ul className="ad-lista">
                  {itens.map((item) => (
                    <li key={item.titulo} className="ad-at">
                      <span className={`ad-dt ad-dt-${item.tom}`} aria-hidden="true" />
                      <div className="min-w-0 flex-1"><b>{item.titulo}</b><small>{item.apoio}</small></div>
                      <Link href={item.href} className="ad-go">{item.acao}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>

            <Cartao titulo="Fluxo das questões" acao={{ href: '/admin/questoes', rotulo: 'Abrir banco' }}>
              <div className="ad-fl">
                <div><small>Rascunho</small><b>{nf.format(q.rascunhos)}</b><i><s style={{ width: `${(q.rascunhos / total) * 100}%`, background: 'var(--aviso, #a16207)' }} /></i></div>
                <div><small>Em revisão</small><b>{nf.format(q.emRevisao)}</b><i><s style={{ width: `${(q.emRevisao / total) * 100}%`, background: '#b45309' }} /></i></div>
                <div><small>Publicadas</small><b>{nf.format(q.publicadas)}</b><i><s style={{ width: `${(q.publicadas / total) * 100}%` }} /></i></div>
              </div>
              <div className="ad-sh">
                <Link href="/admin/importar"><FileSearch size={16} aria-hidden="true" /> Importar exame</Link>
                <Link href="/admin/materiais/novo"><BookOpen size={16} aria-hidden="true" /> Novo material</Link>
                <Link href="/admin/anuncios"><Megaphone size={16} aria-hidden="true" /> Novo anúncio</Link>
                <Link href="/admin/equipa"><UserPlus size={16} aria-hidden="true" /> Convidar revisor</Link>
              </div>
            </Cartao>
          </div>

          <Cartao titulo="Por disciplina" acao={{ href: '/admin/revisao', rotulo: 'Revisão' }}>
            <ul className="ad-lista">
              {painel.disciplinas.map((disciplina) => {
                const soma = disciplina.publicadas + disciplina.rascunhos
                return (
                  <li key={disciplina.id} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-sm font-semibold">{disciplina.name}</p>
                      <p className="shrink-0 text-xs text-texto-2">
                        {disciplina.publicadas} publicadas · {disciplina.rascunhos} rascunhos
                        {disciplina.revisao > 0 && <span className="font-semibold text-aviso-texto"> · {disciplina.revisao} em revisão</span>}
                      </p>
                    </div>
                    <div className="ad-barra" role="img" aria-label={`${disciplina.name}: ${disciplina.publicadas} publicadas, ${disciplina.rascunhos} rascunhos`}>
                      <span style={{ width: `${(disciplina.publicadas / maior) * 100}%` }} />
                      <span className="ad-barra-r" style={{ width: `${(disciplina.rascunhos / maior) * 100}%` }} />
                    </div>
                    {disciplina.temas === 0 && <Link href="/admin/temas" className="mt-1.5 inline-block text-xs font-semibold text-aviso-texto hover:underline">Sem temas: cria os temas desta disciplina</Link>}
                    {soma === 0 && disciplina.temas > 0 && <p className="mt-1.5 text-xs text-[#9aa39c]">Ainda sem questões.</p>}
                  </li>
                )
              })}
            </ul>
          </Cartao>

          <div className="ad-g2 ad-g2-eq">
            <Cartao titulo="Instituições">
              <ul className="ad-lista">
                {painel.instituicoes.map((instituicao) => (
                  <li key={instituicao.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="font-semibold">{instituicao.label}</span>
                    <span className="text-xs text-texto-2">{instituicao.publicadas} publicadas · {instituicao.rascunhos} rascunhos</span>
                  </li>
                ))}
              </ul>
            </Cartao>
            <Cartao titulo="Registo recente" acao={{ href: '/admin/notificacoes', rotulo: 'Ver tudo' }}>
              {!atividade || atividade.recent.length === 0 ? (
                <p className="ad-vazio"><Bell size={16} aria-hidden="true" /> Ainda sem registo.</p>
              ) : (
                <ul className="ad-lista">
                  {atividade.recent.slice(0, 6).map((entrada) => (
                    <li key={entrada.id} className="ad-ac">
                      <div className="min-w-0 flex-1"><b>{entrada.title}</b><small>{entrada.subtitle}</small></div>
                      <time dateTime={entrada.at.toISOString()}>{timeAgo(entrada.at)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
          </div>

        </div>
      )}
    </AdminPage>
  )
}
