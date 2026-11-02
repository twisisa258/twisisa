import Link from 'next/link'
import { ArrowRight, Check, ChevronDown, Flame, X } from 'lucide-react'
import type { DesafiosSnapshot } from '@/lib/desafios'
import {
  DAILY_ACCURACY, DAILY_SUBJECT_GOAL, MIN_SAMPLE, READY_VOLUME, WEAK_BELOW, WEEK_CLASS_SUBJECTS, WEEK_CLASS_SUBJECT_QUESTIONS,
  WEEK_DAYS_GOAL, WEEK_POINTS_GOAL, WEEK_SUBJECT_QUESTIONS, formatLeft, plural, type Mission,
} from '@/lib/desafios-regras'
import { formatPoints } from '@/lib/simulator-shared'

const card = 'rounded-2xl border border-[#e3e6dc] bg-white'

function Bar({ value, tone = 'green' }: { value: number; tone?: 'green' | 'red' | 'sand' }) {
  const color = tone === 'red' ? 'bg-aviso' : tone === 'sand' ? 'bg-aviso' : 'bg-marca'
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#e8ebe3]" role="presentation">
      <div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

/** Sequência: número grande, melhor marca e a meta de hoje com a hora a que o dia acaba. */
export function StreakCard({ s }: { s: DesafiosSnapshot }) {
  const pct = Math.round((Math.min(s.todayAnswered, s.goal) / s.goal) * 100)
  return (
    <section aria-label="Sequência" className="rounded-2xl bg-gradient-to-br from-[#2a6a57] to-marca p-5 text-white shadow-[0_10px_26px_-14px_rgba(29,77,65,0.7)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/70"><Flame size={14} aria-hidden="true" />Sequência</p>
          <p className="mt-1 flex items-baseline gap-2"><span className="text-5xl font-semibold tracking-[-0.05em]">{s.streak.current}</span><span className="text-base font-semibold">{s.streak.current === 1 ? 'dia seguido' : 'dias seguidos'}</span></p>
        </div>
        <p className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">Melhor: {s.streak.best}</p>
      </div>
      <div className="mt-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-sm text-white/85">
          {s.streak.todayMet ? 'Meta de hoje cumprida.' : `Hoje: ${s.todayAnswered} de ${s.goal} questões. O dia acaba em ${formatLeft(s.secondsLeft)}.`}
        </p>
      </div>
    </section>
  )
}

function MissionRow({ mission }: { mission: Mission }) {
  const done = mission.status === 'feita'
  const failed = mission.status === 'falhada'
  const pct = Math.round((mission.current / mission.target) * 100)
  const value = mission.unit === '%' ? `${mission.current}% de ${mission.target}%` : `${mission.unit === 'pts' ? formatPoints(mission.current) : mission.current} de ${mission.target} ${mission.unit}`
  const body = (
    <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
      <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-marca text-white' : failed ? 'bg-aviso text-white' : 'border-[1.5px] border-dashed border-[#b9c0b4]'}`} role="img" aria-label={done ? 'Feita' : failed ? 'Falhada' : 'Por fazer'}>
        {done && <Check size={13} strokeWidth={3} aria-hidden="true" />}
        {failed && <X size={13} strokeWidth={3} aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${done ? 'text-texto-2' : 'text-texto'}`}>{mission.title}</span>
        {mission.detail && <span className={`mt-0.5 block text-xs ${failed ? 'font-medium text-[#9a3412]' : 'text-texto-2'}`}>{mission.detail}</span>}
        <span className="mt-2 block"><Bar value={pct} tone={failed ? 'red' : 'green'} /></span>
        <span className="mt-1 block text-xs text-texto-2">{value}</span>
      </span>
    </div>
  )
  return !done && !failed && mission.href ? <Link href={mission.href} className="block no-underline transition-colors hover:bg-fundo">{body}</Link> : body
}

export function MissionList({ title, hint, missions }: { title: string; hint: string; missions: Mission[] }) {
  const done = missions.filter((m) => m.status === 'feita').length
  return (
    <section aria-label={title}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-texto">{title}</h2>
        <p className="text-xs text-texto-2">{done} de {missions.length} · {hint}</p>
      </div>
      <div className={`${card} divide-y divide-[#eceee7] overflow-hidden`}>{missions.map((mission) => <MissionRow key={mission.id} mission={mission} />)}</div>
    </section>
  )
}

/** Prontidão para o curso escolhido (admissão): a razão para voltar todos os dias. */
export function ReadinessCard({ s }: { s: DesafiosSnapshot }) {
  if (!s.admission) return null
  if (!s.course) {
    return (
      <section aria-label="Curso alvo" className={`${card} p-5`}>
        <h2 className="text-base font-semibold tracking-[-0.02em]">Escolhe o teu curso</h2>
        <p className="mt-1 text-sm text-texto-2">Cada curso exige provas diferentes. Com o curso escolhido, os desafios passam a treinar essas disciplinas e vês quão perto estás.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/aluno/perfil#percurso" className="inline-flex h-11 items-center justify-center rounded-xl bg-marca px-5 text-sm font-semibold text-white hover:bg-[#173f35]">Escolher curso</Link>
          <Link href="/aluno/descobrir-curso" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe3d9] px-5 text-sm font-semibold text-marca hover:bg-[#f1f4ef]">Não sei: fazer o teste vocacional</Link>
        </div>
      </section>
    )
  }
  const percent = s.readiness ?? 0
  return (
    <section aria-label="Prontidão para o curso" className={`${card} p-5`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-texto-2">Prontidão</p>
      <h2 className="mt-1 text-base font-semibold leading-5 tracking-[-0.02em]">{s.course.name}</h2>
      <p className="text-xs text-texto-2">{[s.course.unit, s.course.institution].filter(Boolean).join(' · ')}</p>
      <p className="mt-3 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-[-0.04em] text-marca">{percent}%</span><span className="text-sm text-texto-2">preparado</span></p>
      <div className="mt-2"><Bar value={percent} /></div>
      {s.subjects.length === 0 ? (
        <p className="mt-4 text-sm text-texto-2">Ainda não há questões para as provas deste curso.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {s.subjects.map((subject) => (
            <li key={subject.id}>
              <Link href={`/aluno/simulador?d=${encodeURIComponent(subject.id)}`} className="block no-underline">
                <span className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium text-texto">{subject.name}</span><span className="text-xs text-texto-2">{subject.accuracy === null ? 'sem respostas' : `${subject.accuracy}% de acertos · ${subject.answered} questões`}</span></span>
                <span className="mt-1.5 block"><Bar value={subject.readiness} tone={subject.accuracy !== null && subject.answered >= MIN_SAMPLE && subject.accuracy < WEAK_BELOW ? 'red' : 'green'} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs leading-5 text-texto-2">Mede acertos e volume dos últimos 30 dias: {READY_VOLUME} questões numa disciplina contam como 100% de volume. Não garante a entrada.</p>
    </section>
  )
}

/** Regras à vista, para ninguém ser apanhado de surpresa. Os números vêm de lib/desafios-regras.ts. */
export function Regras({ admission, goal }: { admission: boolean; goal: number }) {
  const rules = [
    `Um dia só conta se responderes a ${goal} questões. O dia vai da meia-noite à meia-noite, hora de Maputo.`,
    'A sequência são os dias seguidos com a meta cumprida. Falhar um dia inteiro põe-na a zero. Não há exceções nem «congelar».',
    `A disciplina do dia é a tua mais fraca: ${DAILY_SUBJECT_GOAL} questões. Se ainda não há dados, roda por dia.`,
    `A missão de precisão pede ${DAILY_ACCURACY}% de acertos, a partir de ${goal} respostas no dia.`,
    `Semana (segunda a domingo): ${WEEK_DAYS_GOAL} dias com a meta, ${WEEK_POINTS_GOAL} pontos e ${admission ? `${WEEK_SUBJECT_QUESTIONS} questões em cada disciplina do teu curso` : `${plural(WEEK_CLASS_SUBJECTS, 'disciplina', 'disciplinas')} com ${WEEK_CLASS_SUBJECT_QUESTIONS} questões cada`}.`,
    'Quando já não dá para cumprir uma missão da semana, fica falhada. Na segunda-feira tudo recomeça: nada transita.',
    'Os pontos vêm das questões certas e questões repetidas valem menos. Tudo é calculado a partir das tuas respostas no Simulador.',
  ]
  return (
    <details className={`${card} group`}>
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-texto marker:hidden sm:px-5 [&::-webkit-details-marker]:hidden">
        Regras
        <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-[#9aa29c] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <ul className="space-y-2.5 border-t border-[#eceee7] px-4 py-4 text-sm leading-6 text-[#5b645d] sm:px-5">
        {rules.map((rule) => <li key={rule} className="flex gap-2"><ArrowRight size={14} className="mt-1.5 shrink-0 text-marca" aria-hidden="true" /><span>{rule}</span></li>)}
      </ul>
    </details>
  )
}
