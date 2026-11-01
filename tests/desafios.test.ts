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
