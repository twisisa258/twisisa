import assert from 'node:assert/strict'
import { test } from 'node:test'
import { examLabel, groupCourses, practiceLabel, searchCourses, subjectHue } from '../lib/exames-ui'

test('cor da disciplina: estável e dentro do círculo de cores', () => {
  assert.equal(subjectHue('portugues'), subjectHue('portugues'))
  for (const slug of ['matematica', 'fisica', 'quimica', 'biologia', 'ingles', '']) {
    const hue = subjectHue(slug)
    assert.ok(hue >= 0 && hue < 360)
  }
})

test('etiqueta do exame sem o prefixo repetido', () => {
  assert.equal(examLabel('Exame de admissão de Matemática UEM 2023 (I)', 'UEM', 2023), '2023 (I)')
  assert.equal(examLabel('Exame de admissão de Física UEM 2022', 'UEM', 2022), '2022')
  assert.equal(examLabel('Prova antiga de Química', 'UEM', 2019), '2019')
  assert.equal(examLabel('Exame de admissão de Química', 'UEM', null), 'Química')
})

test('botão de praticar: nomes compridos ficam só «Praticar»', () => {
  assert.equal(practiceLabel('Português'), 'Praticar Português')
  assert.equal(practiceLabel('Geografia e História de Moçambique'), 'Praticar')
})

test('cursos: grupos por faculdade e pesquisa sem acentos', () => {
  const groups = groupCourses([
    { name: 'Direito', unit: 'Faculdade de Direito' },
    { name: 'Biologia', unit: 'Faculdade de Ciências' },
    { name: 'Química', unit: 'Faculdade de Ciências' },
    { name: 'Curso solto', unit: null },
  ])
  assert.deepEqual(groups.map((g) => g.unit), ['Faculdade de Ciências', 'Faculdade de Direito', 'Outros cursos'])
  assert.deepEqual(searchCourses(groups, 'quimica'), [{ name: 'Química', unit: 'Faculdade de Ciências' }])
  assert.equal(searchCourses(groups, 'ciencias').length, 2)
  assert.equal(searchCourses(groups, '   ').length, 0)
})
