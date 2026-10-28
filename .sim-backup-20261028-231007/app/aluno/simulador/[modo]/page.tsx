import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Clock, MessageCircle, Sparkles, Star, Target, type LucideIcon } from 'lucide-react'
import { getVisibleModules } from '@/lib/exam-modules'
import { getSimulatorHub, getSubject, getVariants, getWeakTopics } from '@/lib/simulator'
import { requireSimulatorScope } from '@/lib/simulator-scope'
import { MODE_META, MODE_SLUGS, POINTS_MAX, POINTS_MIN, PRACTICE_SIZE, QUICK_SECONDS_PER_QUESTION, ROUND_SIZE, clock } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { StartButton, VariantCard } from '@/components/simulador/start-actions'
import { SimHeader } from '@/components/simulador/sim-header'
import { SubjectSelect } from '@/components/simulador/subject-select'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Simulador | Twisisa' }

const soft = 'shadow-[0_1px_2px_rgba(20,50,40,0.05)]'
const card = `rounded-2xl bg-gradient-to-br from-white to-[#f4f6f1] ${soft}`

function Fact({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#1d4d41]/[0.08] text-[#1d4d41]"><Icon size={16} aria-hidden /></span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold leading-5">{title}</span>
        <span className="block text-[12.5px] leading-5 text-[#6b756e]">{text}</span>
      </span>
    </li>
  )
}

