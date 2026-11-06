import assert from 'node:assert/strict'
import { test } from 'node:test'
import { examHeading, parseKeyTopics, pdfSafe, slugify, wrapLines } from '../lib/exames-pure'

test('endereços das instituições e disciplinas', () => {
  assert.equal(slugify('UniPúnguè'), 'unipungue')
  assert.equal(slugify('UEM'), 'uem')
  assert.equal(slugify('Educação Visual'), 'educacao-visual')
})

const raw = `Claro:
@@T 1
titulo: Funções e gráficos
@@RESUMO
Estuda domínio, contradomínio e $zeros$ das funções.
Treina a leitura de gráficos.
@@DICAS
Desenha sempre o gráfico.
@@FIM
@@T 2
titulo: Curto
@@RESUMO
pouco
@@FIM
@@T 3
titulo: Limites e derivadas
@@RESUMO
Aprende os limites notáveis e as regras de derivação em contexto de exame.
@@FIM`
test('lê os temas do Jonas e renumera', () => {
  const topics = parseKeyTopics(raw)
  assert.deepEqual(topics.map((t) => [t.position, t.title]), [[1, 'Funções e gráficos'], [2, 'Limites e derivadas']])
  assert.equal(topics[0].summary, 'Estuda domínio, contradomínio e zeros das funções.\nTreina a leitura de gráficos.')
  assert.equal(topics[0].tips, 'Desenha sempre o gráfico.')
  assert.deepEqual(parseKeyTopics('sem marcas'), [])
})

test('texto seguro para o PDF', () => {
  assert.equal(pdfSafe('Função – “limite” → ∞'), 'Função - "limite" -> ')
  assert.equal(pdfSafe('çãé'), 'çãé')
})

test('quebra de linhas', () => {
  const lines = wrapLines('um dois três quatro cinco\n\nseis', 12, (s) => s.length)
  assert.deepEqual(lines, ['um dois três', 'quatro cinco', '', 'seis'])
})

test('título do exame para o Google', () => {
  assert.equal(examHeading({ subject: 'Matemática', institution: 'UEM', year: 2023, title: 'Exame de Matemática II 2023' }), 'Exame de admissão de Matemática UEM 2023 (II)')
  assert.equal(examHeading({ subject: null, institution: 'UEM', year: 2023, title: 'Qualquer' }), 'Qualquer')
})
