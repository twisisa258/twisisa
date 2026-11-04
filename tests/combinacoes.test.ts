import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveCombo, uniqueCombos, type ComboOptionRow } from '../lib/combinacoes-pure'

const paper = (paperId: string, subjectId: string, subjectName: string, variant = '') => ({ paperId, subjectId, subjectName, variant })
const mat1 = paper('p1', 'mat', 'Matemática', 'I')
const fis1 = paper('p2', 'fis', 'Física', 'I')
const mat2 = paper('p3', 'mat', 'Matemática', 'II')
const por2 = paper('p4', 'por', 'Português', 'II')

test('laboral e pós-laboral com as mesmas provas são uma só combinação', () => {
  const rows: ComboOptionRow[] = [
    { optionId: 'o1', sortOrder: 0, papers: [mat1, fis1] },
    { optionId: 'o2', sortOrder: 1, papers: [fis1, mat1] },
  ]
  const combos = uniqueCombos(rows)
  assert.equal(combos.length, 1)
  assert.deepEqual(combos[0].optionIds, ['o1', 'o2'])
  assert.equal(combos[0].label, 'Física-I + Matemática-I')
  assert.deepEqual(resolveCombo(combos, null), { optionId: 'o1', needsChoice: false })
})

test('duas combinações diferentes obrigam a perguntar', () => {
  const combos = uniqueCombos([
    { optionId: 'o1', sortOrder: 0, papers: [mat1, fis1] },
    { optionId: 'o2', sortOrder: 1, papers: [mat2, por2] },
  ])
  assert.equal(combos.length, 2)
  assert.deepEqual(resolveCombo(combos, null), { optionId: null, needsChoice: true })
  assert.deepEqual(resolveCombo(combos, 'o2'), { optionId: 'o2', needsChoice: false })
  assert.deepEqual(resolveCombo(combos, 'inexistente'), { optionId: null, needsChoice: true })
})

test('sem opções não há combinação', () => {
  assert.deepEqual(resolveCombo(uniqueCombos([]), null), { optionId: null, needsChoice: false })
})

test('bloqueio: admissão sem curso não começa nada; com uma combinação segue; com duas pergunta', async () => {
  const { decideGate } = await import('../lib/combinacoes-pure')
  const um = uniqueCombos([{ optionId: 'o1', sortOrder: 0, papers: [mat1, fis1] }])
  const dois = uniqueCombos([{ optionId: 'o1', sortOrder: 0, papers: [mat1, fis1] }, { optionId: 'o2', sortOrder: 1, papers: [mat2, por2] }])
  const base = { track: 'admissao', institutionId: 'uem', courseId: null as string | null, optionOk: false, institutionHasCourses: true, combos: [] as typeof um }
  assert.equal(decideGate(base).need, 'curso')
  assert.equal(decideGate({ ...base, institutionHasCourses: false }).need, null)
  assert.equal(decideGate({ ...base, track: '12', institutionId: null }).need, null)
  assert.deepEqual(decideGate({ ...base, courseId: 'c1', combos: um }), { need: null, courseId: 'c1', auto: 'o1' })
  assert.equal(decideGate({ ...base, courseId: 'c1', combos: dois }).need, 'combinacao')
  assert.equal(decideGate({ ...base, courseId: 'c1', combos: dois, optionOk: true }).need, null)
  assert.equal(decideGate({ ...base, courseId: 'c1', combos: [] }).need, null)
})
