import Link from 'next/link'
import { ArrowRight, ClipboardCheck, Compass, History, ListTree, Lock, RotateCcw, Swords, Target, Timer } from 'lucide-react'
import { getVisibleModules, type ModuleKey } from '@/lib/exam-modules'
import { listStudentInstitutions } from '@/lib/institutions'
import { trackLabel } from '@/lib/percurso'
import { getSimulatorHub } from '@/lib/simulator'
import { requireSimulatorScope } from '@/lib/simulator-scope'
import { MODE_META, SLUG_BY_MODE, formatPoints, percent, type AttemptMode } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { EmptyState } from '@/components/states/empty-state'
import { SimHeader } from '@/components/simulador/sim-header'
import { SubjectSelect } from '@/components/simulador/subject-select'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Simulador | Twisisa', description: 'Treina com prática, modo rápido e revisão de erros para o teu percurso.' }

// Sem bordas pesadas: sombra suave e degradês na família verde, como a Visão geral e a Biblioteca.
const soft = 'shadow-[0_1px_2px_rgba(20,50,40,0.05)]'
const card = `rounded-2xl bg-gradient-to-br from-white to-[#f4f6f1] ${soft}`
const label = 'px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4d41]'

// Os ícones são desenhados aqui, na página de servidor: nunca se passam como propriedade a componentes de cliente.
const ICONS: Record<ModuleKey, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  simulados: ClipboardCheck,
  pratica: Target,
  'modo-rapido': Timer,
  'revisar-erros': RotateCcw,
  'estudo-tematico': ListTree,
  'modo-duelo': Swords,
  'teste-vocacional': Compass,
  historico: History,
}
const MODE_BY_MODULE: Partial<Record<ModuleKey, AttemptMode>> = { pratica: 'pratica', 'modo-rapido': 'rapido', 'revisar-erros': 'revisao' }
const MODE_ICON: Record<AttemptMode, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = { pratica: Target, rapido: Timer, revisao: RotateCcw }

