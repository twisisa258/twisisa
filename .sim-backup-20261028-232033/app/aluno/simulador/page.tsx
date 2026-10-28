import Link from 'next/link'
import { ArrowRight, BookOpen, History, ShieldCheck } from 'lucide-react'
import { getVisibleModules, type ModuleKey } from '@/lib/exam-modules'
import { listStudentInstitutions } from '@/lib/institutions'
import { trackLabel } from '@/lib/percurso'
import { getSimulatorHub, getVariants, getWeakTopics } from '@/lib/simulator'
import { requireSimulatorScope } from '@/lib/simulator-scope'
import { getSimPrefs } from '@/lib/simulator-prefs-server'
import { sessionSize } from '@/lib/simulator-prefs'
import { MODE_META, ROUND_SIZE, clock, isAttemptMode, percent, type AttemptMode } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { EmptyState } from '@/components/states/empty-state'
import { SimHeader } from '@/components/simulador/sim-header'
import { SimTabs } from '@/components/simulador/sim-tabs'
import { Step } from '@/components/simulador/step'
import { SubjectSelect } from '@/components/simulador/subject-select'
import { ModePicker } from '@/components/simulador/mode-picker'
import { StartCard } from '@/components/simulador/start-actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Simulador | Twisisa', description: 'Escolhe a disciplina e treina com questões de exames.' }

