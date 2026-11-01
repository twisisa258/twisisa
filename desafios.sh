#!/usr/bin/env bash
# Desafios (ponto 3): sequência, missões do dia e da semana, prontidão para o curso, avisos dinâmicos e escolha do curso.
# Corre DEPOIS do perfil.sh e do ranking.sh, na raiz do projeto. Usa só bash e node.
set -euo pipefail

[ -f package.json ] && grep -q '"name": "twisisa"' package.json || { echo "Corre este script na raiz do projeto twisisa."; exit 1; }
[ -f lib/ranking.ts ] && [ -f lib/perfil.ts ] || { echo "Faltam o perfil.sh e o ranking.sh: corre-os primeiro."; exit 1; }

mkdir -p database/migrations lib tests app/aluno/desafios app/aluno/perfil app/aluno/descobrir-curso/resultado components/aluno/desafios components/aluno/perfil components/orientacao components/skeletons

cat > 'database/migrations/0024_curso_alvo.sql' <<'TWISISA_EOF'
-- Curso alvo do aluno (da lista de cursos da instituição). As disciplinas das provas vêm de course_exam_options.
-- O texto livre antigo (target_course) mantém-se só como cópia do nome, para o que já o lê.
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS target_course_id text REFERENCES courses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS student_profiles_target_course_idx ON student_profiles (target_course_id);
-- Os desafios agrupam as respostas por dia: ajuda a consulta por aluno e data.
CREATE INDEX IF NOT EXISTS attempt_items_answered_at_idx ON attempt_items (answered_at) WHERE answered_at IS NOT NULL;
TWISISA_EOF
echo '  ok  database/migrations/0024_curso_alvo.sql'

cat > 'lib/desafios-regras.ts' <<'TWISISA_EOF'
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
export function computeStreak(days: DayRow[], today: string): Streak {
  const goalDays = days.filter((row) => row.answered >= DAILY_GOAL).map((row) => row.day).sort()
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
}

export function buildMissions(input: MissionInput): { daily: Mission[]; weekly: Mission[]; weekDaysLeft: number; todayAnswered: number; todayCorrect: number; weekPoints: number; weekGoalDays: number } {
  const { today, days, subjects, fromCourse, subjectOfDay } = input
  const todayRow = days.find((row) => row.day === today)
  const answered = todayRow?.answered ?? 0
  const correct = todayRow?.correct ?? 0
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0

  const daily: Mission[] = [
    { id: 'd-meta', title: `Responder a ${DAILY_GOAL} questões`, detail: null, current: Math.min(answered, DAILY_GOAL), target: DAILY_GOAL, unit: 'questões', status: answered >= DAILY_GOAL ? 'feita' : 'em_curso', href: '/aluno/simulador' },
  ]
  if (subjectOfDay) {
    daily.push({ id: 'd-disciplina', title: `${subjectOfDay.name}: ${DAILY_SUBJECT_GOAL} questões`, detail: 'Disciplina do dia', current: Math.min(subjectOfDay.answeredToday, DAILY_SUBJECT_GOAL), target: DAILY_SUBJECT_GOAL, unit: 'questões', status: subjectOfDay.answeredToday >= DAILY_SUBJECT_GOAL ? 'feita' : 'em_curso', href: `/aluno/simulador?d=${encodeURIComponent(subjectOfDay.id)}` })
  }
  const precisionDone = answered >= DAILY_GOAL && accuracy >= DAILY_ACCURACY
  daily.push({ id: 'd-precisao', title: `Acertar ${DAILY_ACCURACY}% hoje`, detail: answered >= DAILY_GOAL ? `${correct} certas em ${answered}` : `Conta a partir de ${DAILY_GOAL} respostas`, current: answered >= DAILY_GOAL ? accuracy : 0, target: DAILY_ACCURACY, unit: '%', status: precisionDone ? 'feita' : 'em_curso', href: '/aluno/simulador' })

  const weekStart = weekStartOf(today)
  const weekRows = days.filter((row) => row.day >= weekStart && row.day <= today)
  const weekGoalDays = weekRows.filter((row) => row.answered >= DAILY_GOAL).length
  const weekPoints = Math.round(weekRows.reduce((sum, row) => sum + row.points, 0) * 10) / 10
  // Dias que ainda podem contar: os que faltam até domingo, sem repetir hoje se já está cumprido.
  const todayMet = answered >= DAILY_GOAL
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
TWISISA_EOF
echo '  ok  lib/desafios-regras.ts'

cat > 'lib/desafios.ts' <<'TWISISA_EOF'
import { pool } from '@/lib/db'
import { getSimulatorHub, type StudentScope } from '@/lib/simulator'
import { getCourse, getCourseSubjects } from '@/lib/target-course'
import {
  MIN_SAMPLE,
  WEAK_BELOW,
  accuracyOf,
  buildMissions,
  computeStreak,
  diffDays,
  pickSubjectOfDay,
  readinessOf,
  totalReadiness,
  weekdayIndex,
  type DayRow,
  type Mission,
  type Streak,
  type SubjectStat,
} from '@/lib/desafios-regras'

// Desafios: tudo é calculado a partir das respostas do Simulador (attempt_items). Nada é guardado à parte,
// por isso a sequência, as missões e a prontidão nunca divergem do que o aluno realmente fez.

export type SubjectView = { id: string; name: string; weight: number; answered: number; accuracy: number | null; readiness: number }

export type DesafiosSnapshot = {
  today: string
  weekday: number
  secondsLeft: number
  streak: Streak
  daysSinceActive: number | null
  todayAnswered: number
  todayCorrect: number
  weekPoints: number
  weekGoalDays: number
  weekDaysLeft: number
  daily: Mission[]
  weekly: Mission[]
  admission: boolean
  course: { id: string; name: string; unit: string | null; institution: string } | null
  subjects: SubjectView[]
  readiness: number | null
  weak: { id: string; name: string; accuracy: number } | null
  errorCount: number
}

export async function getDesafios(input: { scope: StudentScope; targetCourseId: string | null }): Promise<DesafiosSnapshot> {
  const { scope } = input
  const admission = scope.track === 'admissao'

  const [clock, daysResult, statsResult, hub, course] = await Promise.all([
    pool.query(
      `SELECT (now() AT TIME ZONE 'Africa/Maputo')::date::text AS today,
              extract(epoch FROM (date_trunc('day', now() AT TIME ZONE 'Africa/Maputo') + interval '1 day') - (now() AT TIME ZONE 'Africa/Maputo'))::int AS seconds_left`,
    ),
    pool.query(
      `SELECT to_char((i.answered_at AT TIME ZONE 'Africa/Maputo')::date, 'YYYY-MM-DD') AS day,
              count(*)::int AS answered,
              count(*) FILTER (WHERE i.is_correct)::int AS correct,
              coalesce(sum(i.points), 0)::float8 AS points
       FROM attempt_items i JOIN attempts a ON a.id = i.attempt_id
       WHERE a.user_id = $1 AND i.answered_at IS NOT NULL
       GROUP BY 1 ORDER BY 1`,
      [scope.userId],
    ),
    pool.query(
      `SELECT q.subject_id,
              count(*) FILTER (WHERE i.is_correct IS NOT NULL)::int AS answered30,
              count(*) FILTER (WHERE i.is_correct)::int AS correct30,
              count(*) FILTER (WHERE i.answered_at >= (date_trunc('week', now() AT TIME ZONE 'Africa/Maputo') AT TIME ZONE 'Africa/Maputo'))::int AS answered_week,
              count(*) FILTER (WHERE i.answered_at >= (date_trunc('day', now() AT TIME ZONE 'Africa/Maputo') AT TIME ZONE 'Africa/Maputo'))::int AS answered_today
       FROM attempt_items i JOIN attempts a ON a.id = i.attempt_id JOIN questions q ON q.id = i.question_id
       WHERE a.user_id = $1 AND i.answered_at IS NOT NULL AND i.answered_at >= now() - interval '30 days'
       GROUP BY q.subject_id`,
      [scope.userId],
    ),
    getSimulatorHub(scope),
    admission && input.targetCourseId ? getCourse(input.targetCourseId) : Promise.resolve(null),
  ])

  const today = clock.rows[0].today as string
  const secondsLeft = clock.rows[0].seconds_left as number
  const days: DayRow[] = daysResult.rows.map((row) => ({ day: row.day as string, answered: row.answered as number, correct: row.correct as number, points: Number(row.points) }))
  const stats = new Map<string, { answered30: number; correct30: number; answeredWeek: number; answeredToday: number }>()
  for (const row of statsResult.rows) {
    stats.set(row.subject_id as string, { answered30: row.answered30, correct30: row.correct30, answeredWeek: row.answered_week, answeredToday: row.answered_today })
  }

  // Um curso de outra instituição (percurso mudou) já não vale.
  const validCourse = course && course.institutionId === scope.institutionId ? course : null
  const playable = new Map(hub.subjects.map((subject) => [subject.id, subject.name]))
  let base: { id: string; name: string; weight: number }[]
  if (validCourse) {
    const weights = await getCourseSubjects(validCourse.id)
    base = weights.filter((item) => playable.has(item.id))
  } else {
    base = hub.subjects.map((subject) => ({ id: subject.id, name: subject.name, weight: 1 }))
  }
  const subjects: SubjectStat[] = base.map((item) => {
    const s = stats.get(item.id)
    return { id: item.id, name: item.name, weight: item.weight, answered30: s?.answered30 ?? 0, correct30: s?.correct30 ?? 0, answeredWeek: s?.answeredWeek ?? 0, answeredToday: s?.answeredToday ?? 0 }
  })

  const streak = computeStreak(days, today)
  const subjectOfDay = pickSubjectOfDay(subjects, today)
  const missions = buildMissions({ today, days, subjects, fromCourse: !!validCourse, subjectOfDay })

  const weak = subjects
    .filter((s) => s.answered30 >= MIN_SAMPLE && accuracyOf(s) * 100 < WEAK_BELOW)
    .sort((a, b) => accuracyOf(a) - accuracyOf(b))[0]

  return {
    today,
    weekday: weekdayIndex(today),
    secondsLeft,
    streak,
    daysSinceActive: streak.lastActiveDay ? diffDays(today, streak.lastActiveDay) : null,
    todayAnswered: missions.todayAnswered,
    todayCorrect: missions.todayCorrect,
    weekPoints: missions.weekPoints,
    weekGoalDays: missions.weekGoalDays,
    weekDaysLeft: missions.weekDaysLeft,
    daily: missions.daily,
    weekly: missions.weekly,
    admission,
    course: validCourse ? { id: validCourse.id, name: validCourse.name, unit: validCourse.unit, institution: validCourse.institution } : null,
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      weight: s.weight,
      answered: s.answered30,
      accuracy: s.answered30 > 0 ? Math.round(accuracyOf(s) * 100) : null,
      readiness: Math.round(readinessOf(s) * 100),
    })),
    readiness: validCourse ? totalReadiness(subjects) : null,
    weak: weak ? { id: weak.id, name: weak.name, accuracy: Math.round(accuracyOf(weak) * 100) } : null,
    errorCount: hub.errorCount,
  }
}
TWISISA_EOF
echo '  ok  lib/desafios.ts'

