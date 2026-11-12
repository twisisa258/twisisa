import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DISCIPLINAS_GERAIS, etapaEmFalta, normalizarVariante, precisaVariante } from '../lib/regras'

const UEM = 'uem'
const base = { track: '', institutionId: '', subjectId: '', topicId: '', variant: '' }

test('são exatamente 10 disciplinas gerais, sem repetidas', () => {
  assert.equal(DISCIPLINAS_GERAIS.length, 10)
  assert.equal(new Set(DISCIPLINAS_GERAIS.map((item) => item.slug)).size, 10)
  assert.ok(!DISCIPLINAS_GERAIS.some((item) => ['musica', 'teatro', 'sociologia'].includes(item.slug)))
})

test('variantes: só I, II e III, venha como vier', () => {
  assert.equal(normalizarVariante('i'), 'I')
  assert.equal(normalizarVariante(' II '), 'II')
  assert.equal(normalizarVariante('iii'), 'III')
  assert.equal(normalizarVariante('IV'), null)
  assert.equal(normalizarVariante('pratica'), null)
  assert.equal(normalizarVariante(''), null)
  assert.equal(normalizarVariante(null), null)
})

test('a variante só se pede na UEM e numa disciplina que as tem', () => {
  assert.equal(precisaVariante('admissao', UEM, [UEM], true), true)
  assert.equal(precisaVariante('admissao', UEM, [UEM], false), false)
  assert.equal(precisaVariante('admissao', 'up', [UEM], true), false)
  assert.equal(precisaVariante('12', '', [UEM], true), false)
})

test('a configuração guiada pede um passo de cada vez', () => {
  assert.equal(etapaEmFalta(base, [UEM], false), 'onde')
  assert.equal(etapaEmFalta({ ...base, track: 'admissao' }, [UEM], false), 'onde')
  assert.equal(etapaEmFalta({ ...base, track: 'admissao', institutionId: UEM }, [UEM], false), 'disciplina')
  assert.equal(etapaEmFalta({ ...base, track: 'admissao', institutionId: UEM, subjectId: 'mat' }, [UEM], true), 'variante')
  assert.equal(etapaEmFalta({ ...base, track: 'admissao', institutionId: UEM, subjectId: 'mat', variant: 'I' }, [UEM], true), 'tema')
  assert.equal(etapaEmFalta({ ...base, track: 'admissao', institutionId: 'up', subjectId: 'mat' }, [UEM], true), 'tema')
  assert.equal(etapaEmFalta({ ...base, track: '12', subjectId: 'bio', topicId: 't1' }, [UEM], true), null)
  assert.equal(etapaEmFalta({ ...base, track: 'admissao', institutionId: UEM, subjectId: 'mat', variant: 'II', topicId: 't1' }, [UEM], true), null)
})
