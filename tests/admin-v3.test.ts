import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GRUPOS_ADMIN, hrefsRepetidos } from '../lib/admin-grupos'
import { adminOverview, adminSections } from '../lib/admin-sections'
import { motivosDaRevisao } from '../lib/revisao'

test('menu do admin: nenhum endereço em dois grupos e nenhuma secção fica de fora', () => {
  assert.deepEqual(hrefsRepetidos(GRUPOS_ADMIN), [])
  const agrupados = new Set(GRUPOS_ADMIN.flatMap((grupo) => grupo.hrefs))
  for (const item of [adminOverview, ...adminSections]) assert.ok(agrupados.has(item.href), `${item.href} não está em nenhum grupo`)
  for (const href of agrupados) assert.ok([adminOverview, ...adminSections].some((item) => item.href === href), `${href} não existe nas secções`)
})

test('menu do admin: o fluxo de conteúdo segue a ordem do trabalho', () => {
  const fluxo = GRUPOS_ADMIN.find((grupo) => grupo.id === 'fluxo')
  assert.deepEqual(fluxo?.hrefs, ['/admin/materiais', '/admin/importar', '/admin/revisao', '/admin/questoes'])
})

test('motivos da revisão: ordem fixa e só o que existe', () => {
  assert.equal(motivosDaRevisao({}), '')
  assert.equal(motivosDaRevisao({ sem_tema: 1, sem_ano: 2 }), '2 sem ano, 1 sem tema')
  assert.equal(motivosDaRevisao({ possivel_duplicada: 1, sem_variante: 3 }), '3 sem variante, 1 possível duplicada')
  assert.equal(motivosDaRevisao({ sem_ano: 0 }), '')
})