cat > 'lib/avisos.ts' <<'TWISISA_EOF'
import { DAILY_GOAL, WEEK_DAYS_GOAL, formatLeft, plural } from '@/lib/desafios-regras'
import type { DesafiosSnapshot } from '@/lib/desafios'

// Avisos e lembretes do aluno: cartões dinâmicos calculados a partir dos desafios (sem guardar nada).
// Ordem = prioridade. Cada aviso diz o que está a acontecer e dá uma ação.

export type AvisoTone = 'urgent' | 'warning' | 'info' | 'success'
export type AvisoIcon = 'flame' | 'clock' | 'target' | 'book' | 'alert' | 'check' | 'calendar'
export type Aviso = { id: string; tone: AvisoTone; icon: AvisoIcon; title: string; text: string; href: string; cta: string }

const PRACTICE = '/aluno/simulador'

export function buildAvisos(s: DesafiosSnapshot): Aviso[] {
  const avisos: Aviso[] = []
  const left = DAILY_GOAL - s.todayAnswered
  const hoursLeft = s.secondsLeft / 3600

  if (s.streak.current > 0 && !s.streak.todayMet) {
    avisos.push({
      id: 'streak-risk',
      tone: hoursLeft <= 6 ? 'urgent' : 'warning',
      icon: 'flame',
      title: 'Sequência em risco',
      text: `Faltam ${plural(left, 'questão', 'questões')} hoje para manteres ${plural(s.streak.current, 'dia seguido', 'dias seguidos')}. O dia acaba em ${formatLeft(s.secondsLeft)}.`,
      href: PRACTICE,
      cta: 'Praticar agora',
    })
  }

  const lost = s.streak.lost
  const lostRecently = lost && s.daysSinceActive !== null && s.daysSinceActive <= 14
  if (s.streak.current === 0 && lostRecently && lost) {
    avisos.push({
      id: 'streak-lost',
      tone: 'warning',
      icon: 'flame',
      title: 'Perdeste a sequência',
      text: `Eram ${plural(lost.length, 'dia seguido', 'dias seguidos')}. Voltou tudo a zero. Recomeça hoje.`,
      href: PRACTICE,
      cta: 'Recomeçar',
    })
  } else if (s.daysSinceActive === null) {
    avisos.push({ id: 'first', tone: 'info', icon: 'target', title: 'Ainda não praticaste', text: `Faz as primeiras ${DAILY_GOAL} questões. Leva poucos minutos.`, href: PRACTICE, cta: 'Começar' })
  } else if (s.daysSinceActive >= 2) {
    avisos.push({ id: 'inactive', tone: 'warning', icon: 'clock', title: `Há ${plural(s.daysSinceActive, 'dia', 'dias')} sem praticar`, text: `O teu ritmo está a cair. Faz as ${DAILY_GOAL} questões de hoje.`, href: PRACTICE, cta: 'Praticar' })
  }

  if (s.admission && !s.course) {
    avisos.push({ id: 'course', tone: 'info', icon: 'target', title: 'Escolhe o teu curso', text: 'Sem curso, não sabemos que provas tens de fazer. Escolhe um, ou faz o teste vocacional.', href: '/aluno/perfil#percurso', cta: 'Escolher curso' })
  }

  if (s.weak) {
    avisos.push({ id: 'weak', tone: 'warning', icon: 'alert', title: `${s.weak.name}: ${s.weak.accuracy}% de acertos`, text: 'É a tua disciplina mais fraca. Treina hoje.', href: `${PRACTICE}?d=${encodeURIComponent(s.weak.id)}`, cta: 'Treinar' })
  }

  const dias = s.weekly.find((mission) => mission.id === 'w-dias')
  if (dias && dias.status === 'em_curso' && s.weekday >= 4) {
    const need = WEEK_DAYS_GOAL - s.weekGoalDays
    avisos.push({ id: 'week', tone: 'warning', icon: 'calendar', title: 'A semana está a acabar', text: `Faltam ${plural(s.weekDaysLeft, 'dia', 'dias')} e ainda precisas de ${plural(need, 'dia', 'dias')} com a meta cumprida.`, href: PRACTICE, cta: 'Praticar' })
  }

  if (s.errorCount >= 5) {
    avisos.push({ id: 'errors', tone: 'info', icon: 'book', title: `${plural(s.errorCount, 'erro', 'erros')} por rever`, text: 'Quem não revê os erros repete-os no exame.', href: PRACTICE, cta: 'Rever erros' })
  }

  if (s.streak.todayMet) {
    avisos.push({ id: 'done', tone: 'success', icon: 'check', title: 'Meta de hoje cumprida', text: `Sequência: ${plural(s.streak.current, 'dia', 'dias')}. Amanhã a meta volta a ser ${DAILY_GOAL} questões.`, href: '/aluno/desafios', cta: 'Ver desafios' })
  } else if (s.streak.current === 0 && s.todayAnswered > 0) {
    avisos.push({ id: 'daily', tone: 'info', icon: 'target', title: 'Meta de hoje', text: `${s.todayAnswered} de ${DAILY_GOAL} questões. Faltam ${left}.`, href: PRACTICE, cta: 'Continuar' })
  }
  return avisos
}
TWISISA_EOF
echo '  ok  lib/avisos.ts'

cat > 'lib/target-course.ts' <<'TWISISA_EOF'
import { pool } from '@/lib/db'

// Curso alvo: lista de cursos da instituição e disciplinas das provas de cada curso (só servidor).

export type CourseOption = { id: string; name: string; unit: string | null }
export type CourseInfo = { id: string; name: string; unit: string | null; institutionId: string; institution: string }
export type CourseSubject = { id: string; name: string; weight: number }

export async function listInstitutionCourses(institutionId: string): Promise<CourseOption[]> {
  const result = await pool.query(
    `SELECT id, name, unit FROM courses WHERE institution_id = $1 AND active ORDER BY name, unit NULLS FIRST`,
    [institutionId],
  )
  return result.rows.map((row) => ({ id: row.id as string, name: row.name as string, unit: (row.unit as string | null) ?? null }))
}