export default async function SimuladorPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { scope, firstName } = await requireSimulatorScope()
  const { d } = await searchParams
  const { track, institutionId } = scope

  let modules: Awaited<ReturnType<typeof getVisibleModules>> = []
  let hub: Awaited<ReturnType<typeof getSimulatorHub>> | null = null
  let institutionName: string | null = null
  let failed = false
  try {
    ;[modules, hub] = await Promise.all([getVisibleModules(track), getSimulatorHub(scope)])
    if (track === 'admissao' && institutionId) institutionName = (await listStudentInstitutions()).find((item) => item.id === institutionId)?.shortName ?? null
  } catch (error) {
    failed = true
    console.error('[SIMULADOR]', error)
  }
  const context = track === 'admissao' ? (institutionName ? `Admissão · ${institutionName}` : 'Admissão ao ensino superior') : trackLabel(track)

  const live = modules.filter((item) => item.status === 'active' && MODE_BY_MODULE[item.key])
  const enabled = live.flatMap((item) => (MODE_BY_MODULE[item.key] ? [MODE_BY_MODULE[item.key]!] : []))
  const upcoming = modules.filter((item) => !(item.status === 'active' && (MODE_BY_MODULE[item.key] || item.key === 'historico')))
  const hasHistory = modules.some((item) => item.key === 'historico' && item.status === 'active')

  // Disciplina escolhida (na ligação `?d=`); com uma só disciplina, fica escolhida sozinha.
  const subjects = hub?.subjects ?? []
  const chosen = subjects.find((item) => item.id === d) ?? (subjects.length === 1 ? subjects[0] : null)

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Simulador" title="Simulador" hideTitle hideBackLink>
      <div className="max-w-[640px] space-y-6">
        <SimHeader hint="Treina com questões do teu percurso" />

        {failed || !hub ? (
          <div role="alert" className={cn(card, 'px-5 py-8 text-center')}>
            <h2 className="text-base font-semibold">Não foi possível carregar o Simulador</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-[#68736a]">Verifica a ligação e tenta de novo.</p>
            <Link href="/aluno/simulador" className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#1d4d41] px-5 text-sm font-semibold text-white hover:bg-[#163e34]">Tentar de novo</Link>
          </div>
        ) : hub.totalQuestions === 0 || enabled.length === 0 ? (
          <EmptyState title="O Simulador abre em breve" description="Estamos a preparar as questões do teu percurso. Enquanto isso, estuda com os materiais da Biblioteca." actionLabel="Ver a Biblioteca" actionHref="/biblioteca" />
        ) : (
          <>
            {hub.open.filter((item) => enabled.includes(item.mode)).map((item) => (
              <Link key={item.id} href={`/aluno/simulador/sessao/${item.id}`} className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#235a4b] to-[#1d4d41] p-4 text-white">
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">Continuar de onde paraste</span>
                  <span className="mt-0.5 block truncate text-[15px] font-semibold">{MODE_META[item.mode].label}{item.subject ? ` · ${item.subject}` : ''}</span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/20"><span className="block h-full rounded-full bg-white" style={{ width: `${percent(item.answered, item.total)}%` }} /></span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-white/80">{item.answered}/{item.total}</span>
                <ArrowRight size={18} className="shrink-0" aria-hidden />
              </Link>
            ))}

            {/* 1 · Disciplina (sempre primeiro) */}
            <section aria-label="Escolher a disciplina" className="space-y-2">
              <h2 className={label}>1 · Disciplina</h2>
              <SubjectSelect subjects={subjects} current={chosen?.id ?? null} basePath="/aluno/simulador" />
            </section>

            {/* 2 · Modo: só abre depois de escolher a disciplina */}
            <section aria-label="Escolher como treinar" className="space-y-2">
              <h2 className={label}>2 · Como queres treinar?</h2>
              {!chosen && <p className="px-1 text-[13px] text-[#6b756e]">Escolhe primeiro a disciplina.</p>}
              <div className="space-y-2">
                {enabled.map((mode) => {
                  const Icon = MODE_ICON[mode]
                  const meta = MODE_META[mode]
                  const noErrors = mode === 'revisao' && hub.errorCount === 0
                  const locked = !chosen || noErrors
                  const hint = noErrors ? 'Ainda não tens erros para rever' : mode === 'revisao' ? `${hub.errorCount} ${hub.errorCount === 1 ? 'questão para rever' : 'questões para rever'}` : meta.tagline
                  const body = (
                    <>
                      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', locked ? 'bg-[#eef0ea] text-[#9aa29b]' : 'bg-[#1d4d41]/[0.08] text-[#1d4d41]')}><Icon size={18} aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold leading-5">{meta.label}</span>
                        <span className="block truncate text-[12.5px] leading-5 text-[#6b756e]">{hint}</span>
                      </span>
                      {locked ? <Lock size={15} className="shrink-0 text-[#b3b9b2]" aria-hidden /> : <ArrowRight size={16} className="shrink-0 text-[#1d4d41]" aria-hidden />}
                    </>
                  )
                  return locked ? (
                    <div key={mode} aria-disabled="true" className="flex items-center gap-3 rounded-2xl bg-white/60 p-3.5 opacity-70">{body}</div>
                  ) : (
                    <Link key={mode} href={`/aluno/simulador/${SLUG_BY_MODE[mode]}?d=${encodeURIComponent(chosen!.id)}`} className={cn(card, 'flex items-center gap-3 p-3.5 transition-colors hover:to-[#eaf1ec]')}>{body}</Link>
                  )
                })}
              </div>
            </section>

            {hub.stats.answered > 0 && (
              <section aria-label="O teu progresso" className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className={label}>O teu progresso</h2>
                  {hasHistory && <Link href="/aluno/simulador/historico" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1d4d41] hover:underline"><History size={14} aria-hidden />Histórico</Link>}
                </div>
                <dl className={cn(card, 'grid grid-cols-4 gap-1 p-3 text-center')}>
                  {[
                    ['Respondidas', String(hub.stats.answered)],
                    ['Acertos', `${percent(hub.stats.correct, hub.stats.answered)}%`],
                    ['Sessões', String(hub.stats.rounds)],
                    ['Pontos', formatPoints(hub.stats.points)],
                  ].map(([name, value]) => (
                    <div key={name} className="py-1">
                      <dd className="text-[18px] font-semibold tracking-[-0.02em]">{value}</dd>
                      <dt className="text-[11px] text-[#7d857e]">{name}</dt>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {upcoming.length > 0 && (
              <section aria-label="Em breve" className="space-y-2">
                <h2 className={label}>Em breve</h2>
                <ul className={cn(card, 'divide-y divide-black/[0.05] overflow-hidden')}>
                  {upcoming.map((item) => {
                    const Icon = ICONS[item.key]
                    return (
                      <li key={item.key} className="flex items-center gap-3 px-3.5 py-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eef0ea] text-[#7d857e]"><Icon size={16} aria-hidden /></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold leading-5">{item.label}</p>
                          <p className="truncate text-xs text-[#7d857e]">{item.description}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#f4eddb] px-2.5 py-1 text-[11px] font-semibold text-[#805f19]">Em breve</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {/* O percurso vem no fim: é informação, não um convite a mexer. */}
            <p className="flex items-center justify-between gap-3 px-1 text-[13px]">
              <span className="min-w-0 truncate"><span className="text-[#7d857e]">A preparar </span><span className="font-semibold">{context}</span></span>
              <Link href="/aluno/percurso" className="shrink-0 font-semibold text-[#1d4d41] hover:underline">Mudar percurso</Link>
            </p>
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