// Página explicativa de cada modo: primeiro diz o que vai acontecer, só depois deixa começar.
export default async function ModePage({ params, searchParams }: { params: Promise<{ modo: string }>; searchParams: Promise<{ d?: string }> }) {
  const { modo } = await params
  const { d } = await searchParams
  const mode = MODE_SLUGS[modo]
  if (!mode) notFound()

  const { scope, firstName } = await requireSimulatorScope()
  // Sem disciplina escolhida (ou inválida), volta ao início do Simulador: a disciplina vem sempre primeiro.
  if (!d) redirect('/aluno/simulador')

  const [modules, subject, hubForSubjects] = await Promise.all([getVisibleModules(scope.track), getSubject(scope, d), getSimulatorHub(scope)])
  if (!subject || !modules.some((item) => item.key === MODE_META[mode].moduleKey && item.status === 'active')) redirect('/aluno/simulador')

  const meta = MODE_META[mode]
  // Prática e Modo rápido escolhem a variante (se a disciplina as tem); a Revisão revê os erros da disciplina.
  const choose = mode === 'pratica' || mode === 'rapido'
  const catalog = choose ? await getVariants(scope, subject.id) : { variants: [], auxiliary: 0, total: 0 }
  const weak = mode === 'pratica' ? await getWeakTopics(scope, subject.id) : []
  const size = mode === 'pratica' ? PRACTICE_SIZE : ROUND_SIZE
  const named = catalog.variants
  const freshTotal = named.reduce((sum, item) => sum + item.fresh, 0)
  const hub = hubForSubjects
  const subjects = hubForSubjects.subjects
  const pointsText = `Cada resposta certa vale entre ${POINTS_MIN} e ${POINTS_MAX} pontos, conforme a dificuldade. Questões que já viste valem menos.`

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Simulador" title={meta.label} hideTitle backHref={`/aluno/simulador?d=${encodeURIComponent(subject.id)}`} backLabel="Voltar ao Simulador">
      <div className="max-w-[640px] space-y-6">
        <SimHeader hint={meta.label} />
        <section aria-label="Disciplina" className="space-y-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4d41]">Disciplina</h2>
          <SubjectSelect subjects={subjects} current={subject.id} basePath={`/aluno/simulador/${modo}`} />
        </section>

        <section className={cn(card, 'p-4 sm:p-5')}>
          {mode === 'pratica' && (
            <>
              <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Pratica com exames dos anos anteriores</h2>
              <p className="mt-1 text-[13.5px] leading-5 text-[#5d675f]">{named.length > 0 ? 'Escolhe a variante para continuar. ' : ''}Respondes uma questão de cada vez e vês logo se acertaste.</p>
              <ul className="mt-4 space-y-3">
                <Fact icon={Target} title={`Até ${PRACTICE_SIZE} questões`} text="Podes sair e continuar depois, o teu progresso fica guardado." />
                <Fact icon={Sparkles} title="Sempre matéria nova" text="Primeiro aparecem as questões que ainda não viste, de todos os anos. As que erraste podem voltar mais tarde." />
                <Fact icon={Star} title="Pontos para o ranking" text={pointsText} />
                <Fact icon={Clock} title="Sem pressa" text="Não há limite de tempo. Lê com calma." />
              </ul>
            </>
          )}
          {mode === 'rapido' && (
            <>
              <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Treina o ritmo do exame</h2>
              <p className="mt-1 text-[13.5px] leading-5 text-[#5d675f]">Resolve cada questão dentro do tempo. O relógio pára quando carregas em Verificar.</p>
              <ul className="mt-4 space-y-3">
                <Fact icon={Clock} title={`${clock(QUICK_SECONDS_PER_QUESTION)} por questão`} text="Se o tempo acabar, passas à seguinte e essa fica por responder." />
                <Fact icon={Target} title={`${ROUND_SIZE} questões`} text="Uma ronda curta, ideal para treinar todos os dias. Só entram questões que ainda não viste, se as houver." />
                <Fact icon={Star} title="Pontos para o ranking" text={pointsText} />
              </ul>
            </>
          )}
          {mode === 'revisao' && (
            <>
              <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Refaz o que erraste</h2>
              <p className="mt-1 text-[13.5px] leading-5 text-[#5d675f]">Só aparecem questões em que já falhaste. Sem limite de tempo.</p>
              <ul className="mt-4 space-y-3">
                <Fact icon={Target} title={hub && hub.errorCount > 0 ? `${hub.errorCount} ${hub.errorCount === 1 ? 'questão para rever' : 'questões para rever'}` : 'Ainda não tens erros'} text={`Cada ronda tem até ${ROUND_SIZE} questões.`} />
                <Fact icon={Star} title="Pontos para o ranking" text={pointsText} />
              </ul>
            </>
          )}
          <Link href="/jonas" className="mt-4 flex items-center gap-3 rounded-xl bg-[#1d4d41]/[0.06] px-3.5 py-2.5 text-[13px] leading-5 text-[#38423b] transition-colors hover:bg-[#1d4d41]/10">
            <MessageCircle size={18} className="shrink-0 text-[#1d4d41]" aria-hidden />
            <span>Ficaste com dúvidas? Pergunta ao <span className="font-semibold text-[#1d4d41]">explicador Jonas</span>.</span>
          </Link>
        </section>

        {choose && (
          <section aria-label={named.length > 0 ? 'Escolher a variante' : 'Começar'} className="space-y-2">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4d41]">{named.length > 0 ? 'Escolhe a variante' : 'Começar'}</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {named.map((item) => (
                <VariantCard key={item.name} mode={mode} subjectId={subject.id} variant={item.name} title={item.name} caption="Só questões desta variante" count={item.count} fresh={item.fresh} size={size} />
              ))}
              {named.length > 1 && (
                <VariantCard mode={mode} subjectId={subject.id} variant={null} title="Todas as variantes" caption="Mistura de todas as variantes" count={catalog.total} fresh={freshTotal} size={size} />
              )}
              {named.length === 0 && (
                <VariantCard mode={mode} subjectId={subject.id} variant={null} title="Todas as questões" caption={`Questões de ${subject.name}`} count={catalog.total} size={size} />
              )}
            </div>
            {catalog.total < size && <p className="px-1 text-[12px] text-[#7d857e]">Por agora há {catalog.total} {catalog.total === 1 ? 'questão' : 'questões'} nesta disciplina. Vamos acrescentando mais.</p>}
          </section>
        )}
        {weak.length > 0 && (
          <section aria-label="Temas para reforçar" className="space-y-2">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4d41]">Temas para reforçar</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {weak.map((topic) => (
                <VariantCard key={topic.id} mode="pratica" subjectId={subject.id} variant={null} topicId={topic.id} title={topic.name} caption={`Acertas ${topic.accuracy}% (${topic.answered} respostas)`} count={PRACTICE_SIZE} size={PRACTICE_SIZE} />
              ))}
            </div>
          </section>
        )}
        {mode === 'revisao' && <StartButton mode="revisao" subjectId={subject.id} label="Começar revisão" disabled={!hub || hub.errorCount === 0} />}
      </div>
    </StudentFeatureShell>
  )
}
