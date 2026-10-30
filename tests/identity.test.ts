import test from 'node:test'
import assert from 'node:assert/strict'
import { ageOn, checkBirth, daysInMonth, isBirthday, maputoDay, passwordStrength, provisionalName, safeNext, suggestEmail, validateEmail, validateName, validatePassword } from '../lib/identity'
import { addDays, computeStreak, weekStart } from '../lib/study-calc'

// 30/10/2026, 10:00 em Maputo
const NOW = new Date('2026-10-30T08:00:00Z')

test('maputoDay usa o fuso de Maputo (CAT, UTC+2), não o do servidor', () => {
  assert.deepEqual(maputoDay(new Date('2026-10-30T22:30:00Z')), { year: 2026, month: 10, day: 31 })
  assert.deepEqual(maputoDay(new Date('2026-10-30T21:59:00Z')), { year: 2026, month: 10, day: 30 })
})

test('ageOn: idade completa no dia civil', () => {
  assert.equal(ageOn({ year: 2013, month: 10, day: 30 }, { year: 2026, month: 10, day: 30 }), 13)
  assert.equal(ageOn({ year: 2013, month: 10, day: 31 }, { year: 2026, month: 10, day: 30 }), 12)
})

test('checkBirth: recusa inválida, futura, absurda e menor de 13; marca menores de 18', () => {
  assert.equal(checkBirth({ year: 2010, month: 2, day: 30 }, NOW).ok, false)
  assert.equal(checkBirth({ year: 'x', month: 1, day: 1 }, NOW).ok, false)
  const future = checkBirth({ year: 2027, month: 1, day: 1 }, NOW)
  assert.equal(future.ok === false && future.code, 'future')
  const old = checkBirth({ year: 1900, month: 1, day: 1 }, NOW)
  assert.equal(old.ok === false && old.code, 'too_old')
  const young = checkBirth({ year: 2013, month: 10, day: 31 }, NOW)
  assert.equal(young.ok === false && young.code, 'under_age')
  const thirteen = checkBirth({ year: 2013, month: 10, day: 30 }, NOW)
  assert.equal(thirteen.ok && thirteen.age, 13)
  assert.equal(thirteen.ok && thirteen.minor, true)
  const adult = checkBirth({ year: 2008, month: 10, day: 30 }, NOW)
  assert.equal(adult.ok && adult.age, 18)
  assert.equal(adult.ok && adult.minor, false)
  const sixteen = checkBirth({ year: 2010, month: 5, day: 5 }, NOW)
  assert.equal(sixteen.ok && sixteen.minor, true)
})

test('isBirthday: 29/02 celebra a 28/02 nos anos não bissextos', () => {
  assert.equal(isBirthday({ month: 10, day: 30 }, { year: 2026, month: 10, day: 30 }), true)
  assert.equal(isBirthday({ month: 2, day: 29 }, { year: 2027, month: 2, day: 28 }), true)
  assert.equal(isBirthday({ month: 2, day: 29 }, { year: 2028, month: 2, day: 28 }), false)
  assert.equal(isBirthday({ month: 2, day: 29 }, { year: 2028, month: 2, day: 29 }), true)
  assert.equal(isBirthday({ month: 3, day: 1 }, { year: 2027, month: 2, day: 28 }), false)
  assert.equal(daysInMonth(2028, 2), 29)
  assert.equal(daysInMonth(2026, 2), 28)
})

test('nome, e-mail e palavra-passe', () => {
  assert.ok(validateName('A'))
  assert.ok(validateName('12345'))
  assert.equal(validateName('  Amélia   Matola '), null)
  assert.ok(validateEmail('sem-arroba'))
  assert.ok(validateEmail('a@b'))
  assert.equal(validateEmail('Ana@Gmail.com'), null)
  assert.equal(suggestEmail('ana@gmail.con'), 'ana@gmail.com')
  assert.equal(suggestEmail('ana@gmail.com'), null)
  assert.ok(validatePassword('1234567'))
  assert.ok(validatePassword('12345678'))
  assert.ok(validatePassword('Password123'))
  assert.ok(validatePassword('aaaaaaaaaa'))
  assert.equal(validatePassword('bola-de-neve-77'), null)
  assert.equal(passwordStrength(''), 0)
  assert.ok(passwordStrength('bola-de-neve-77') >= 3)
  assert.equal(provisionalName('amelia.matola@gmail.com'), 'amelia matola')
})

test('safeNext só aceita caminhos internos', () => {
  assert.equal(safeNext('/aluno/ranking'), '/aluno/ranking')
  assert.equal(safeNext('//evil.com'), '/aluno')
  assert.equal(safeNext('https://evil.com'), '/aluno')
  assert.equal(safeNext('/sign-in'), '/aluno')
  assert.equal(safeNext(undefined), '/aluno')
})

test('sequência: conta dias seguidos e mantém-se viva até ao fim de hoje', () => {
  const today = { year: 2026, month: 10, day: 30 }
  assert.equal(computeStreak([], today), 0)
  assert.equal(computeStreak(['2026-10-30', '2026-10-29', '2026-10-28'], today), 3)
  assert.equal(computeStreak(['2026-10-29', '2026-10-28'], today), 2) // hoje ainda não estudou, ontem sim
  assert.equal(computeStreak(['2026-10-28'], today), 0)
  assert.equal(computeStreak(['2026-10-30', '2026-10-28'], today), 1)
  assert.deepEqual(addDays({ year: 2026, month: 3, day: 1 }, -1), { year: 2026, month: 2, day: 28 })
  assert.deepEqual(weekStart({ year: 2026, month: 10, day: 30 }), { year: 2026, month: 10, day: 26 }) // sexta -> segunda
  assert.deepEqual(weekStart({ year: 2026, month: 11, day: 1 }), { year: 2026, month: 10, day: 26 }) // domingo
})
