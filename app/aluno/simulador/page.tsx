import Link from 'next/link'
import { ClipboardCheck, History } from 'lucide-react'
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
import { SubjectChoice } from '@/components/simulador/subject-choice'
import { getStudentSubjectIds } from '@/lib/combinacoes'
import { ModeCard } from '@/components/simulador/mode-card'
import { SimCrumbs } from '@/components/simulador/sim-crumbs'
import { EM_BREVE_UI, MODO_UI } from '@/components/simulador/modos'
import { iconeDaDisciplina } from '@/components/simulador/subject-icon'
import { ErrorState } from '@/components/states/error-state'
import { StartCard } from '@/components/simulador/start-actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Simulador | Twisisa', description: 'Escolhe o modo, a disciplina e treina com questões de exames.' }

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
  // Sem modo escolhido mostram-se os modos. Ligações antigas só com a disciplina (?d=) assumem o primeiro modo.
  const mode: AttemptMode | null = isAttemptMode(m) && enabled.includes(m) ? m : d ? (enabled[0] ?? null) : null
  const soon = modules.filter((item) => item.status === 'soon' && EM_BREVE_UI[item.key])

  // Quem escolheu curso e combinação vê só as duas disciplinas das suas provas.
  const allowed = await getStudentSubjectIds(scope.userId).catch(() => null)
  const subjects = (hub?.subjects ?? []).filter((item) => !allowed || allowed.includes(item.id))
  const total = subjects.reduce((sum, item) => sum + item.count, 0)
  const chosen = subjects.find((item) => item.id === d) ?? (subjects.length === 1 ? subjects[0] : null)
  const size = mode ? sessionSize(mode, prefs, ROUND_SIZE) : ROUND_SIZE
  const catalog = mode && chosen && hub && mode !== 'revisao' ? await getVariants(scope, chosen.id) : null
  const named = catalog?.variants ?? []
  const open = hub?.open.find((item) => enabled.includes(item.mode))

  const ui = mode ? MODO_UI[mode] : null
  const modeMeta = mode ? MODE_META[mode] : null

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Simulador" title="Simulador" hideTitle hideBackLink>
      <div className="max-w-[640px] space-y-6">
        <SimHeader context={context ?? undefined} />
        <SimTabs active="principal" />

        {failed || !hub ? (
          <ErrorState title="Não foi possível carregar o Simulador" description="Verifica a ligação e tenta de novo." />
        ) : total === 0 || enabled.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="O Simulador abre em breve" description="Enquanto isso, estuda com os materiais da Biblioteca." actionLabel="Ver a Biblioteca" actionHref="/biblioteca" />
        ) : !mode || !ui || !modeMeta ? (
          <>
            {open && (
              <Link href={`/aluno/simulador/sessao/${open.id}`} className="sf-noite block p-4 text-white no-underline">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-white/70">Sessão em curso</p>
                    <p className="mt-0.5 truncate text-[16px] font-semibold leading-6">{MODE_META[open.mode].label}{open.subject ? ` · ${open.subject}` : ''}</p>
                  </div>
                  <span aria-hidden="true" className="btn btn-aura shrink-0 px-5">Continuar</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${open.total > 0 ? Math.round((open.answered / open.total) * 100) : 0}%` }} /></div>
                <p className="num mt-1.5 text-[12px] text-white/75">{open.answered} de {open.total} questões</p>
              </Link>
            )}

            <section aria-label="Modos" className="space-y-3">
              <h2 className="px-1 text-[13px] font-semibold text-texto-2">Como queres treinar?</h2>
              {enabled.map((item) => {
                const meta = MODE_META[item]
                const { icon, tom } = MODO_UI[item]
                const semErros = item === 'revisao' && hub.errorCount === 0
                return (
                  <ModeCard
                    key={item}
                    icon={icon}
                    tom={tom}
                    title={meta.label}
                    tagline={semErros ? 'Ainda não tens erros para rever. Faz uma prática primeiro.' : meta.tagline}
                    meta={item === 'revisao' ? (hub.errorCount > 0 ? `${count(hub.errorCount)} para rever` : undefined) : meta.meta}
                    href={semErros ? undefined : `/aluno/simulador?m=${item}`}
                  />
                )
              })}
              {soon.map((item) => <ModeCard key={item.key} icon={EM_BREVE_UI[item.key]!.icon} tom="neutro" title={item.label} tagline={item.description} badge="Em breve" />)}
            </section>

            {modules.some((item) => item.key === 'historico' && item.status === 'active') && (
              <Link href="/aluno/simulador/historico" className="btn btn-terciario -ml-2 gap-2"><History size={16} aria-hidden="true" />Ver histórico</Link>
            )}
          </>
        ) : !chosen ? (
          <>
            <SimCrumbs backHref="/aluno/simulador" backLabel="Modos" icon={ui.icon} tom={ui.tom} title={modeMeta.label} caption={modeMeta.meta} />
            <section aria-label="Disciplinas" className="space-y-3">
              <h2 className="px-1 text-[13px] font-semibold text-texto-2">Escolhe a disciplina</h2>
              <SubjectChoice subjects={subjects} mode={mode} tom={ui.tom} />
            </section>
          </>
        ) : (
          <>
            <SimCrumbs backHref={subjects.length > 1 ? `/aluno/simulador?m=${mode}` : '/aluno/simulador'} backLabel={subjects.length > 1 ? 'Disciplinas' : 'Modos'} icon={iconeDaDisciplina(chosen.name)} tom={ui.tom} title={chosen.name} caption={`${modeMeta.label} · ${modeMeta.meta}`} />
            <section key={`${chosen.id}-${mode}`} aria-label="Começar" className="animate-in fade-in slide-in-from-bottom-2 space-y-3 duration-300">
              <h2 className="px-1 text-[13px] font-semibold text-texto-2">{mode === 'revisao' ? 'Pronto para rever' : named.length > 0 ? 'Escolhe a prova' : 'Pronto para começar'}</h2>
              {mode === 'revisao' ? (
                <StartCard mode="revisao" subjectId={chosen.id} title={hub.errorCount > 0 ? 'Rever erros' : 'Sem erros para rever'} caption={hub.errorCount > 0 ? count(Math.min(size, hub.errorCount)) : undefined} disabled={hub.errorCount === 0} />
              ) : named.length > 0 ? (
                <>
                  {named.length > 1 && <StartCard mode={mode} subjectId={chosen.id} title="Todas as provas" caption={count(Math.min(size, catalog?.total ?? 0))} />}
                  {named.map((item) => <StartCard key={item.name} mode={mode} subjectId={chosen.id} variant={item.name} title={item.name} caption={count(Math.min(size, item.count))} />)}
                </>
              ) : (
                <StartCard mode={mode} subjectId={chosen.id} title="Começar" caption={count(Math.min(size, catalog?.total ?? 0))} disabled={(catalog?.total ?? 0) === 0} />
              )}
            </section>
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
