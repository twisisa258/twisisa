import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isQuiet, maputoNow, mergeConfig, pickPush, PUSH_DEFAULTS, type PushContext } from '../lib/push-regras'

const cfg = PUSH_DEFAULTS
const base = (over: Partial<PushContext> = {}): PushContext => ({
  now: { date: '2026-11-04', minutes: 14 * 60 },
  userSeed: 'u1',
  needsCourse: false,
  goal: 10,
  answered: 4,
  todayMet: false,
  streak: 0,
  daysSinceActive: 0,
  hot: 0,
  openAttempt: null,
  newMaterials: [],
  history: { sentToday: 0, minutesSinceLast: null, lastByKind: {}, refs: [] },
  ...over,
})

test('horas de silêncio e limites', () => {
  assert.equal(isQuiet(23 * 60, cfg), true)
  assert.equal(isQuiet(6 * 60, cfg), true)
  assert.equal(isQuiet(12 * 60, cfg), false)
  assert.equal(pickPush(base({ now: { date: '2026-11-04', minutes: 23 * 60 }, hot: 5 }), cfg), null)
  assert.equal(pickPush(base({ hot: 5, history: { sentToday: 6, minutesSinceLast: 500, lastByKind: {}, refs: [] } }), cfg), null)
  assert.equal(pickPush(base({ hot: 5, history: { sentToday: 1, minutesSinceLast: 10, lastByKind: {}, refs: [] } }), cfg), null)
})

test('prazo do desafio: um aviso por patamar e só se a meta não estiver cumprida', () => {
  const tarde = { date: '2026-11-04', minutes: 20 * 60 + 30 } // faltam 3,5 h: patamar 4
  const msg = pickPush(base({ now: tarde, streak: 5 }), cfg)
  assert.equal(msg?.kind, 'desafio-prazo')
  assert.match(msg!.title, /Faltam 4 horas/)
  assert.match(msg!.body, /sequência de 5 dias/)
  assert.equal(pickPush(base({ now: tarde, history: { sentToday: 1, minutesSinceLast: 60, lastByKind: {}, refs: ['desafio-prazo:2026-11-04:4'] } }), cfg), null)
  assert.equal(pickPush(base({ now: tarde, todayMet: true }), cfg), null)
  assert.equal(pickPush(base({ now: { date: '2026-11-04', minutes: 12 * 60 } }), cfg), null)
})

test('começou e não continuou', () => {
  const open = { id: 'a1', answered: 4, total: 10, idleMinutes: 200 }
  const msg = pickPush(base({ openAttempt: open }), cfg)
  assert.equal(msg?.kind, 'retomar')
  assert.equal(msg?.url, '/aluno/simulador/sessao/a1')
  assert.equal(pickPush(base({ openAttempt: { ...open, idleMinutes: 30 } }), cfg), null)
  assert.equal(pickPush(base({ openAttempt: open, history: { sentToday: 1, minutesSinceLast: 90, lastByKind: {}, refs: ['retomar:a1'] } }), cfg), null)
})

test('matéria nova, questões quentes e voltar, por prioridade', () => {
  const mat = [{ id: 'm1', title: 'Limites', subject: 'Matemática' }]
  assert.equal(pickPush(base({ newMaterials: mat, hot: 8 }), cfg)?.kind, 'materia-nova')
  assert.equal(pickPush(base({ hot: 14 }), cfg)?.title, '10 questões quentes à tua espera')
  assert.equal(pickPush(base({ hot: 1 }), cfg)?.title, '1 questão quente à tua espera')
  assert.equal(pickPush(base({ daysSinceActive: 5 }), cfg)?.kind, 'voltar')
  assert.equal(pickPush(base({ hot: 3, history: { sentToday: 1, minutesSinceLast: 120, lastByKind: { 'questoes-quentes': 60 }, refs: [] } }), cfg), null)
})

test('sem curso só se lembra de escolher o curso', () => {
  const msg = pickPush(base({ needsCourse: true, hot: 9 }), cfg)
  assert.equal(msg?.kind, 'escolher-curso')
  assert.equal(pickPush(base({ needsCourse: true, history: { sentToday: 1, minutesSinceLast: 90, lastByKind: { 'escolher-curso': 90 }, refs: [] } }), cfg), null)
})

test('configuração: valores inválidos voltam ao defeito', () => {
  assert.deepEqual(mergeConfig(null), PUSH_DEFAULTS)
  const c = mergeConfig({ minGapMinutes: 60, maxPerDay: -3, deadlineTiers: [2, 6, 'x'], cooldownHours: { voltar: 24 } })
  assert.equal(c.minGapMinutes, 60)
  assert.equal(c.maxPerDay, PUSH_DEFAULTS.maxPerDay)
  assert.deepEqual(c.deadlineTiers, [2, 6])
  assert.equal(c.cooldownHours.voltar, 24)
  assert.equal(c.cooldownHours.retomar, PUSH_DEFAULTS.cooldownHours.retomar)
})

test('hora de Maputo', () => {
  const t = maputoNow(new Date('2026-11-04T18:30:00Z'))
  assert.equal(t.date, '2026-11-04')
  assert.equal(t.minutes, 20 * 60 + 30)
})
