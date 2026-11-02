import { pool } from '@/lib/db'
import { getSimulatorHub, type StudentScope } from '@/lib/simulator'
import { getCourse, getCourseSubjects } from '@/lib/target-course'
import {
  DAILY_GOAL,
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
  /** Meta diária do aluno (questões por dia). */
  goal: number
}

export async function getDesafios(input: { scope: StudentScope; targetCourseId: string | null; dailyGoal?: number | null }): Promise<DesafiosSnapshot> {
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

  const goal = input.dailyGoal && input.dailyGoal > 0 ? input.dailyGoal : DAILY_GOAL
  const streak = computeStreak(days, today, goal)
  const subjectOfDay = pickSubjectOfDay(subjects, today)
  const missions = buildMissions({ today, days, subjects, fromCourse: !!validCourse, subjectOfDay, goal })

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
    goal,
  }
}
