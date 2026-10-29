import test from 'node:test'
import assert from 'node:assert/strict'
import { avatarUrl, isProvince, profileSteps, publicName } from '../lib/perfil'
import { parsePeriod } from '../lib/ranking'

test('publicName: primeiro nome e inicial do último, nunca o nome completo', () => {
  assert.equal(publicName('Amélia Maria Matola'), 'Amélia M.')
  assert.equal(publicName('  tomás   chongo '), 'tomás C.')
  assert.equal(publicName('Lídia'), 'Lídia')
  assert.equal(publicName('   '), 'Estudante')
})

test('avatarUrl: só transforma URLs do Cloudinary', () => {
  assert.equal(avatarUrl(null), null)
  assert.equal(avatarUrl('https://res.cloudinary.com/x/image/upload/v1/a.jpg', 100), 'https://res.cloudinary.com/x/image/upload/c_fill,g_face,w_100,h_100,f_auto,q_auto/v1/a.jpg')
  assert.equal(avatarUrl('https://outro.site/a.jpg'), 'https://outro.site/a.jpg')
  assert.equal(avatarUrl('não é url'), null)
})

test('profileSteps: admissão pede instituição e curso; o telefone não conta', () => {
  const base = { image: null, nickname: null, province: null, school: null, track: null, institutionId: null, targetCourse: null }
  assert.deepEqual(profileSteps(base).map((s) => s.key), ['foto', 'nickname', 'escola', 'percurso'])
  const adm = profileSteps({ ...base, track: 'admissao', image: 'x', nickname: 'a', province: 'Gaza', school: 'E', institutionId: 'uem' })
  assert.deepEqual(adm.filter((s) => !s.done).map((s) => s.key), ['curso'])
  assert.equal(profileSteps({ ...base, track: '12' }).length, 4)
})

test('isProvince e parsePeriod', () => {
  assert.equal(isProvince('Gaza'), true)
  assert.equal(isProvince('Atlantis'), false)
  assert.equal(parsePeriod('geral'), 'geral')
  assert.equal(parsePeriod('x'), 'semana')
  assert.equal(parsePeriod(undefined), 'semana')
})
