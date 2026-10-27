import test from 'node:test'
import assert from 'node:assert/strict'
import { gradeOutOf20, itemWeight, OptionShuffler, pickQuestions, questionWeight, repeatFactor, type Candidate } from '../lib/quiz-engine'

const cand = (id: string, extra: Partial<Candidate> = {}): Candidate => ({
  id,
  examYear: 2020,
  topicId: 't',
  variant: 'Matemática I',
  timesShown: 0,
  lastResult: null,
  lastShownAt: null,
  ...extra
})

test('pesos ficam sempre entre 2 e 4', () => {
  for (const q of ['facil', 'media', 'dificil']) {
    for (const v of ['facil', 'media', 'dificil', null]) {
      const w = questionWeight(q, v)
      assert.ok(w >= 2 && w <= 4, `${q}/${v} → ${w}`)
    }
  }

  assert.equal(questionWeight('dificil', 'dificil'), 4)
  assert.equal(questionWeight('facil', 'facil'), 2)
  assert.equal(questionWeight('media', null), 3)
})

test('questões já vistas perdem peso', () => {
  assert.equal(repeatFactor(0), 1)
  assert.equal(repeatFactor(1), 0.5)
  assert.equal(repeatFactor(2), 0.25)
  assert.equal(repeatFactor(9), 0.1)
  assert.equal(itemWeight('media', 'media', 0), 3)
  assert.equal(itemWeight('media', 'media', 1), 1.5)
  assert.ok(itemWeight('facil', 'facil', 9) >= 0.1)
})

test('nota de 0 a 20 pesada', () => {
  assert.equal(gradeOutOf20([]), 0)
  assert.equal(
    gradeOutOf20([
      { weight: 2, correct: true },
      { weight: 4, correct: false }
    ]),
    6.7
  )
  assert.equal(
    gradeOutOf20([
      { weight: 4, correct: true },
      { weight: 2, correct: false }
    ]),
    13.3
  )
  assert.equal(
    gradeOutOf20([
      { weight: 3, correct: true },
      { weight: 3, correct: true }
    ]),
    20
  )
  assert.equal(gradeOutOf20([{ weight: 3, correct: false }]), 0)
})

test('escolha: novas primeiro, sem duplicados, tamanho certo', () => {
  const pool = [
    ...Array.from({ length: 30 }, (_, i) =>
      cand(`n${i}`, { examYear: 2020 + (i % 7) })
    ),
    ...Array.from({ length: 30 }, (_, i) =>
      cand(`v${i}`, {
        timesShown: 1,
        lastResult: 'right',
        lastShownAt: 1000 + i
      })
    )
  ]

  for (let r = 0; r < 50; r++) {
    const ids = pickQuestions(pool, { size: 20, now: 10 ** 12 })

    assert.equal(ids.length, 20)
    assert.equal(new Set(ids).size, 20)
    assert.ok(
      ids.every((id) => id.startsWith('n')),
      'só novas quando há novas que cheguem'
    )
  }
})

test('escolha: erradas podem voltar (até 30 %), certas só no fim', () => {
  const pool = [
    ...Array.from({ length: 30 }, (_, i) => cand(`n${i}`)),
    ...Array.from({ length: 10 }, (_, i) =>
      cand(`w${i}`, {
        timesShown: 1,
        lastResult: 'wrong',
        lastShownAt: 0
      })
    ),
    ...Array.from({ length: 10 }, (_, i) =>
      cand(`r${i}`, {
        timesShown: 1,
        lastResult: 'right',
        lastShownAt: 0
      })
    )
  ]

  const ids = pickQuestions(pool, { size: 10, now: 10 ** 12 })

  assert.equal(ids.filter((id) => id.startsWith('w')).length, 3)
  assert.equal(ids.filter((id) => id.startsWith('r')).length, 0)

  // Sem novas, usa erradas e depois certas (as vistas há mais tempo).
  const few = [cand('n0'), ...pool.filter((c) => !c.id.startsWith('n'))]
  const out = pickQuestions(few, { size: 15, now: 10 ** 12 })

  assert.equal(out.length, 15)
  assert.ok(out.includes('n0'))
  assert.equal(out.filter((id) => id.startsWith('w')).length, 10)
})

test('escolha: errada recente espera o tempo de espera', () => {
  const now = 10 ** 12

  const pool = [
    cand('n0'),
    cand('w0', {
      timesShown: 1,
      lastResult: 'wrong',
      lastShownAt: now - 60_000
    })
  ]

  assert.deepEqual(pickQuestions(pool, { size: 1, now }), ['n0'])
})

test('escolha: anos repartidos', () => {
  const pool = Array.from({ length: 70 }, (_, i) =>
    cand(`n${i}`, {
      examYear: 2020 + Math.floor(i / 10)
    })
  )

  const ids = pickQuestions(pool, { size: 7, now: 10 ** 12 })
  const years = new Set(
    ids.map((id) => pool.find((c) => c.id === id)!.examYear)
  )

  assert.equal(years.size, 7)
})

test('mistura de variantes: as sem variante só completam', () => {
  const pool = [
    ...Array.from({ length: 5 }, (_, i) => cand(`a${i}`)),
    ...Array.from({ length: 5 }, (_, i) =>
      cand(`x${i}`, { variant: null })
    )
  ]

  const ids = pickQuestions(pool, {
    size: 8,
    now: 10 ** 12,
    wantsVariant: true
  })

  assert.equal(ids.length, 8)
  assert.equal(ids.filter((id) => id.startsWith('a')).length, 5)

  const only = pickQuestions(pool, {
    size: 4,
    now: 10 ** 12,
    wantsVariant: true
  })

  assert.ok(only.every((id) => id.startsWith('a')))
})

test('baralhar: certa não fica sempre na mesma letra nem na ordem escrita', () => {
  const opts = ['a', 'b', 'c', 'd'].map((id, i) => ({
    id,
    isFixed: false,
    isCorrect: i === 0
  }))

  const shuffler = new OptionShuffler()
  const positions: number[] = []

  for (let q = 0; q < 40; q++) {
    const order = shuffler.order(opts)

    assert.notDeepEqual(order, ['a', 'b', 'c', 'd'])
    assert.deepEqual([...order].sort(), ['a', 'b', 'c', 'd'])

    positions.push(order.indexOf('a'))
  }

  for (let i = 2; i < positions.length; i++) {
    assert.ok(
      !(
        positions[i] === positions[i - 1] &&
        positions[i] === positions[i - 2]
      ),
      'três iguais seguidas'
    )
  }

  const counts = [0, 1, 2, 3].map(
    (p) => positions.filter((x) => x === p).length
  )

  assert.ok(
    Math.max(...counts) <= 14 && Math.min(...counts) >= 6,
    `distribuição ${counts}`
  )
})

test('baralhar: opções fixas ficam no sítio', () => {
  const opts = [
    { id: 'a', isFixed: false, isCorrect: true },
    { id: 'b', isFixed: false, isCorrect: false },
    { id: 'c', isFixed: false, isCorrect: false },
    { id: 'n', isFixed: true, isCorrect: false }
  ]

  const shuffler = new OptionShuffler()

  for (let i = 0; i < 30; i++) {
    assert.equal(shuffler.order(opts)[3], 'n')
  }
})