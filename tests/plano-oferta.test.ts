import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FRASE_ELIMINAR, PLANO, POUPA_PROMO_MT, PRECO_PROMO_MT, fraseConfere, mostrarCartaoOferta, mostrarFaixaOferta, varianteDoBloco } from '../lib/plano'

const agora = new Date('2026-11-10T12:00:00Z')
const dias = (n: number) => new Date(agora.getTime() - n * 86_400_000)

test('promoção do primeiro mês: 60 MT, poupa 137 MT', () => {
  assert.equal(PRECO_PROMO_MT, 60)
  assert.equal(POUPA_PROMO_MT, PLANO.precoMt - 60)
  assert.equal(POUPA_PROMO_MT, 137)
})

test('bloco do menu: ativo com Plus; A na primeira semana; B depois; nada sem pagamento', () => {
  assert.equal(varianteDoBloco({ plus: true, criadaEm: dias(100), agora, pagamentoAtivo: false }), 'ativo')
  assert.equal(varianteDoBloco({ plus: false, criadaEm: dias(1), agora, pagamentoAtivo: false }), null)
  assert.equal(varianteDoBloco({ plus: false, criadaEm: dias(1), agora, pagamentoAtivo: true }), 'a')
  assert.equal(varianteDoBloco({ plus: false, criadaEm: dias(7), agora, pagamentoAtivo: true }), 'a')
  assert.equal(varianteDoBloco({ plus: false, criadaEm: dias(8), agora, pagamentoAtivo: true }), 'b')
  assert.equal(varianteDoBloco({ plus: false, criadaEm: dias(1).getTime(), agora, pagamentoAtivo: true }), 'a')
})

test('cartão de oferta só antes de qualquer atividade do dia; faixa sempre que há oferta', () => {
  const base = { plus: false, sugestoes: true, pagamentoAtivo: true }
  assert.equal(mostrarCartaoOferta({ ...base, respondidasHoje: 0 }), true)
  assert.equal(mostrarCartaoOferta({ ...base, respondidasHoje: 3 }), false)
  assert.equal(mostrarCartaoOferta({ ...base, respondidasHoje: 0, plus: true }), false)
  assert.equal(mostrarCartaoOferta({ ...base, respondidasHoje: 0, sugestoes: false }), false)
  assert.equal(mostrarCartaoOferta({ ...base, respondidasHoje: 0, pagamentoAtivo: false }), false)
  assert.equal(mostrarFaixaOferta(base), true)
  assert.equal(mostrarFaixaOferta({ ...base, plus: true }), false)
  assert.equal(mostrarFaixaOferta({ ...base, sugestoes: false }), false)
  assert.equal(mostrarFaixaOferta({ ...base, pagamentoAtivo: false }), false)
})

test('eliminar conta: a frase tem de ser a frase toda', () => {
  assert.equal(FRASE_ELIMINAR, 'eliminar minha conta')
  assert.equal(fraseConfere('eliminar minha conta'), true)
  assert.equal(fraseConfere('  Eliminar   MINHA conta '), true)
  assert.equal(fraseConfere('eliminar minha'), false)
  assert.equal(fraseConfere('eliminar minha conta!'), false)
  assert.equal(fraseConfere(''), false)
})
