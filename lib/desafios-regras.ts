// Regras dos Desafios (puras, sem base de dados). Mudar um número aqui muda a plataforma toda.
// Os dias contam no fuso de Maputo (CAT, UTC+2, sem hora de verão). Um dia é uma data «AAAA-MM-DD».

export const TZ = 'Africa/Maputo'

/** Questões respondidas num dia para o dia contar na sequência. Sem exceções: nada de «congelar» a sequência. */
export const DAILY_GOAL = 10
export const DAILY_SUBJECT_GOAL = 5
/** Percentagem de acertos pedida na missão de precisão (com pelo menos DAILY_GOAL respostas no dia). */
export const DAILY_ACCURACY = 70
export const WEEK_DAYS_GOAL = 5
export const WEEK_POINTS_GOAL = 40
/** Por disciplina do curso (admissão) e por semana. */
export const WEEK_SUBJECT_QUESTIONS = 10
/** Nas classes (10.ª e 12.ª): passar por pelo menos N disciplinas, com M questões cada. */
export const WEEK_CLASS_SUBJECTS = 3
export const WEEK_CLASS_SUBJECT_QUESTIONS = 5
/** Prontidão de uma disciplina = acertos × volume; 30 questões em 30 dias dão 100 % de volume. */
export const READY_VOLUME = 30
/** Mínimo de respostas para avaliar uma disciplina, e limite abaixo do qual é «fraca». */
export const MIN_SAMPLE = 10
export const WEAK_BELOW = 50

export type DayRow = { day: string; answered: number; correct: number; points: number }

const MS_DAY = 86_400_000
const toMs = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)))
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export const addDays = (day: string, n: number) => toDay(toMs(day) + n * MS_DAY)
export const diffDays = (later: string, earlier: string) => Math.round((toMs(later) - toMs(earlier)) / MS_DAY)
/** 0 = segunda … 6 = domingo. */
export const weekdayIndex = (day: string) => (new Date(toMs(day)).getUTCDay() + 6) % 7
export const weekStartOf = (day: string) => addDays(day, -weekdayIndex(day))

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function formatLeft(seconds: number) {
  const minutes = Math.max(0, Math.floor(seconds / 60))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export type Streak = {
  current: number
  best: number
  todayMet: boolean
  /** A última sequência que acabou (quando a atual é 0). */
  lost: { length: number; endedOn: string } | null
  lastActiveDay: string | null
}

// Sequência = dias seguidos com a meta diária cumprida. Continua «viva» até ao fim do dia de hoje:
// se hoje ainda não cumpriste mas ontem sim, conta até à meia-noite. Falhar um dia inteiro põe tudo a zero.
export function computeStreak(days: DayRow[], today: string, goal: number = DAILY_GOAL): Streak {
  const goalDays = days.filter((row) => row.answered >= goal).map((row) => row.day).sort()
  const set = new Set(goalDays)
  const runs: { length: number; end: string }[] = []
  for (const day of goalDays) {
    const last = runs[runs.length - 1]
    if (last && diffDays(day, last.end) === 1) {
      last.length++
      last.end = day
    } else runs.push({ length: 1, end: day })
  }
  const todayMet = set.has(today)
  const yesterday = addDays(today, -1)
  const aliveEnd = todayMet ? today : set.has(yesterday) ? yesterday : null
  const alive = aliveEnd ? runs.find((run) => run.end === aliveEnd) : undefined
  const current = alive?.length ?? 0
  const finished = alive ? null : runs[runs.length - 1]
  const lastActive = days.filter((row) => row.answered > 0).map((row) => row.day).sort().pop() ?? null
  return {
    current,
    best: runs.reduce((max, run) => Math.max(max, run.length), 0),
    todayMet,
    lost: current === 0 && finished ? { length: finished.length, endedOn: finished.end } : null,
    lastActiveDay: lastActive,
  }
}

export type SubjectStat = { id: string; name: string; weight: number; answered30: number; correct30: number; answeredWeek: number; answeredToday: number }

export const accuracyOf = (s: Pick<SubjectStat, 'answered30' | 'correct30'>) => (s.answered30 > 0 ? s.correct30 / s.answered30 : 0)
export const readinessOf = (s: SubjectStat) => accuracyOf(s) * Math.min(1, s.answered30 / READY_VOLUME)

/** 0 a 100: média das disciplinas ponderada pelo peso nas provas do curso. */
export function totalReadiness(subjects: SubjectStat[]) {
  const total = subjects.reduce((sum, s) => sum + Math.max(0, s.weight), 0)
  if (subjects.length === 0) return null
  if (total <= 0) return Math.round((subjects.reduce((sum, s) => sum + readinessOf(s), 0) / subjects.length) * 100)
  return Math.round((subjects.reduce((sum, s) => sum + Math.max(0, s.weight) * readinessOf(s), 0) / total) * 100)
}

// Disciplina do dia: a mais fraca (a que mais pesa, se empatar). Sem dados para distinguir, roda por dia.
export function pickSubjectOfDay(subjects: SubjectStat[], today: string): SubjectStat | null {
  if (subjects.length === 0) return null
  const ordered = [...subjects].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'pt'))
  const values = ordered.map(readinessOf)
  if (Math.max(...values) === Math.min(...values)) return ordered[Math.floor(toMs(today) / MS_DAY) % ordered.length]
  let best = 0
  for (let i = 1; i < ordered.length; i++) if (values[i] < values[best]) best = i
  return ordered[best]
}