export async function getCourse(courseId: string): Promise<CourseInfo | null> {
  const result = await pool.query(
    `SELECT c.id, c.name, c.unit, c.institution_id, i.short_name
     FROM courses c JOIN institutions i ON i.id = c.institution_id
     WHERE c.id = $1 AND c.active AND i.active`,
    [courseId],
  )
  const row = result.rows[0]
  return row ? { id: row.id, name: row.name, unit: row.unit ?? null, institutionId: row.institution_id, institution: row.short_name } : null
}

// Uma disciplina conta uma vez, com o maior peso que tem nas opções de exame do curso (laboral e pós-laboral).
export async function getCourseSubjects(courseId: string): Promise<CourseSubject[]> {
  const result = await pool.query(
    `SELECT s.id, s.name, max(op.weight)::int AS weight
     FROM course_exam_options o
     JOIN course_exam_option_papers op ON op.option_id = o.id
     JOIN exam_papers p ON p.id = op.paper_id
     JOIN library_subjects s ON s.id = p.subject_id
     WHERE o.course_id = $1
     GROUP BY s.id, s.name
     ORDER BY max(op.weight) DESC, s.name`,
    [courseId],
  )
  return result.rows.map((row) => ({ id: row.id as string, name: row.name as string, weight: row.weight as number }))
}
TWISISA_EOF
echo '  ok  lib/target-course.ts'

cat > 'components/aluno/avisos.tsx' <<'TWISISA_EOF'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, Check, Clock, Flame, Target, type LucideIcon } from 'lucide-react'
import type { Aviso, AvisoIcon, AvisoTone } from '@/lib/avisos'

const ICONS: Record<AvisoIcon, LucideIcon> = { flame: Flame, clock: Clock, target: Target, book: BookOpen, alert: AlertTriangle, check: Check, calendar: CalendarDays }

const TONES: Record<AvisoTone, { card: string; icon: string; cta: string }> = {
  urgent: { card: 'bg-gradient-to-br from-[#fff4ee] to-[#fde5da]', icon: 'bg-[#c2410c] text-white', cta: 'text-[#9a3412]' },
  warning: { card: 'bg-gradient-to-br from-[#fffaec] to-[#f8edca]', icon: 'bg-[#b7791f] text-white', cta: 'text-[#8a5a12]' },
  info: { card: 'bg-gradient-to-br from-white to-[#f4f6f1]', icon: 'bg-[#eaf1ec] text-[#1d4d41]', cta: 'text-[#1d4d41]' },
  success: { card: 'bg-gradient-to-br from-[#eef6f0] to-[#dcebe0]', icon: 'bg-[#1d4d41] text-white', cta: 'text-[#1d4d41]' },
}

