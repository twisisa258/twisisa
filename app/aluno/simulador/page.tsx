import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getVisibleModules, type ModuleKey } from '@/lib/exam-modules'
import { listStudentInstitutions } from '@/lib/institutions'
import { trackLabel } from '@/lib/percurso'
import { getSimulatorHub, getVariants } from '@/lib/simulator'
import { requireSimulatorScope } from '@/lib/simulator-scope'
import { getSimPrefs } from '@/lib/simulator-prefs-server'
import { sessionSize } from '@/lib/simulator-prefs'
import { MODE_META, ROUND_SIZE, isAttemptMode, type AttemptMode } from '@/lib/simulator-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { EmptyState } from '@/components/states/empty-state'
import { SimHeader } from '@/components/simulador/sim-header'
import { SimTabs } from '@/components/simulador/sim-tabs'
import { SubjectSelect } from '@/components/simulador/subject-select'
import { ModePicker } from '@/components/simulador/mode-picker'
import { StartCard } from '@/components/simulador/start-actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Simulador | Twisisa', description: 'Escolhe a disciplina e treina com questões de exames.' }

const MODE_BY_MODULE: Partial<Record<ModuleKey, AttemptMode>> = { pratica: 'pratica', 'modo-rapido': 'rapido', 'revisar-erros': 'revisao' }
const count = (n: number) => `${n} ${n === 1 ? 'questão' : 'questões'}`

export default async function SimuladorPage({ searchParams }: { searchParams: Promise<{ d?: string; m?: string }> }) {
  const { scope, firstName } = await requireSimulatorScope()
  const { d, m } = await searchParams
  const { track, institutionId } = scope
  const prefs = await getSimPrefs()

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

  const context = track === 'admissao' ? (institutionName ? `Admissão · ${institutionName}` : 'Admissão') : trackLabel(track)
  const enabled = modules.flatMap((item) => (item.status === 'active' && MODE_BY_MODULE[item.key] ? [MODE_BY_MODULE[item.key]!] : []))
  const mode: AttemptMode = isAttemptMode(m) && enabled.includes(m) ? m : (enabled[0] ?? 'pratica')

  const subjects = hub?.subjects ?? []
  const chosen = subjects.find((item) => item.id === d) ?? (subjects.length === 1 ? subjects[0] : null)
  const size = sessionSize(mode, prefs, ROUND_SIZE)
  const catalog = chosen && hub && mode !== 'revisao' ? await getVariants(scope, chosen.id) : null
  const named = catalog?.variants ?? []
  const open = hub?.open.find((item) => enabled.includes(item.mode))

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Simulador" title="Simulador" hideTitle hideBackLink>
      <div className="max-w-[640px] space-y-6">
        <SimHeader context={context ?? undefined} />
        <SimTabs active="principal" />

        {failed || !hub ? (
          <div role="alert" className="rounded-2xl bg-white px-5 py-8 text-center shadow-[0_1px_3px_rgba(20,50,40,0.08)]">
            <h2 className="text-base font-semibold">Não foi possível carregar</h2>
            <Link href="/aluno/simulador" className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#1d4d41] px-5 text-sm font-semibold text-white">Tentar de novo</Link>
          </div>
        ) : hub.totalQuestions === 0 || enabled.length === 0 ? (
          <EmptyState title="O Simulador abre em breve" description="Enquanto isso, estuda com os materiais da Biblioteca." actionLabel="Ver a Biblioteca" actionHref="/biblioteca" />
        ) : (
          <>
            {open && (
              <Link href={`/aluno/simulador/sessao/${open.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(20,50,40,0.10)] transition active:scale-[0.99]">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">Continuar</span>
                  <span className="block truncate text-[13px] text-[#7d857e]">{MODE_META[open.mode].label}{open.subject ? ` · ${open.subject}` : ''} · {open.answered}/{open.total}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-[#1d4d41]" aria-hidden />
              </Link>
            )}

            <SubjectSelect subjects={subjects} current={chosen?.id ?? null} mode={mode} />

            {chosen && (
              <div key={`${chosen.id}-${mode}`} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ModePicker modes={enabled} current={mode} subjectId={chosen.id} />
                <div className="space-y-2.5">
                  {mode === 'revisao' ? (
                    <StartCard mode="revisao" subjectId={chosen.id} title={hub.errorCount > 0 ? 'Rever erros' : 'Sem erros para rever'} caption={hub.errorCount > 0 ? count(Math.min(size, hub.errorCount)) : undefined} disabled={hub.errorCount === 0} />
                  ) : named.length > 0 ? (
                    <>
                      {named.map((item) => <StartCard key={item.name} mode={mode} subjectId={chosen.id} variant={item.name} title={item.name} caption={count(Math.min(size, item.count))} />)}
                      {named.length > 1 && <StartCard mode={mode} subjectId={chosen.id} title="Todas" caption={count(Math.min(size, catalog?.total ?? 0))} secondary />}
                    </>
                  ) : (
                    <StartCard mode={mode} subjectId={chosen.id} title="Começar" caption={count(Math.min(size, catalog?.total ?? 0))} disabled={(catalog?.total ?? 0) === 0} />
                  )}
                </div>
              </div>
            )}

            {modules.some((item) => item.key === 'historico' && item.status === 'active') && (
              <Link href="/aluno/simulador/historico" className="block px-1 text-[13px] font-medium text-[#7d857e] hover:text-[#1d4d41]">Ver histórico</Link>
            )}
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