export type Mission = {
  id: string
  title: string
  detail: string | null
  current: number
  target: number
  unit: string
  status: 'feita' | 'em_curso' | 'falhada'
  href: string | null
}

export type MissionInput = {
  today: string
  days: DayRow[]
  subjects: SubjectStat[]
  /** true: as disciplinas vêm das provas do curso escolhido (admissão). */
  fromCourse: boolean
  subjectOfDay: SubjectStat | null
  /** Meta diária do aluno (escolhida no onboarding). Sem valor, usa DAILY_GOAL. */
  goal?: number
}

export function buildMissions(input: MissionInput): { daily: Mission[]; weekly: Mission[]; weekDaysLeft: number; todayAnswered: number; todayCorrect: number; weekPoints: number; weekGoalDays: number } {
  const { today, days, subjects, fromCourse, subjectOfDay } = input
  const goal = input.goal ?? DAILY_GOAL
  const todayRow = days.find((row) => row.day === today)
  const answered = todayRow?.answered ?? 0
  const correct = todayRow?.correct ?? 0
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0

  const daily: Mission[] = [
    { id: 'd-meta', title: `Responder a ${goal} questões`, detail: null, current: Math.min(answered, goal), target: goal, unit: 'questões', status: answered >= goal ? 'feita' : 'em_curso', href: '/aluno/simulador' },
  ]
  if (subjectOfDay) {
    daily.push({ id: 'd-disciplina', title: `${subjectOfDay.name}: ${DAILY_SUBJECT_GOAL} questões`, detail: 'Disciplina do dia', current: Math.min(subjectOfDay.answeredToday, DAILY_SUBJECT_GOAL), target: DAILY_SUBJECT_GOAL, unit: 'questões', status: subjectOfDay.answeredToday >= DAILY_SUBJECT_GOAL ? 'feita' : 'em_curso', href: `/aluno/simulador?d=${encodeURIComponent(subjectOfDay.id)}` })
  }
  const precisionDone = answered >= goal && accuracy >= DAILY_ACCURACY
  daily.push({ id: 'd-precisao', title: `Acertar ${DAILY_ACCURACY}% hoje`, detail: answered >= goal ? `${correct} certas em ${answered}` : `Conta a partir de ${goal} respostas`, current: answered >= goal ? accuracy : 0, target: DAILY_ACCURACY, unit: '%', status: precisionDone ? 'feita' : 'em_curso', href: '/aluno/simulador' })

  const weekStart = weekStartOf(today)
  const weekRows = days.filter((row) => row.day >= weekStart && row.day <= today)
  const weekGoalDays = weekRows.filter((row) => row.answered >= goal).length
  const weekPoints = Math.round(weekRows.reduce((sum, row) => sum + row.points, 0) * 10) / 10
  // Dias que ainda podem contar: os que faltam até domingo, sem repetir hoje se já está cumprido.
  const todayMet = answered >= goal
  const weekDaysLeft = 6 - weekdayIndex(today) + (todayMet ? 0 : 1)
  const impossible = weekGoalDays + weekDaysLeft < WEEK_DAYS_GOAL

  const weekly: Mission[] = [
    { id: 'w-dias', title: `${WEEK_DAYS_GOAL} dias com a meta cumprida`, detail: impossible ? 'Já não dá para chegar a tempo. Recomeças segunda-feira.' : null, current: Math.min(weekGoalDays, WEEK_DAYS_GOAL), target: WEEK_DAYS_GOAL, unit: 'dias', status: weekGoalDays >= WEEK_DAYS_GOAL ? 'feita' : impossible ? 'falhada' : 'em_curso', href: '/aluno/simulador' },
    { id: 'w-pontos', title: `${WEEK_POINTS_GOAL} pontos esta semana`, detail: null, current: Math.min(weekPoints, WEEK_POINTS_GOAL), target: WEEK_POINTS_GOAL, unit: 'pts', status: weekPoints >= WEEK_POINTS_GOAL ? 'feita' : 'em_curso', href: '/aluno/simulador' },
  ]
  if (subjects.length > 0) {
    if (fromCourse) {
      const done = subjects.filter((s) => s.answeredWeek >= WEEK_SUBJECT_QUESTIONS)
      const missing = subjects.filter((s) => s.answeredWeek < WEEK_SUBJECT_QUESTIONS).map((s) => s.name)
      weekly.push({ id: 'w-cobertura', title: `Todas as disciplinas do curso (${WEEK_SUBJECT_QUESTIONS} questões cada)`, detail: missing.length > 0 ? `Faltam: ${missing.join(', ')}` : null, current: done.length, target: subjects.length, unit: 'disciplinas', status: missing.length === 0 ? 'feita' : 'em_curso', href: '/aluno/simulador' })
    } else {
      const target = Math.min(WEEK_CLASS_SUBJECTS, subjects.length)
      const done = subjects.filter((s) => s.answeredWeek >= WEEK_CLASS_SUBJECT_QUESTIONS).length
      weekly.push({ id: 'w-cobertura', title: `${target} disciplinas diferentes (${WEEK_CLASS_SUBJECT_QUESTIONS} questões cada)`, detail: null, current: Math.min(done, target), target, unit: 'disciplinas', status: done >= target ? 'feita' : 'em_curso', href: '/aluno/simulador' })
    }
  }
  return { daily, weekly, weekDaysLeft, todayAnswered: answered, todayCorrect: correct, weekPoints, weekGoalDays }
}
