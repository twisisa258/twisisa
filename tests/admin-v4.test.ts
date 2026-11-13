import assert from 'node:assert/strict'
import { test } from 'node:test'
import { grupoDaSecao, grupoPorId } from '../lib/admin-grupos'
import { migalhasDe } from '../lib/admin-migalhas'

const secoes = [
  { href: '/admin/questoes', label: 'Banco de questões' },
  { href: '/admin/materiais', label: 'Materiais académicos' },
  { href: '/admin/temas', label: 'Temas' },
  { href: '/admin/temas-principais', label: 'Temas principais' },
  { href: '/admin/jonas', label: 'Jonas' },
]

test('migalhas: painel, grupo e secção', () => {
  assert.deepEqual(migalhasDe('/admin', secoes), [{ label: 'Painel' }])
  assert.deepEqual(migalhasDe('/admin/', secoes), [{ label: 'Painel' }])
  assert.deepEqual(migalhasDe('/admin/grupo/fluxo', secoes), [{ label: 'Administração', href: '/admin' }, { label: 'Fluxo de conteúdo' }])
  assert.deepEqual(migalhasDe('/admin/questoes', secoes), [{ label: 'Fluxo de conteúdo', href: '/admin/grupo/fluxo' }, { label: 'Banco de questões' }])
})

test('migalhas: subpáginas e secções com prefixo parecido', () => {
  assert.deepEqual(migalhasDe('/admin/questoes/nova', secoes), [
    { label: 'Fluxo de conteúdo', href: '/admin/grupo/fluxo' },
    { label: 'Banco de questões', href: '/admin/questoes' },
    { label: 'Nova' },
  ])
  assert.deepEqual(migalhasDe('/admin/materiais/abc123', secoes).at(-1), { label: 'Detalhe' })
  // /admin/temas-principais não pode cair em /admin/temas
  assert.deepEqual(migalhasDe('/admin/temas-principais', secoes), [{ label: 'Publicação', href: '/admin/grupo/publicacao' }, { label: 'Temas principais' }])
  assert.deepEqual(migalhasDe('/admin/temas', secoes), [{ label: 'Catálogo', href: '/admin/grupo/catalogo' }, { label: 'Temas' }])
  assert.deepEqual(migalhasDe('/admin/desconhecida', secoes), [{ label: 'Administração', href: '/admin' }])
})

test('grupos: só os que têm título têm página', () => {
  assert.equal(grupoPorId('painel'), undefined)
  assert.equal(grupoPorId('nao-existe'), undefined)
  assert.equal(grupoPorId('catalogo')?.titulo, 'Catálogo')
  assert.equal(grupoDaSecao('/admin/jonas')?.id, 'sistema')
})