const MODE_BY_MODULE: Partial<Record<ModuleKey, AttemptMode>> = { pratica: 'pratica', 'modo-rapido': 'rapido', 'revisar-erros': 'revisao' }
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export default async function SimuladorPage({ searchParams }: { searchParams: Promise<{ d?: string; m?: string }> }) {
  const { scope, firstName } = await requireSimulatorScope()
  const { d, m } = await searchParams
  const { track, institutionId } = scope

  let modules: Awaited<ReturnType<typeof getVisibleModules>> = []
  let hub: Awaited<ReturnType<typeof getSimulatorHub>> | null = null
  let institutionName: string | null = null
  let failed = false
  const prefs = await getSimPrefs()
  try {
    ;[modules, hub] = await Promise.all([getVisibleModules(track), getSimulatorHub(scope)])
    if (track === 'admissao' && institutionId) institutionName = (await listStudentInstitutions()).find((item) => item.id === institutionId)?.shortName ?? null
  } catch (error) {
    failed = true
    console.error('[SIMULADOR]', error)
  }

  const context = track === 'admissao' ? (institutionName ? `Admissão · ${institutionName}` : 'Admissão ao ensino superior') : trackLabel(track)
  const enabled = modules.flatMap((item) => (item.status === 'active' && MODE_BY_MODULE[item.key] ? [MODE_BY_MODULE[item.key]!] : []))
  const hasHistory = modules.some((item) => item.key === 'historico' && item.status === 'active')
  const mode: AttemptMode = isAttemptMode(m) && enabled.includes(m) ? m : (enabled[0] ?? 'pratica')

  const subjects = hub?.subjects ?? []
  const chosen = subjects.find((item) => item.id === d) ?? (subjects.length === 1 ? subjects[0] : null)
  const size = sessionSize(mode, prefs, ROUND_SIZE)

  const needsVariant = mode !== 'revisao'
  const [catalog, weak] =
    chosen && hub && needsVariant
      ? await Promise.all([getVariants(scope, chosen.id), mode === 'pratica' ? getWeakTopics(scope, chosen.id) : Promise.resolve([])])
      : [null, []]
  const named = catalog?.variants ?? []
  const freshTotal = named.reduce((sum, item) => sum + item.fresh, 0)
  const freshLabel = (fresh?: number) => (fresh === undefined ? '' : fresh === 0 ? ' · Já viste tudo' : ` · ${fresh} por ver`)

  const modeLine = mode === 'pratica' ? `${size} questões · sem limite de tempo` : mode === 'rapido' ? `${size} questões · ${clock(prefs.quickSeconds)} cada` : hub && hub.errorCount > 0 ? `${plural(hub.errorCount, 'questão', 'questões')} para rever` : 'Ainda não tens erros para rever'

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Simulador" title="Simulador" hideTitle hideBackLink>
      <div className="max-w-[640px] space-y-6">
        <SimHeader />
        <SimTabs active="principal" />

        {failed || !hub ? (
          <div role="alert" className="rounded-2xl bg-gradient-to-br from-white to-[#f4f6f1] px-5 py-8 text-center shadow-[0_1px_2px_rgba(20,50,40,0.05)]">
            <h2 className="text-base font-semibold">Não foi possível carregar o Simulador</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-[#68736a]">Verifica a ligação e tenta de novo.</p>
            <Link href="/aluno/simulador" className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#1d4d41] px-5 text-sm font-semibold text-white hover:bg-[#163e34]">Tentar de novo</Link>
          </div>
        ) : hub.totalQuestions === 0 || enabled.length === 0 ? (
          <EmptyState title="O Simulador abre em breve" description="Estamos a preparar as questões do teu percurso. Enquanto isso, estuda com os materiais da Biblioteca." actionLabel="Ver a Biblioteca" actionHref="/biblioteca" />
        ) : (
          <>
            {hub.open.filter((item) => enabled.includes(item.mode)).map((item) => (
              <Link key={item.id} href={`/aluno/simulador/sessao/${item.id}`} className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#235a4b] to-[#1d4d41] p-4 text-white shadow-[0_8px_18px_-10px_rgba(29,77,65,0.7)] transition active:scale-[0.99]">
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-white/70">Continuar de onde paraste</span>
                  <span className="mt-0.5 block truncate text-[15px] font-semibold">{MODE_META[item.mode].label}{item.subject ? ` · ${item.subject}` : ''}</span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/20"><span className="block h-full rounded-full bg-white" style={{ width: `${percent(item.answered, item.total)}%` }} /></span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-white/80">{item.answered}/{item.total}</span>
                <ArrowRight size={18} className="shrink-0" aria-hidden />
              </Link>
            ))}

            <Step n={1} title="Que disciplina queres treinar?" done={!!chosen}>
              <div className="relative">
                <BookOpen size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#1d4d41]" />
                <div className="[&_button]:pl-11"><SubjectSelect subjects={subjects} current={chosen?.id ?? null} mode={mode} /></div>
              </div>
            </Step>

            {chosen && (
              <>
                <Step n={2} title="Como queres treinar?" done>
                  <ModePicker modes={enabled} current={mode} subjectId={chosen.id} />
                  <p className="flex items-center justify-between gap-3 px-1 text-[12.5px] text-[#6b756e]">
                    <span>{modeLine}</span>
                    {mode !== 'revisao' && <Link href="/aluno/simulador/configuracoes" className="shrink-0 font-semibold text-[#1d4d41] hover:underline">Ajustar</Link>}
                  </p>
                </Step>

                <Step key={`${chosen.id}-${mode}`} n={3} title={mode === 'revisao' ? 'Pronto para rever?' : named.length > 0 ? 'Escolhe a variante e começa' : 'Toca para começar'}>
                  <div className="space-y-2.5">
                    {mode === 'revisao' && (
                      <StartCard mode="revisao" subjectId={chosen.id} title="Rever os meus erros" caption={hub.errorCount > 0 ? `${plural(Math.min(size, hub.errorCount), 'questão', 'questões')} · só as que já erraste` : 'Faz uma prática primeiro'} disabled={hub.errorCount === 0} />
                    )}
                    {needsVariant && named.map((item) => (
                      <StartCard key={item.name} mode={mode} subjectId={chosen.id} variant={item.name} title={item.name} caption={`${plural(Math.min(size, item.count), 'questão', 'questões')}${freshLabel(item.fresh)}`} />
                    ))}
                    {needsVariant && named.length > 1 && (
                      <StartCard mode={mode} subjectId={chosen.id} title="Todas as variantes" caption={`${plural(Math.min(size, catalog?.total ?? 0), 'questão', 'questões')}${freshLabel(freshTotal)}`} />
                    )}
                    {needsVariant && named.length === 0 && (
                      <StartCard mode={mode} subjectId={chosen.id} title={`Todas as questões de ${chosen.name}`} caption={plural(Math.min(size, catalog?.total ?? 0), 'questão', 'questões')} disabled={(catalog?.total ?? 0) === 0} />
                    )}
                  </div>
                  <p className="flex items-center gap-2 px-1 text-[12.5px] text-[#6b756e]"><ShieldCheck size={15} className="shrink-0 text-[#1d4d41]" aria-hidden />O teu progresso fica guardado. Podes sair e continuar depois.</p>
                </Step>

                {weak.length > 0 && (
                  <Step n={4} title="Ou reforça um tema fraco">
                    <div className="space-y-2.5">
                      {weak.map((topic) => (
                        <StartCard key={topic.id} mode="pratica" subjectId={chosen.id} topicId={topic.id} title={topic.name} caption={`Acertas ${topic.accuracy}% · ${plural(topic.answered, 'resposta', 'respostas')}`} />
                      ))}
                    </div>
                  </Step>
                )}
              </>
            )}

            <p className={cn('flex items-center justify-between gap-3 px-1 text-[13px]')}>
              <span className="min-w-0 truncate"><span className="text-[#7d857e]">A preparar </span><span className="font-semibold">{context}</span> <Link href="/aluno/percurso" className="font-semibold text-[#1d4d41] hover:underline">Mudar</Link></span>
              {hasHistory && <Link href="/aluno/simulador/historico" className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[#1d4d41] hover:underline"><History size={14} aria-hidden />Histórico</Link>}
            </p>
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