// Avisos e lembretes do aluno (calculados em lib/avisos.ts). Cada cartão é uma ligação para a ação.
export function Avisos({ items }: { items: Aviso[] }) {
  if (items.length === 0) return null
  return (
    <section aria-label="Avisos" className="flex flex-col gap-2">
      {items.map((aviso) => {
        const tone = TONES[aviso.tone]
        const Icon = ICONS[aviso.icon]
        return (
          <Link
            key={aviso.id}
            href={aviso.href}
            role={aviso.tone === 'urgent' ? 'alert' : undefined}
            className={`flex items-center gap-3 rounded-[18px] p-3.5 text-[#202321] no-underline shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)] ${tone.card}`}
          >
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}><Icon size={18} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-5">{aviso.title}</span>
              <span className="mt-0.5 block text-xs leading-[18px] text-[#5b645d]">{aviso.text}</span>
            </span>
            <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${tone.cta}`}>
              <span className="hidden sm:inline">{aviso.cta}</span>
              <ArrowRight size={16} aria-label={aviso.cta} />
            </span>
          </Link>
        )
      })}
    </section>
  )
}
TWISISA_EOF
echo '  ok  components/aluno/avisos.tsx'

cat > 'components/aluno/desafios/parts.tsx' <<'TWISISA_EOF'
import Link from 'next/link'
import { ArrowRight, Check, ChevronDown, Flame, X } from 'lucide-react'
import type { DesafiosSnapshot } from '@/lib/desafios'
import {
  DAILY_ACCURACY, DAILY_GOAL, DAILY_SUBJECT_GOAL, MIN_SAMPLE, READY_VOLUME, WEAK_BELOW, WEEK_CLASS_SUBJECTS, WEEK_CLASS_SUBJECT_QUESTIONS,
  WEEK_DAYS_GOAL, WEEK_POINTS_GOAL, WEEK_SUBJECT_QUESTIONS, formatLeft, plural, type Mission,
} from '@/lib/desafios-regras'
import { formatPoints } from '@/lib/simulator-shared'

const card = 'rounded-2xl border border-[#e3e6dc] bg-white'

function Bar({ value, tone = 'green' }: { value: number; tone?: 'green' | 'red' | 'sand' }) {
  const color = tone === 'red' ? 'bg-[#c2410c]' : tone === 'sand' ? 'bg-[#b7791f]' : 'bg-[#1d4d41]'
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#e8ebe3]" role="presentation">
      <div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

/** Sequência: número grande, melhor marca e a meta de hoje com a hora a que o dia acaba. */
export function StreakCard({ s }: { s: DesafiosSnapshot }) {
  const pct = Math.round((Math.min(s.todayAnswered, DAILY_GOAL) / DAILY_GOAL) * 100)
  return (
    <section aria-label="Sequência" className="rounded-2xl bg-gradient-to-br from-[#2a6a57] to-[#1d4d41] p-5 text-white shadow-[0_10px_26px_-14px_rgba(29,77,65,0.7)]">
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
          {s.streak.todayMet ? 'Meta de hoje cumprida.' : `Hoje: ${s.todayAnswered} de ${DAILY_GOAL} questões. O dia acaba em ${formatLeft(s.secondsLeft)}.`}
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
      <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-[#1d4d41] text-white' : failed ? 'bg-[#c2410c] text-white' : 'border-[1.5px] border-dashed border-[#b9c0b4]'}`} role="img" aria-label={done ? 'Feita' : failed ? 'Falhada' : 'Por fazer'}>
        {done && <Check size={13} strokeWidth={3} aria-hidden="true" />}
        {failed && <X size={13} strokeWidth={3} aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${done ? 'text-[#68716a]' : 'text-[#202321]'}`}>{mission.title}</span>
        {mission.detail && <span className={`mt-0.5 block text-xs ${failed ? 'font-medium text-[#9a3412]' : 'text-[#737c75]'}`}>{mission.detail}</span>}
        <span className="mt-2 block"><Bar value={pct} tone={failed ? 'red' : 'green'} /></span>
        <span className="mt-1 block text-xs text-[#737c75]">{value}</span>
      </span>
    </div>
  )
  return !done && !failed && mission.href ? <Link href={mission.href} className="block no-underline transition-colors hover:bg-[#f8f8f5]">{body}</Link> : body
}

export function MissionList({ title, hint, missions }: { title: string; hint: string; missions: Mission[] }) {
  const done = missions.filter((m) => m.status === 'feita').length
  return (
    <section aria-label={title}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-[#202321]">{title}</h2>
        <p className="text-xs text-[#737c75]">{done} de {missions.length} · {hint}</p>
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
        <p className="mt-1 text-sm text-[#68716a]">Cada curso exige provas diferentes. Com o curso escolhido, os desafios passam a treinar essas disciplinas e vês quão perto estás.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link href="/aluno/perfil#percurso" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 text-sm font-semibold text-white hover:bg-[#173f35]">Escolher curso</Link>
          <Link href="/aluno/descobrir-curso" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfe3d9] px-5 text-sm font-semibold text-[#1d4d41] hover:bg-[#f1f4ef]">Não sei: fazer o teste vocacional</Link>
        </div>
      </section>
    )
  }
  const percent = s.readiness ?? 0
  return (
    <section aria-label="Prontidão para o curso" className={`${card} p-5`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#737c75]">Prontidão</p>
      <h2 className="mt-1 text-base font-semibold leading-5 tracking-[-0.02em]">{s.course.name}</h2>
      <p className="text-xs text-[#737c75]">{[s.course.unit, s.course.institution].filter(Boolean).join(' · ')}</p>
      <p className="mt-3 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-[-0.04em] text-[#1d4d41]">{percent}%</span><span className="text-sm text-[#68716a]">preparado</span></p>
      <div className="mt-2"><Bar value={percent} /></div>
      {s.subjects.length === 0 ? (
        <p className="mt-4 text-sm text-[#68716a]">Ainda não há questões para as provas deste curso.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {s.subjects.map((subject) => (
            <li key={subject.id}>
              <Link href={`/aluno/simulador?d=${encodeURIComponent(subject.id)}`} className="block no-underline">
                <span className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium text-[#202321]">{subject.name}</span><span className="text-xs text-[#737c75]">{subject.accuracy === null ? 'sem respostas' : `${subject.accuracy}% de acertos · ${subject.answered} questões`}</span></span>
                <span className="mt-1.5 block"><Bar value={subject.readiness} tone={subject.accuracy !== null && subject.answered >= MIN_SAMPLE && subject.accuracy < WEAK_BELOW ? 'red' : 'green'} /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs leading-5 text-[#737c75]">Mede acertos e volume dos últimos 30 dias: {READY_VOLUME} questões numa disciplina contam como 100% de volume. Não garante a entrada.</p>
    </section>
  )
}

/** Regras à vista, para ninguém ser apanhado de surpresa. Os números vêm de lib/desafios-regras.ts. */
export function Regras({ admission }: { admission: boolean }) {
  const rules = [
    `Um dia só conta se responderes a ${DAILY_GOAL} questões. O dia vai da meia-noite à meia-noite, hora de Maputo.`,
    'A sequência são os dias seguidos com a meta cumprida. Falhar um dia inteiro põe-na a zero. Não há exceções nem «congelar».',
    `A disciplina do dia é a tua mais fraca: ${DAILY_SUBJECT_GOAL} questões. Se ainda não há dados, roda por dia.`,
    `A missão de precisão pede ${DAILY_ACCURACY}% de acertos, a partir de ${DAILY_GOAL} respostas no dia.`,
    `Semana (segunda a domingo): ${WEEK_DAYS_GOAL} dias com a meta, ${WEEK_POINTS_GOAL} pontos e ${admission ? `${WEEK_SUBJECT_QUESTIONS} questões em cada disciplina do teu curso` : `${plural(WEEK_CLASS_SUBJECTS, 'disciplina', 'disciplinas')} com ${WEEK_CLASS_SUBJECT_QUESTIONS} questões cada`}.`,
    'Quando já não dá para cumprir uma missão da semana, fica falhada. Na segunda-feira tudo recomeça: nada transita.',
    'Os pontos vêm das questões certas e questões repetidas valem menos. Tudo é calculado a partir das tuas respostas no Simulador.',
  ]
  return (
    <details className={`${card} group`}>
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-[#202321] marker:hidden sm:px-5 [&::-webkit-details-marker]:hidden">
        Regras
        <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-[#9aa29c] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <ul className="space-y-2.5 border-t border-[#eceee7] px-4 py-4 text-sm leading-6 text-[#5b645d] sm:px-5">
        {rules.map((rule) => <li key={rule} className="flex gap-2"><ArrowRight size={14} className="mt-1.5 shrink-0 text-[#1d4d41]" aria-hidden="true" /><span>{rule}</span></li>)}
      </ul>
    </details>
  )
}
TWISISA_EOF
echo '  ok  components/aluno/desafios/parts.tsx'

cat > 'components/aluno/perfil/course-picker.tsx' <<'TWISISA_EOF'
'use client'

import { useState } from 'react'
import { Check, Search } from 'lucide-react'

type Course = { id: string; name: string; unit: string | null }

const plain = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Escolha do curso da instituição: procura + lista (as listas têm dezenas de cursos).
// São botões de rádio nativos: funcionam com teclado e enviam o valor com o formulário, mesmo escondidos pela procura.
export function CoursePicker({ name, courses, defaultValue }: { name: string; courses: Course[]; defaultValue: string | null }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(defaultValue)
  const needle = plain(query.trim())
  const chosen = courses.find((course) => course.id === selected)
  const visible = courses.filter((course) => !needle || plain(`${course.name} ${course.unit ?? ''}`).includes(needle))

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa29c]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Procurar curso"
          aria-label="Procurar curso"
          className="h-11 w-full rounded-xl border border-[#dfe3d9] bg-white pl-10 pr-3.5 text-sm outline-none transition-colors placeholder:text-[#9aa29c] focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10"
        />
      </div>
      <div role="radiogroup" aria-label="Cursos" className="max-h-60 overflow-y-auto rounded-xl border border-[#dfe3d9] bg-white">
        {courses.map((course) => {
          const hidden = !visible.includes(course)
          return (
            <label key={course.id} className={hidden ? 'hidden' : 'block'}>
              <input type="radio" name={name} value={course.id} checked={selected === course.id} onChange={() => setSelected(course.id)} className="peer sr-only" />
              <span className="flex min-h-[48px] cursor-pointer items-center gap-3 border-b border-[#eceee7] px-3.5 py-2 text-left transition-colors last:border-b-0 hover:bg-[#f8f8f5] peer-checked:bg-[#eef3ee] peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-[#1d4d41]/40">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[#202321]">{course.name}</span>
                  {course.unit && <span className="block truncate text-xs text-[#737c75]">{course.unit}</span>}
                </span>
                {selected === course.id && <Check size={16} className="shrink-0 text-[#1d4d41]" aria-hidden="true" />}
              </span>
            </label>
          )
        })}
        {visible.length === 0 && <p className="px-3.5 py-4 text-sm text-[#737c75]">Nenhum curso encontrado.</p>}
      </div>
      <p className="text-xs text-[#737c75]">{chosen ? `Escolhido: ${chosen.name}` : 'Nenhum curso escolhido.'}</p>
    </div>
  )
}
TWISISA_EOF
echo '  ok  components/aluno/perfil/course-picker.tsx'

cat > 'components/aluno/perfil/profile-accordion.tsx' <<'TWISISA_EOF'
'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export type AccordionItem = {
  id: string
  icon: React.ReactNode
  title: string
  summary: string
  /** true: completo (visto verde); false: por completar; sem valor: sem estado (ex.: segurança). */
  done?: boolean
  content: React.ReactNode
}

type AccordionApi = { saved: (id: string) => void }
const AccordionContext = createContext<AccordionApi | null>(null)

// Chamado pelos formulários das secções: fecha a secção e mostra «Guardado» na linha.
export function useAccordion() {
  return useContext(AccordionContext)
}

const FLASH_MS = 2500

// Lista de secções recolhíveis (uma aberta de cada vez). O conteúdo fica montado para não perder o que se escreveu.
export function ProfileAccordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // /aluno/perfil#percurso abre essa secção.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id && items.some((item) => item.id === id)) {
      setOpenId(id)
      document.getElementById(`perfil-${id}-botao`)?.scrollIntoView({ block: 'center' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saved = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : current))
    setSavedId(id)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSavedId(null), FLASH_MS)
  }, [])

  return (
    <AccordionContext.Provider value={{ saved }}>
      <div className="divide-y divide-[#eceee7] overflow-hidden rounded-2xl border border-[#e3e6dc] bg-white">
        {items.map((item) => {
          const open = openId === item.id
          const flash = savedId === item.id
          return (
            <section key={item.id}>
              <h2>
                <button
                  type="button"
                  id={`perfil-${item.id}-botao`}
                  aria-expanded={open}
                  aria-controls={`perfil-${item.id}-painel`}
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f8f8f5] focus-visible:bg-[#f8f8f5] focus-visible:outline-none sm:px-5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3ee] text-[#1d4d41] [&>svg]:size-[18px]">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#202321]">{item.title}</span>
                    <span className={`block truncate text-xs ${flash ? 'font-semibold text-[#1d4d41]' : 'text-[#68716a]'}`}>{flash ? 'Guardado' : item.summary}</span>
                  </span>
                  {item.done === true && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1d4d41] text-white" role="img" aria-label="Completo"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                  )}
                  {item.done === false && <span className="size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-[#b9c0b4]" role="img" aria-label="Por completar" />}
                  <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-[#9aa29c] transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
                </button>
              </h2>
              <div
                id={`perfil-${item.id}-painel`}
                role="region"
                aria-labelledby={`perfil-${item.id}-botao`}
                inert={!open}
                className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-5 pt-1 sm:px-5">{item.content}</div>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </AccordionContext.Provider>
  )
}
TWISISA_EOF
echo '  ok  components/aluno/perfil/profile-accordion.tsx'

cat > 'components/orientacao/choose-course-button.tsx' <<'TWISISA_EOF'
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { chooseCourse } from '@/app/aluno/descobrir-curso/resultado/actions'

// «Escolher este curso»: guarda o curso e leva o aluno aos Desafios, já com as disciplinas das provas dele.
export function ChooseCourseButton({ courseId, chosen }: { courseId: string; chosen: boolean }) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, setPending] = useState(false)

  if (chosen) {
    return <p className="inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-[#1d4d41]"><Check size={16} aria-hidden="true" />O teu curso</p>
  }

  async function choose() {
    if (pending) return
    setPending(true)
    try {
      const result = await chooseCourse(courseId)
      if (result.ok) {
        router.push('/aluno/desafios')
        return
      }
      feedback.error(result.message)
    } catch {
      feedback.error('Não foi possível guardar o curso. Tenta outra vez.')
    }
    setPending(false)
  }

  return (
    <button type="button" onClick={choose} disabled={pending} aria-busy={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1d4d41] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#173f35] disabled:opacity-80">
      {pending ? <><Spinner />A guardar…</> : 'Escolher este curso'}
    </button>
  )
}
TWISISA_EOF
echo '  ok  components/orientacao/choose-course-button.tsx'

cat > 'components/skeletons/desafios-skeleton.tsx' <<'TWISISA_EOF'
import { Skeleton } from './skeleton'
import { StudentShellSkeleton } from './student-shell'

function MissionsSkeleton({ rows }: { rows: number }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-[#eceee7] overflow-hidden rounded-2xl border border-[#e3e6dc] bg-white">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
            <Skeleton className="mt-0.5 size-6 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** /aluno/desafios: sequência, um aviso, missões de hoje e da semana, prontidão e regras (mesma ordem da página real). */
export function DesafiosSkeleton() {
  return (
    <StudentShellSkeleton hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <Skeleton className="h-[164px] rounded-2xl" />
        <Skeleton className="h-[68px] rounded-[18px]" />
        <MissionsSkeleton rows={3} />
        <MissionsSkeleton rows={3} />
        <Skeleton className="h-[260px] rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
    </StudentShellSkeleton>
  )
}
TWISISA_EOF
echo '  ok  components/skeletons/desafios-skeleton.tsx'

cat > 'app/aluno/desafios/page.tsx' <<'TWISISA_EOF'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { buildAvisos } from '@/lib/avisos'
import { getDesafios, type DesafiosSnapshot } from '@/lib/desafios'
import { requireSimulatorScope } from '@/lib/simulator-scope'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { Avisos } from '@/components/aluno/avisos'
import { MissionList, ReadinessCard, Regras, StreakCard } from '@/components/aluno/desafios/parts'
import { ErrorState } from '@/components/states/error-state'

export const metadata = { title: 'Desafios | Twisisa', description: 'Sequência, missões do dia e da semana e prontidão para o teu curso.' }
export const dynamic = 'force-dynamic'

export default async function DesafiosPage() {
  const { scope, firstName } = await requireSimulatorScope()
  const [profile] = await db.select({ targetCourseId: studentProfiles.targetCourseId }).from(studentProfiles).where(eq(studentProfiles.userId, scope.userId)).limit(1)

  let data: DesafiosSnapshot | null = null
  try {
    data = await getDesafios({ scope, targetCourseId: profile?.targetCourseId ?? null })
  } catch (error) {
    console.error('[DESAFIOS]', error)
  }

  // A meta de hoje e a sequência já estão no cartão de cima: não se repetem nos avisos.
  const avisos = data ? buildAvisos(data).filter((aviso) => aviso.id !== 'done' && aviso.id !== 'daily') : []
  const daysToSunday = data ? 6 - data.weekday : 0

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Desafios" title="Desafios" hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        {!data ? (
          <ErrorState title="Não foi possível carregar os desafios" description="Tenta outra vez daqui a pouco." />
        ) : (
          <>
            <StreakCard s={data} />
            <Avisos items={avisos} />
            <MissionList title="Hoje" hint={`acaba às 24:00`} missions={data.daily} />
            <MissionList title="Esta semana" hint={daysToSunday === 0 ? 'acaba hoje' : `acaba em ${daysToSunday} ${daysToSunday === 1 ? 'dia' : 'dias'}`} missions={data.weekly} />
            <ReadinessCard s={data} />
            <Regras admission={data.admission} />
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
TWISISA_EOF
echo '  ok  app/aluno/desafios/page.tsx'

cat > 'app/aluno/desafios/loading.tsx' <<'TWISISA_EOF'
import { DesafiosSkeleton } from '@/components/skeletons/desafios-skeleton'

export default function Loading() {
  return <DesafiosSkeleton />
}
TWISISA_EOF
echo '  ok  app/aluno/desafios/loading.tsx'

cat > 'app/aluno/descobrir-curso/resultado/actions.ts' <<'TWISISA_EOF'
'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { getCourse } from '@/lib/target-course'

// O aluno escolhe, entre os cursos sugeridos pelo teste, o curso a que se candidata.
// Escolher um curso é preparar a admissão nessa instituição: o percurso passa a «Admissão» e a instituição é a do curso.
export async function chooseCourse(courseId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')
    const course = await getCourse(String(courseId))
    if (!course) throw new AppError('Este curso já não está disponível. Escolhe outro.')

    const set = { track: 'admissao', institutionId: course.institutionId, targetCourseId: course.id, targetCourse: course.name, updatedAt: new Date() }
    await db
      .insert(studentProfiles)
      .values({ userId: session.user.id, ...set })
      .onConflictDoUpdate({ target: studentProfiles.userId, set })

    for (const path of ['/aluno', '/aluno/perfil', '/aluno/desafios', '/aluno/simulador']) revalidatePath(path)
    return 'Curso escolhido.'
  }, 'Não foi possível guardar o curso. Tenta outra vez.')
}
TWISISA_EOF
echo '  ok  app/aluno/descobrir-curso/resultado/actions.ts'

cat > 'app/aluno/perfil/actions.ts' <<'TWISISA_EOF'
'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db, pool } from '@/lib/db'
import { studentProfiles, user } from '@/lib/db/schema'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { isUniqueViolation } from '@/lib/pg-errors'
import { AVATAR_FOLDER, isProvince } from '@/lib/perfil'

// Cada secção do perfil guarda-se sozinha: um erro numa não perde o que está nas outras.
// O percurso e a instituição guardam-se em /aluno/percurso.

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')
  return session.user
}

function refresh() {
  revalidatePath('/aluno')
  revalidatePath('/aluno/perfil')
}

export async function savePersonal(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const current = await requireUser()

    const displayName = String(formData.get('displayName') ?? '').trim().replace(/\s+/g, ' ')
    if (displayName.length < 2 || displayName.length > 80) throw new AppError('O nome de exibição deve ter entre 2 e 80 caracteres.')

    const phone = String(formData.get('phone') ?? '').trim() || null
    if (phone && phone.length > 30) throw new AppError('O telefone é demasiado longo.')

    const rawNickname = String(formData.get('nickname') ?? '').trim().replace(/^@/, '').toLowerCase()
    if (rawNickname && !/^[a-z0-9_.]{3,20}$/.test(rawNickname)) {
      throw new AppError('O @nickname deve ter 3 a 20 caracteres: letras, números, _ ou ponto, sem espaços.')
    }
    const nickname = rawNickname || null
    const showInRanking = formData.get('showInRanking') === 'on'

    try {
      await db
        .insert(studentProfiles)
        .values({ userId: current.id, phone, nickname, showInRanking })
        .onConflictDoUpdate({ target: studentProfiles.userId, set: { phone, nickname, showInRanking, updatedAt: new Date() } })
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError('Esse @nickname já está a ser usado. Escolhe outro.')
      throw error
    }
    await db.update(user).set({ name: displayName, updatedAt: new Date() }).where(eq(user.id, current.id))

    refresh()
    return 'Guardado.'
  }, 'Não foi possível guardar. Tenta outra vez.')
}

export async function saveSchool(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const current = await requireUser()

    const rawProvince = String(formData.get('province') ?? '').trim()
    if (rawProvince && !isProvince(rawProvince)) throw new AppError('Escolhe uma província da lista.')
    const province = rawProvince || null
    const school = String(formData.get('school') ?? '').trim().replace(/\s+/g, ' ').slice(0, 120) || null

    await db
      .insert(studentProfiles)
      .values({ userId: current.id, province, school })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { province, school, updatedAt: new Date() } })

    refresh()
    return 'Guardado.'
  }, 'Não foi possível guardar. Tenta outra vez.')
}

export async function saveCandidate(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const current = await requireUser()

    // O curso tem de ser da instituição do aluno. O nome fica copiado em target_course.
    const courseId = String(formData.get('targetCourseId') ?? '').trim()
    let targetCourseId: string | null = null
    let targetCourse: string | null = null
    if (courseId) {
      const found = await pool.query(
        `SELECT c.name FROM courses c JOIN student_profiles sp ON sp.institution_id = c.institution_id WHERE c.id = $1 AND c.active AND sp.user_id = $2`,
        [courseId, current.id],
      )
      if (!found.rows[0]) throw new AppError('Escolhe um curso da lista da tua instituição.')
      targetCourseId = courseId
      targetCourse = found.rows[0].name as string
    }
    const parsedScore = Number(formData.get('targetScore'))
    const targetScore = Number.isInteger(parsedScore) && parsedScore >= 0 && parsedScore <= 20 ? parsedScore : 12

    await db
      .insert(studentProfiles)
      .values({ userId: current.id, targetCourseId, targetCourse, targetScore })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { targetCourseId, targetCourse, targetScore, updatedAt: new Date() } })

    refresh()
    return 'Guardado.'
  }, 'Não foi possível guardar. Tenta outra vez.')
}

// Guarda (ou remove, com texto vazio) o URL da foto. Só aceita ficheiros do Cloudinary da conta, na pasta e com o nome do próprio aluno.
export async function saveAvatar(url: string): Promise<ActionResult> {
  return runAction(async () => {
    const current = await requireUser()
    let image: string | null = null

    if (url) {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME
      const prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`
      const valid = !!cloudName && url.length < 500 && url.startsWith(prefix) && url.includes(`/${AVATAR_FOLDER}/${current.id}`)
      if (!valid) throw new AppError('Esta foto não é válida. Tenta outra vez.')
      image = url
    }

    await db.update(user).set({ image, updatedAt: new Date() }).where(eq(user.id, current.id))
    refresh()
    return image ? 'Foto atualizada.' : 'Foto removida.'
  }, 'Não foi possível guardar a foto. Tenta outra vez.')
}
TWISISA_EOF
echo '  ok  app/aluno/perfil/actions.ts'

cat > 'app/aluno/perfil/page.tsx' <<'TWISISA_EOF'
import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { BookOpen, GraduationCap, Lock, School, Sparkles, UserRound, Check } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { institutions, studentProfiles } from '@/lib/db/schema'
import { trackLabel } from '@/lib/percurso'
import { PROVINCES, profileSteps } from '@/lib/perfil'
import { getSubscription, isSubscriptionActive } from '@/lib/subscription'
import { getRanking } from '@/lib/ranking'
import { ORIENTACAO_HREF } from '@/lib/orientacao'
import { getCourseSubjects, listInstitutionCourses } from '@/lib/target-course'
import { formatPoints } from '@/lib/simulator-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { SelectField } from '@/components/ui/select-field'
import { AvatarUploader } from '@/components/aluno/perfil/avatar-uploader'
import { Field, fieldClass } from '@/components/aluno/perfil/fields'
import { PasswordForm } from '@/components/aluno/perfil/password-form'
import { ProfileAccordion, type AccordionItem } from '@/components/aluno/perfil/profile-accordion'
import { SectionForm } from '@/components/aluno/perfil/section-form'
import { CoursePicker } from '@/components/aluno/perfil/course-picker'
import { saveCandidate, savePersonal, saveSchool } from './actions'

export const metadata = { title: 'O meu perfil | Twisisa', description: 'Gere as tuas informações pessoais e preferências.' }

const linkButton = 'inline-flex h-10 items-center rounded-xl border border-[#dfe3d9] bg-white px-4 text-sm font-semibold text-[#1d4d41] transition-colors hover:bg-[#f1f4ef]'

export default async function PerfilPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const [[current], subscription] = await Promise.all([
    db.select().from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)),
    getSubscription(session.user.id),
  ])
  // Posição desta semana (só se pontuou e está visível). Se falhar, o cabeçalho segue sem ela.
  const rank = current?.track && current.showInRanking
    ? await getRanking({ userId: session.user.id, track: current.track, period: 'semana', limit: 0 }).then((data) => data.me, () => null)
    : null
  const institution = current?.institutionId
    ? (await db.select({ shortName: institutions.shortName, name: institutions.name }).from(institutions).where(eq(institutions.id, current.institutionId)))[0]
    : undefined

  // Admissão: cursos da instituição e disciplinas das provas do curso escolhido (se falhar, o resto da página segue).
  const isAdmissionTrack = current?.track === 'admissao' && !!current.institutionId
  const institutionCourses = isAdmissionTrack ? await listInstitutionCourses(current.institutionId!).catch(() => []) : []
  const courseSubjects = current?.targetCourseId ? await getCourseSubjects(current.targetCourseId).catch(() => []) : []

  const name = session.user.name
  const firstName = name.split(' ')[0]
  const track = current?.track ?? null
  const isAdmission = track === 'admissao'
  const plus = isSubscriptionActive(subscription?.status)

  const steps = profileSteps({
    image: session.user.image ?? null,
    nickname: current?.nickname ?? null,
    province: current?.province ?? null,
    school: current?.school ?? null,
    track,
    institutionId: current?.institutionId ?? null,
    targetCourse: current?.targetCourseId ?? null,
  })
  const doneCount = steps.filter((step) => step.done).length
  const percent = Math.round((doneCount / steps.length) * 100)
  const missing = steps.filter((step) => !step.done).map((step) => step.label)
  const complete = missing.length === 0

  const has = (key: string) => steps.find((step) => step.key === key)?.done ?? false
  const schoolSummary = current?.school && current?.province ? `${current.school} · ${current.province}` : current?.school || current?.province || 'Onde estudas'
  const trackSummary = track
    ? [trackLabel(track), isAdmission ? (institution?.shortName ?? 'sem instituição') : null, isAdmission ? current?.targetCourse : null].filter(Boolean).join(' · ')
    : 'O que estás a preparar'

  const items: AccordionItem[] = [
    {
      id: 'pessoal',
      icon: <UserRound />,
      title: 'Dados pessoais',
      summary: [name, current?.nickname ? `@${current.nickname}` : null].filter(Boolean).join(' · '),
      done: has('nickname'),
      content: (
        <SectionForm sectionId="pessoal" action={savePersonal}>
          <Field label="Nome de exibição">
            <input name="displayName" required minLength={2} maxLength={80} defaultValue={name} autoComplete="name" className={fieldClass} />
          </Field>
          <Field label="@Nickname" hint="O teu identificador único: 3 a 20 letras, números, _ ou ponto.">
            <input name="nickname" maxLength={21} defaultValue={current?.nickname ? `@${current.nickname}` : ''} placeholder="@juvencio" autoCapitalize="none" autoCorrect="off" className={fieldClass} />
          </Field>
          <Field label={<>Telefone <span className="font-normal text-[#737c75]">(opcional)</span></>}>
            <input name="phone" type="tel" maxLength={30} defaultValue={current?.phone ?? ''} placeholder="+258 84 000 0000" autoComplete="tel" className={fieldClass} />
          </Field>
          <Field label="Email">
            <input value={session.user.email} readOnly aria-readonly="true" className={fieldClass} />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#f8f8f5] p-3 text-sm">
            <input type="checkbox" name="showInRanking" defaultChecked={current?.showInRanking ?? true} className="mt-0.5 size-4 accent-[#1d4d41]" />
            <span><span className="font-medium text-[#202321]">Aparecer no ranking</span><span className="block text-xs text-[#737c75]">Mostramos só o teu nome abreviado e o @nickname.</span></span>
          </label>
        </SectionForm>
      ),
    },
    {
      id: 'escola',
      icon: <School />,
      title: 'Escola',
      summary: schoolSummary,
      done: has('escola'),
      content: (
        <SectionForm sectionId="escola" action={saveSchool}>
          <Field label="Província" custom>
            <SelectField name="province" label="Província" placeholder="Escolhe a província" defaultValue={current?.province ?? ''} triggerClassName={fieldClass} options={PROVINCES.map((province) => ({ value: province, label: province }))} />
          </Field>
          <Field label="Escola">
            <input name="school" maxLength={120} defaultValue={current?.school ?? ''} placeholder="Ex.: Escola Secundária Josina Machel" className={fieldClass} />
          </Field>
        </SectionForm>
      ),
    },
    {
      id: 'percurso',
      icon: <GraduationCap />,
      title: 'Percurso',
      summary: trackSummary,
      done: has('percurso') && (!isAdmission || (has('instituicao') && has('curso'))),
      content: (
        <div className="grid gap-4">
          <p className="text-sm text-[#68716a]">
            {track ? `${trackLabel(track)}${isAdmission ? (institution ? ` · ${institution.name}` : ' · sem instituição escolhida') : ''}` : 'Ainda não escolheste o que estás a preparar.'}
          </p>
          <div>
            <Link href="/aluno/percurso" className={linkButton}>{track ? 'Alterar percurso' : 'Escolher percurso'}</Link>
          </div>
          {isAdmission && (
            <div className="grid gap-4 border-t border-[#eceee7] pt-4">
              {institutionCourses.length === 0 ? (
                <p className="text-sm text-[#68716a]">Ainda não há cursos desta instituição na plataforma.</p>
              ) : (
                <SectionForm sectionId="percurso" action={saveCandidate}>
                  <Field label="Curso alvo" custom>
                    <CoursePicker name="targetCourseId" courses={institutionCourses} defaultValue={current?.targetCourseId ?? null} />
                  </Field>
                  <Field label="Meta de nota" hint="Escala de 0 a 20." custom>
                    <SelectField name="targetScore" label="Meta de nota" defaultValue={String(current?.targetScore ?? 12)} triggerClassName={fieldClass} options={[10, 12, 14, 16, 18, 20].map((score) => ({ value: String(score), label: String(score) }))} />
                  </Field>
                </SectionForm>
              )}
              {courseSubjects.length > 0 && <p className="text-xs text-[#68716a]">Provas do curso: {courseSubjects.map((subject) => subject.name).join(', ')}.</p>}
              <p className="text-sm text-[#68716a]">Não sabes o curso? <Link href={ORIENTACAO_HREF} className="font-semibold text-[#1d4d41] hover:underline">Faz o teste vocacional</Link> e escolhe entre 5 sugestões.</p>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'seguranca',
      icon: <Lock />,
      title: 'Segurança',
      summary: 'Palavra-passe',
      content: <PasswordForm />,
    },
    {
      id: 'plano',
      icon: <Sparkles />,
      title: 'Plano',
      summary: plus ? 'Plus ativo' : 'Gratuito',
      content: (
        <div className="grid gap-4">
          <p className="text-sm text-[#68716a]">{plus ? 'Tens o Twisisa Plus ativo.' : 'Estás no plano gratuito.'}</p>
          <div>
            <Link href="/planos" className={linkButton}><BookOpen className="mr-2 size-4" aria-hidden="true" />{plus ? 'Ver o meu plano' : 'Ver planos'}</Link>
          </div>
        </div>
      ),
    },
  ]

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Perfil" title="Meu Perfil" hideTitle hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <AvatarUploader name={name} image={session.user.image ?? null} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{name}</h1>
            <p className="truncate text-sm text-[#68716a]">{current?.nickname ? `@${current.nickname}` : session.user.email}</p>
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#e3e6dc]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Perfil completo">
                <div className="h-full rounded-full bg-[#1d4d41] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-[#68716a]">
                {complete ? (
                  <><Check size={13} className="text-[#1d4d41]" aria-hidden="true" />Perfil completo</>
                ) : (
                  <>{doneCount} de {steps.length} · falta {missing.slice(0, 2).join(' e ')}{missing.length > 2 ? '…' : ''}</>
                )}
              </p>
              {rank && (
                <Link href="/aluno/ranking" className="mt-1 inline-block text-xs font-semibold text-[#1d4d41] hover:underline">#{rank.position} no ranking da semana · {formatPoints(rank.points)} pts</Link>
              )}
            </div>
          </div>
        </div>
        <ProfileAccordion items={items} />
      </div>
    </StudentFeatureShell>
  )
}
TWISISA_EOF
echo '  ok  app/aluno/perfil/page.tsx'

cat > 'tests/desafios.test.ts' <<'TWISISA_EOF'
import test from 'node:test'
import assert from 'node:assert/strict'
import { DAILY_GOAL, buildMissions, computeStreak, formatLeft, pickSubjectOfDay, totalReadiness, weekStartOf, weekdayIndex, type DayRow, type SubjectStat } from '../lib/desafios-regras'
import { buildAvisos } from '../lib/avisos'
import type { DesafiosSnapshot } from '../lib/desafios'

const row = (day: string, answered = DAILY_GOAL, correct = 7, points = 3): DayRow => ({ day, answered, correct, points })
const subject = (id: string, over: Partial<SubjectStat> = {}): SubjectStat => ({ id, name: id, weight: 50, answered30: 0, correct30: 0, answeredWeek: 0, answeredToday: 0, ...over })

test('datas: semana começa na segunda-feira (Maputo)', () => {
  assert.equal(weekdayIndex('2026-11-02'), 0)
  assert.equal(weekdayIndex('2026-10-31'), 5)
  assert.equal(weekStartOf('2026-10-31'), '2026-10-26')
})

test('sequência: viva até à meia-noite e zero depois de um dia falhado', () => {
  const days = [row('2026-10-28'), row('2026-10-29'), row('2026-10-30')]
  const alive = computeStreak(days, '2026-10-31')
  assert.equal(alive.current, 3)
  assert.equal(alive.todayMet, false)
  assert.equal(computeStreak([...days, row('2026-10-31')], '2026-10-31').current, 4)
  const dead = computeStreak(days, '2026-11-01')
  assert.equal(dead.current, 0)
  assert.deepEqual(dead.lost, { length: 3, endedOn: '2026-10-30' })
})

test('sequência: só conta o dia com a meta; guarda a melhor', () => {
  const days = [row('2026-10-01'), row('2026-10-02'), row('2026-10-03'), row('2026-10-04'), row('2026-10-20', 9), row('2026-10-30')]
  const s = computeStreak(days, '2026-10-30')
  assert.equal(s.best, 4)
  assert.equal(s.current, 1)
  assert.equal(s.lastActiveDay, '2026-10-30')
  assert.equal(computeStreak([], '2026-10-30').lost, null)
})

test('missões: a semana falha quando já não dá para chegar aos 5 dias', () => {
  // sábado, 2 dias cumpridos, hoje por cumprir: só sobram sábado e domingo
  const days = [row('2026-10-26'), row('2026-10-27')]
  const { weekly, weekDaysLeft } = buildMissions({ today: '2026-10-31', days, subjects: [], fromCourse: false, subjectOfDay: null })
  assert.equal(weekDaysLeft, 2)
  assert.equal(weekly.find((m) => m.id === 'w-dias')?.status, 'falhada')
  const ok = buildMissions({ today: '2026-10-29', days: [row('2026-10-26'), row('2026-10-27')], subjects: [], fromCourse: false, subjectOfDay: null })
  assert.equal(ok.weekly.find((m) => m.id === 'w-dias')?.status, 'em_curso')
})

test('missões: disciplina do dia e cobertura por curso', () => {
  const subjects = [subject('mat', { answeredWeek: 12, answeredToday: 5, answered30: 20, correct30: 18 }), subject('fis', { answeredWeek: 3 })]
  const out = buildMissions({ today: '2026-10-29', days: [row('2026-10-29', 12, 10)], subjects, fromCourse: true, subjectOfDay: subjects[1] })
  assert.equal(out.daily.find((m) => m.id === 'd-disciplina')?.title.startsWith('fis'), true)
  const cob = out.weekly.find((m) => m.id === 'w-cobertura')
  assert.equal(cob?.current, 1)
  assert.equal(cob?.target, 2)
  assert.match(cob?.detail ?? '', /fis/)
  assert.equal(out.daily.find((m) => m.id === 'd-precisao')?.status, 'feita')
})

test('disciplina do dia: a mais fraca; sem dados, roda por dia', () => {
  const strong = subject('mat', { answered30: 30, correct30: 27 })
  const weak = subject('fis', { answered30: 30, correct30: 9 })
  assert.equal(pickSubjectOfDay([strong, weak], '2026-10-31')?.id, 'fis')
  const a = pickSubjectOfDay([subject('a'), subject('b')], '2026-10-31')?.id
  const b = pickSubjectOfDay([subject('a'), subject('b')], '2026-11-01')?.id
  assert.notEqual(a, b)
  assert.equal(pickSubjectOfDay([], '2026-10-31'), null)
})

test('prontidão: acertos × volume, ponderada pelo peso', () => {
  const full = subject('mat', { weight: 70, answered30: 30, correct30: 30 })
  const empty = subject('fis', { weight: 30 })
  assert.equal(totalReadiness([full, empty]), 70)
  assert.equal(totalReadiness([]), null)
  assert.equal(totalReadiness([subject('x', { weight: 50, answered30: 15, correct30: 15 })]), 50)
})

test('formatLeft', () => {
  assert.equal(formatLeft(3600 * 6 + 60 * 20), '6 h 20 min')
  assert.equal(formatLeft(2400), '40 min')
  assert.equal(formatLeft(7200), '2 h')
})

function snapshot(over: Partial<DesafiosSnapshot> = {}): DesafiosSnapshot {
  return {
    today: '2026-10-30', weekday: 4, secondsLeft: 3 * 3600,
    streak: { current: 0, best: 0, todayMet: false, lost: null, lastActiveDay: '2026-10-30' },
    daysSinceActive: 0, todayAnswered: 0, todayCorrect: 0, weekPoints: 0, weekGoalDays: 0, weekDaysLeft: 3,
    daily: [], weekly: [{ id: 'w-dias', title: '', detail: null, current: 0, target: 5, unit: 'dias', status: 'em_curso', href: null }],
    admission: false, course: null, subjects: [], readiness: null, weak: null, errorCount: 0, ...over,
  }
}

test('avisos: sequência em risco vem primeiro e é urgente perto da meia-noite', () => {
  const avisos = buildAvisos(snapshot({ streak: { current: 5, best: 5, todayMet: false, lost: null, lastActiveDay: '2026-10-29' }, daysSinceActive: 1, todayAnswered: 4 }))
  assert.equal(avisos[0].id, 'streak-risk')
  assert.equal(avisos[0].tone, 'urgent')
  assert.match(avisos[0].text, /Faltam 6 questões/)
})

test('avisos: perdeu a sequência, inatividade, curso por escolher e sem prática', () => {
  const lost = buildAvisos(snapshot({ streak: { current: 0, best: 7, todayMet: false, lost: { length: 7, endedOn: '2026-10-25' }, lastActiveDay: '2026-10-26' }, daysSinceActive: 4 }))
  assert.equal(lost[0].id, 'streak-lost')
  assert.ok(!lost.some((a) => a.id === 'inactive'))
  assert.equal(buildAvisos(snapshot({ daysSinceActive: 3, streak: { current: 0, best: 0, todayMet: false, lost: null, lastActiveDay: '2026-10-27' } }))[0].title, 'Há 3 dias sem praticar')
  assert.ok(buildAvisos(snapshot({ admission: true, course: null })).some((a) => a.id === 'course'))
  assert.equal(buildAvisos(snapshot({ daysSinceActive: null, streak: { current: 0, best: 0, todayMet: false, lost: null, lastActiveDay: null } }))[0].id, 'first')
  const done = buildAvisos(snapshot({ streak: { current: 3, best: 3, todayMet: true, lost: null, lastActiveDay: '2026-10-30' }, todayAnswered: 10 }))
  assert.equal(done[done.length - 1].id, 'done')
})
TWISISA_EOF
echo '  ok  tests/desafios.test.ts'

# O quadro de missões antigo (dados inventados) deixa de ser usado.
if [ -f components/challenge-board.tsx ]; then rm components/challenge-board.tsx; echo '  rm  components/challenge-board.tsx'; fi

# Alterações pequenas em ficheiros existentes (repetível: o que já está aplicado fica como está).
node - <<'JSEOF'
const fs = require("node:fs")
const patches = {
 "lib/db/schema.ts": [
  [
   "showInRanking: boolean('show_in_ranking').notNull().default(true), createdAt",
   "showInRanking: boolean('show_in_ranking').notNull().default(true), targetCourseId: text('target_course_id'), createdAt"
  ]
 ],
 "app/aluno/percurso/actions.ts": [
  [
   "    await db\n      .insert(studentProfiles)\n      .values({ userId: session.user.id, track, institutionId })\n      .onConflictDoUpdate({ target: studentProfiles.userId, set: { track, institutionId, updatedAt: new Date() } })",
   "    // O curso só se mantém se a instituição for a mesma: cada curso pertence a uma instituição.\n    const previous = await pool.query('SELECT institution_id FROM student_profiles WHERE user_id = $1', [session.user.id])\n    const keepCourse = track === 'admissao' && previous.rows[0]?.institution_id === institutionId\n    const course = keepCourse ? {} : { targetCourseId: null, targetCourse: null }\n\n    await db\n      .insert(studentProfiles)\n      .values({ userId: session.user.id, track, institutionId, ...course })\n      .onConflictDoUpdate({ target: studentProfiles.userId, set: { track, institutionId, ...course, updatedAt: new Date() } })"
  ]
 ],
 "app/aluno/descobrir-curso/resultado/page.tsx": [
  [
   "import { redirect } from 'next/navigation'\n",
   "import { redirect } from 'next/navigation'\nimport { eq } from 'drizzle-orm'\nimport { db } from '@/lib/db'\nimport { studentProfiles } from '@/lib/db/schema'\nimport { ChooseCourseButton } from '@/components/orientacao/choose-course-button'\n"
  ],
  [
   "  const { courses, flat } = latest.result\n",
   "  const { courses, flat } = latest.result\n  const [profile] = await db.select({ targetCourseId: studentProfiles.targetCourseId }).from(studentProfiles).where(eq(studentProfiles.userId, scope.userId)).limit(1)\n"
  ],
  [
   "            <ol className=\"mt-5 space-y-3\">",
   "            <p className=\"mt-2 text-[13px] leading-5 text-[#6b756e]\">Escolhe o curso a que queres candidatar-te: passas a treinar as provas dele nos Desafios.</p>\n            <ol className=\"mt-5 space-y-3\">"
  ],
  [
   "Porque gostas de {joinLabels(course.reasons.map((d) => DIMENSION_LABEL[d]))}.</p>}",
   "Porque gostas de {joinLabels(course.reasons.map((d) => DIMENSION_LABEL[d]))}.</p>}\n                  <div className=\"mt-3\"><ChooseCourseButton courseId={course.courseId} chosen={profile?.targetCourseId === course.courseId} /></div>"
  ]
 ],
 "app/aluno/(painel)/page.tsx": [
  [
   "import { getInicioAluno, type ResumeItem } from '@/lib/aluno-inicio'\n",
   "import { getInicioAluno, type ResumeItem } from '@/lib/aluno-inicio'\nimport { getDesafios } from '@/lib/desafios'\nimport { buildAvisos } from '@/lib/avisos'\nimport { Avisos } from '@/components/aluno/avisos'\n"
  ],
  [
   ".select({ track: studentProfiles.track, institutionId: studentProfiles.institutionId })",
   ".select({ track: studentProfiles.track, institutionId: studentProfiles.institutionId, targetCourseId: studentProfiles.targetCourseId })"
  ],
  [
   "  const { progress, unread, downloads, saved, recent, savedItems, institution, simulador } = await getAlunoOverview({",
   "  // Sequência e avisos vêm das respostas do Simulador (lib/desafios). Se falhar, a página segue sem eles.\n  const desafiosPromise = track\n    ? getDesafios({ scope: { userId: session.user.id, track, institutionId: profile?.institutionId ?? null }, targetCourseId: profile?.targetCourseId ?? null }).catch((error: unknown) => {\n        console.error('[ALUNO] desafios', error)\n        return null\n      })\n    : Promise.resolve(null)\n  const { progress, unread, downloads, saved, recent, savedItems, institution, simulador } = await getAlunoOverview({"
  ],
  [
   "  const greeting = getGreeting({ name: session.user.name, userId: session.user.id, createdAt: session.user.createdAt, streak: week?.streak ?? null })",
   "  const desafios = await desafiosPromise\n  const avisos = desafios ? buildAvisos(desafios).slice(0, 3) : []\n  const greeting = getGreeting({ name: session.user.name, userId: session.user.id, createdAt: session.user.createdAt, streak: desafios ? desafios.streak.current : null })"
  ],
  [
   "              {resume && <ContinuarCard resume={resume} />}",
   "              <Avisos items={avisos} />\n\n              {resume && <ContinuarCard resume={resume} />}"
  ]
 ],
 "components/student-nav.tsx": [
  [
   "import { BookOpen, ClipboardCheck, LayoutDashboard, Sparkles, Trophy, UserRound } from 'lucide-react'",
   "import { BookOpen, ClipboardCheck, Flame, LayoutDashboard, Sparkles, Trophy, UserRound } from 'lucide-react'"
  ],
  [
   "  { href: '/aluno/ranking', label: 'Ranking', icon: Trophy },\n",
   "  { href: '/aluno/desafios', label: 'Desafios', icon: Flame },\n  { href: '/aluno/ranking', label: 'Ranking', icon: Trophy },\n"
  ]
 ],
 "components/skeletons/student-shell.tsx": [
  [
   "Menu lateral do estudante (5 + 1 ligações)",
   "Menu lateral do estudante (6 + 1 ligações)"
  ],
  [
   "{[5, 1].map((count, group) => (",
   "{[6, 1].map((count, group) => ("
  ]
 ]
}
let failed = false
for (const [file, pairs] of Object.entries(patches)) {
  let s = fs.readFileSync(file, 'utf8')
  let changed = 0
  for (const [from, to] of pairs) {
    if (s.includes(to)) continue
    if (s.split(from).length !== 2) {
      console.error('  ERRO ' + file + ': não encontrei (ou há mais de um) o trecho: ' + from.slice(0, 70).replace(/\n/g, ' '))
      failed = true
      continue
    }
    s = s.replace(from, () => to)
    changed++
  }
  if (changed) fs.writeFileSync(file, s)
  console.log((changed ? '  ok  ' : '  --  ') + file + (changed ? '' : ' (já estava aplicado)'))
}
if (failed) process.exit(1)
JSEOF

echo
echo "Feito. ANTES de publicar, aplica a migração (a página lê a coluna nova):"
echo "  npm run migrate"
echo
echo "Depois, para publicar:"
echo "  git add -A"
echo "  git commit -m \"feat(desafios): sequência, missões diárias e semanais, prontidão por curso, avisos e escolha do curso\""
echo "  git push"
