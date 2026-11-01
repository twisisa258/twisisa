import test from 'node:test'
import assert from 'node:assert/strict'
import { inferFromPath, normalize, titleFromFilename, type InferCatalog } from '../lib/material-inference'

const catalog: InferCatalog = {
  categories: [{ slug: 'exames', name: 'Exames de admissão' }, { slug: 'fichas', name: 'Fichas de exercícios' }, { slug: 'resumos', name: 'Resumos' }],
  subjects: [{ id: 's-mat', name: 'Matemática' }, { id: 's-fis', name: 'Física' }, { id: 's-port', name: 'Português' }],
  levels: [{ id: 'l-10', name: '10.ª classe' }, { id: 'l-12', name: '12.ª classe' }, { id: 'l-sup', name: 'Ensino superior' }],
  institutions: [{ shortName: 'UEM', name: 'Universidade Eduardo Mondlane' }, { shortName: 'UP', name: 'Universidade Pedagógica' }],
}
const now = new Date('2026-10-31')

test('normalize: sem acentos e com espaços nas pontas', () => {
  assert.equal(normalize('Matemática_2023.pdf'), ' matematica 2023 pdf ')
})

test('título: sem extensão, sublinhados nem cópias', () => {
  assert.equal(titleFromFilename('exame_matematica_2023 (1).pdf'), 'Exame matematica 2023')
  assert.equal(titleFromFilename('resumo.PDF'), 'Resumo')
})

test('deteta tudo a partir de pastas e nome', () => {
  const r = inferFromPath('Matemática/UEM/2023/Exame de admissão 12ª classe.pdf', catalog, now)
  assert.deepEqual(r, { year: '2023', subject: 's-mat', institution: 'UEM', level: 'l-12', category: 'exames' })
})

test('o nome do ficheiro manda no ano; pastas servem de recurso', () => {
  assert.equal(inferFromPath('2021/exame 2023.pdf', catalog, now).year, '2023')
  assert.equal(inferFromPath('2021/exame.pdf', catalog, now).year, '2021')
  assert.equal(inferFromPath('exame 1850.pdf', catalog, now).year, undefined)
  assert.equal(inferFromPath('exame 20231.pdf', catalog, now).year, undefined)
})

test('palavras inteiras: «up» não aparece dentro de «group»', () => {
  assert.equal(inferFromPath('group work.pdf', catalog, now).institution, undefined)
  assert.equal(inferFromPath('Exame UP 2024.pdf', catalog, now).institution, 'UP')
})

test('categoria ambígua não é adivinhada', () => {
  assert.equal(inferFromPath('exames fichas.pdf', catalog, now).category, undefined)
  assert.equal(inferFromPath('Resumo de física.pdf', catalog, now).category, 'resumos')
  assert.equal(inferFromPath('sem pistas.pdf', catalog, now).subject, undefined)
})

test('classe por número e nível por nome', () => {
  assert.equal(inferFromPath('teste 10 classe.pdf', catalog, now).level, 'l-10')
  assert.equal(inferFromPath('apontamentos ensino superior.pdf', catalog, now).level, 'l-sup')
})

test('categorias reais: plural do catálogo, singular no ficheiro', () => {
  const real: InferCatalog = { ...catalog, categories: [{ slug: 'exames', name: 'Exames anteriores' }, { slug: 'fichas', name: 'Fichas de exercícios' }, { slug: 'livros', name: 'Livros e manuais' }, { slug: 'guias', name: 'Guias de estudo' }] }
  assert.equal(inferFromPath('Exame 2023.pdf', real, now).category, 'exames')
  assert.equal(inferFromPath('Ficha 3.pdf', real, now).category, 'fichas')
  assert.equal(inferFromPath('Manual de química.pdf', real, now).category, 'livros')
  assert.equal(inferFromPath('Guia.pdf', real, now).category, 'guias')
})
