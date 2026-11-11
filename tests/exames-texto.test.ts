import assert from 'node:assert/strict'
import { test } from 'node:test'
import { examTextParagraphs } from '../lib/exames-pure'

const enunciado = 'Considere a função f definida por f(x) = x^2 - 4x + 3, com domínio real. Determine os zeros da função e o vértice da parábola. '.repeat(4)

test('texto do exame: junta as linhas partidas pelo PDF e separa por questão', () => {
  const raw = `1. Calcule o limite\nquando x tende para zero.\n${enunciado}\n2. Resolva a equação\nx + 2 = 5.\n${enunciado}`
  const out = examTextParagraphs(raw)
  assert.equal(out.length, 2)
  assert.ok(out[0].startsWith('1. Calcule o limite quando x tende para zero.'))
  assert.ok(out[1].startsWith('2. Resolva a equação x + 2 = 5.'))
})

test('texto do exame: curto demais não vale a pena mostrar', () => {
  assert.deepEqual(examTextParagraphs('1. Curto'), [])
  assert.deepEqual(examTextParagraphs(''), [])
})

test('texto do exame: respeita o limite de caracteres e tira caracteres de controlo', () => {
  const muitas = Array.from({ length: 30 }, (_, index) => `${index + 1}. ${'palavra '.repeat(75)}`).join('\n')
  const out = examTextParagraphs(muitas, 2000)
  assert.ok(out.length > 0 && out.length < 30)
  assert.ok(out.join('').length <= 2000)
  const sujo = examTextParagraphs(`1. ${'x'.repeat(500)}\u0000abc`)
  assert.ok(sujo.length === 1 && !sujo[0].includes('\u0000'))
})
