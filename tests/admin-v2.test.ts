import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analisarLinha, modeloSessao, semAcentos, type ContextoImportacao } from '../lib/importacao-sessao'
import { descreverAcao } from '../lib/admin-notify-pure'
import { resumoImportacao } from '../lib/revisao'

const ctx = (extra: Partial<ContextoImportacao> = {}): ContextoImportacao => ({
  temas: new Map([['equacoes', 't1']]),
  variantes: new Map([['i', 'I'], ['ii', 'II']]),
  instituicaoTemVariantes: true,
  disciplinaTemVariantes: true,
  varianteSessao: 'I',
  ...extra,
})
const base = { statement: 'Quanto é 2+2?', option_a: '3', option_b: '4', correct: 'b', year: '2024', topic_name: 'Equações' }

test('uma linha completa entra pronta, sem revisão', () => {
  const linha = analisarLinha(base, ctx())
  assert.ok(linha.ok)
  if (linha.ok) { assert.deepEqual(linha.razoes, []); assert.equal(linha.topicId, 't1'); assert.equal(linha.variant, 'I'); assert.equal(linha.year, 2024) }
})

test('sem ano, sem tema e variante desconhecida: entra e vai para revisão', () => {
  const linha = analisarLinha({ ...base, year: '', topic_name: 'Inventado', variant: 'IV' }, ctx())
  assert.ok(linha.ok)
  if (linha.ok) {
    assert.deepEqual(linha.razoes, ['sem_ano', 'sem_tema', 'sem_variante'])
    assert.equal(linha.temaDesconhecido, true)
    assert.equal(linha.varianteDesconhecida, true)
    assert.ok(linha.notas.some((nota) => nota.includes('IV')))
  }
})

test('fora da UEM não há variante nem pedido de variante', () => {
  const linha = analisarLinha({ ...base, variant: 'II' }, ctx({ instituicaoTemVariantes: false, varianteSessao: null }))
  assert.ok(linha.ok)
  if (linha.ok) { assert.equal(linha.variant, null); assert.ok(!linha.razoes.includes('sem_variante')) }
})

test('ano inválido conta como sem ano', () => {
  const linha = analisarLinha({ ...base, year: '1800' }, ctx())
  assert.ok(linha.ok)
  if (linha.ok) { assert.ok(linha.razoes.includes('sem_ano')); assert.ok(linha.notas.some((nota) => nota.includes('1800'))) }
})

test('linhas impossíveis são rejeitadas', () => {
  assert.equal(analisarLinha({ ...base, statement: '' }, ctx()).ok, false)
  assert.equal(analisarLinha({ ...base, correct: 'z' }, ctx()).ok, false)
  assert.equal(analisarLinha({ ...base, option_b: '' }, ctx()).ok, false)
  assert.equal(analisarLinha({ ...base, correct: 'c' }, ctx()).ok, false)
  assert.equal(analisarLinha({ ...base, statement: '[EXEMPLO] Quanto é 2+2?' }, ctx()).ok, false)
})

test('o tema acha-se sem acentos nem maiúsculas', () => {
  assert.equal(semAcentos('  Equações '), 'equacoes')
})

test('o modelo traz o cabeçalho e exemplos marcados', () => {
  const modelo = modeloSessao()
  assert.ok(modelo.startsWith('statement,option_a'))
  assert.equal((modelo.match(/\[EXEMPLO\]/g) ?? []).length, 2)
})

test('o resumo da importação diz quantas precisam de revisão e porquê', () => {
  const resumo = resumoImportacao({ lidas: 40, importadas: 40, rejeitadas: 0, emRevisao: 10, porRazao: { sem_ano: 6, sem_tema: 3, sem_variante: 1 }, temaDesconhecido: 0, varianteDesconhecida: 1 })
  assert.equal(resumo.titulo, '40 de 40 questões importadas')
  assert.equal(resumo.nivel, 'aviso')
  assert.ok(resumo.corpo.includes('30 estão prontas'))
  assert.ok(resumo.corpo.includes('10 precisam de revisão (6 sem ano, 3 sem tema, 1 com variante desconhecida)'))
})

test('importação perfeita é um sucesso; sem nenhuma entrada é um erro', () => {
  assert.equal(resumoImportacao({ lidas: 5, importadas: 5, rejeitadas: 0, emRevisao: 0, porRazao: {}, temaDesconhecido: 0, varianteDesconhecida: 0 }).nivel, 'sucesso')
  assert.equal(resumoImportacao({ lidas: 5, importadas: 0, rejeitadas: 5, emRevisao: 0, porRazao: {}, temaDesconhecido: 0, varianteDesconhecida: 0 }).nivel, 'erro')
})

test('as ações do admin viram avisos legíveis', () => {
  assert.equal(descreverAcao('subject.update', 'subject', 'x', { name: 'Física' }).title, 'Disciplina alterada: Física')
  assert.equal(descreverAcao('topic.create', 'topic', 'x').title, 'Tema criado')
  assert.equal(descreverAcao('topic.delete', 'topic', 'x').level, 'aviso')
  assert.equal(descreverAcao('algo.estranho', 'coisa', null).title, 'Ação: algo.estranho')
})
