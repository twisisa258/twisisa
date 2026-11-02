import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Aviso } from '../lib/avisos'
import { chooseReminder, isStudyHour } from '../lib/lembretes-shared'
import { computeStreak } from '../lib/desafios-regras'
import { extractJson, parseGenerated, topicPatterns } from '../lib/kit-pure'

const aviso = (id: string, tone: Aviso['tone'] = 'warning'): Aviso => ({ id, tone, icon: 'flame', title: `T ${id}`, text: `Texto ${id}`, href: '/aluno/simulador', cta: 'Ir' })

test('lembrete: sequência em risco tem prioridade e junta as questões guardadas', () => {
  const r = chooseReminder({ avisos: [aviso('streak-risk'), aviso('daily')], todayMet: false, marksDue: 2 })
  assert.equal(r?.key, 'streak')
  assert.match(r!.text, /2 questões guardadas/)
})

test('lembrete: com questões para rever hoje, avisa mesmo com a meta cumprida', () => {
  const r = chooseReminder({ avisos: [], todayMet: true, marksDue: 1 })
  assert.equal(r?.key, 'revisao')
  assert.equal(r?.title, 'Tens 1 questão para rever hoje')
  assert.equal(r?.href, '/aluno/estudar-depois')
})

test('lembrete: meta cumprida e nada para rever não envia nada', () => {
  assert.equal(chooseReminder({ avisos: [aviso('done', 'success')], todayMet: true, marksDue: 0 }), null)
})

test('lembrete: sem urgência, usa o aviso útil do dia', () => {
  assert.equal(chooseReminder({ avisos: [aviso('week', 'info'), aviso('errors', 'info')], todayMet: false, marksDue: 0 })?.key, 'errors')
})

test('hora de estudo: só entre as 5h e as 23h', () => {
  assert.equal(isStudyHour(18), true)
  assert.equal(isStudyHour(3), false)
  assert.equal(isStudyHour(24), false)
  assert.equal(isStudyHour(7.5), false)
  assert.equal(isStudyHour('18'), false)
})

test('meta diária por aluno: a sequência usa a meta escolhida', () => {
  const days = [{ day: '2026-11-01', answered: 5, correct: 3, points: 3 }]
  assert.equal(computeStreak(days, '2026-11-01', 5).todayMet, true)
  assert.equal(computeStreak(days, '2026-11-01', 10).todayMet, false)
  assert.equal(computeStreak(days, '2026-11-01').todayMet, false)
})

test('questão da IA: só aceita 4 opções diferentes e um índice certo válido', () => {
  const good = { statement: 'Resolve 3x + 2 = 11. Quanto vale x?', options: ['1', '2', '3', '4'], correctIndex: 2, explanation: '3x = 9, logo x = 3.' }
  assert.deepEqual(parseGenerated(good)?.correctIndex, 2)
  assert.equal(parseGenerated({ ...good, options: ['1', '1', '3', '4'] }), null)
  assert.equal(parseGenerated({ ...good, options: ['1', '2', '3'] }), null)
  assert.equal(parseGenerated({ ...good, correctIndex: 4 }), null)
  assert.equal(parseGenerated({ ...good, statement: 'curto' }), null)
  assert.equal(parseGenerated(null), null)
})

test('JSON da IA: tira o embrulho de código e ignora texto à volta', () => {
  assert.deepEqual(extractJson('```json\n{"a": 1}\n```'), { a: 1 })
  assert.deepEqual(extractJson('Aqui está: {"a": 2} fim'), { a: 2 })
  assert.equal(extractJson('sem json'), null)
  assert.equal(extractJson('{partido'), null)
})

test('matéria relacionada: padrões do tema sem palavras curtas nem símbolos', () => {
  assert.deepEqual(topicPatterns('Equações do 2.º grau'), ['%equações%', '%grau%'])
  assert.deepEqual(topicPatterns(null), [])
  assert.deepEqual(topicPatterns('100% juros_simples'), ['%juros%', '%simples%'])
})
