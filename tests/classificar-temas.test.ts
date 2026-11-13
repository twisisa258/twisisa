import test from 'node:test'
import assert from 'node:assert/strict'
import { lerTema, pedidoClassificador, sistemaClassificador } from '../lib/classificar-temas-pure'

const temas = [{ id: 't1', name: 'Funções' }, { id: 't2', name: 'Equações do 2º grau' }, { id: 't3', name: 'Limites' }]

test('lê o tema pelo nome, ignorando acentos e maiúsculas', () => {
  assert.equal(lerTema('funcoes', temas)?.id, 't1')
  assert.equal(lerTema('Tema: Limites', temas)?.id, 't3')
  assert.equal(lerTema('Limites\nporque…', temas)?.id, 't3')
})

test('na dúvida fica sem tema', () => {
  assert.equal(lerTema('NENHUM', temas), null)
  assert.equal(lerTema('', temas), null)
  assert.equal(lerTema('Geometria', temas), null)
  assert.equal(lerTema('Funções e Limites', temas), null)
})

test('o pedido leva só os temas da disciplina e as opções', () => {
  assert.match(sistemaClassificador('Matemática', temas), /- Equações do 2º grau/)
  assert.match(pedidoClassificador('Calcula $x$', ['1', '2']), /A\. 1\nB\. 2/)
})
