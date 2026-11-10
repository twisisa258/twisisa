import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PLANO, dataCurta, dataLonga, diasRestantes, estadoDoPlano, formatarNumero, mesAno, operadoraDoNumero, operadoraPorId, progressoDoPeriodo, soDigitos } from '../lib/plano'

const dia = (n: number) => new Date(Date.UTC(2026, 10, 10) + n * 86_400_000)

test('estado do plano: gratuito, ativo e terminado', () => {
  const agora = dia(0)
  assert.equal(estadoDoPlano(undefined, null, agora), 'gratuito')
  assert.equal(estadoDoPlano('active', dia(5), agora), 'ativo')
  assert.equal(estadoDoPlano('trialing', null, agora), 'ativo')
  assert.equal(estadoDoPlano('active', dia(-1), agora), 'terminado')
  assert.equal(estadoDoPlano('canceled', dia(5), agora), 'terminado')
})

test('número: tira +258, espaços e limita a 9 dígitos', () => {
  assert.equal(soDigitos('+258 84 000 0000'), '840000000')
  assert.equal(soDigitos('00258840000000'), '840000000')
  assert.equal(soDigitos('84 000 00001234'), '840000000')
  assert.equal(formatarNumero('840000000'), '84 000 0000')
  assert.equal(formatarNumero('8'), '8')
  assert.equal(formatarNumero('84000'), '84 000')
})

test('operadora pelo prefixo', () => {
  assert.equal(operadoraDoNumero('84 123'), 'mpesa')
  assert.equal(operadoraDoNumero('85'), 'mpesa')
  assert.equal(operadoraDoNumero('+258 86 111 2222'), 'emola')
  assert.equal(operadoraDoNumero('87'), 'emola')
  assert.equal(operadoraDoNumero('82'), 'mkesh')
  assert.equal(operadoraDoNumero('83'), 'mkesh')
  assert.equal(operadoraDoNumero('8'), null)
  assert.equal(operadoraDoNumero('81'), null)
  assert.equal(operadoraPorId('mpesa')?.nome, 'M-Pesa')
  assert.equal(operadoraPorId('outra'), null)
  assert.equal(operadoraPorId(null), null)
})

test('dias restantes arredondam para cima e nunca ficam negativos', () => {
  const agora = dia(0)
  assert.equal(diasRestantes(null, agora), null)
  assert.equal(diasRestantes(new Date(agora.getTime() + 3_600_000), agora), 1)
  assert.equal(diasRestantes(dia(19), agora), 19)
  assert.equal(diasRestantes(dia(-2), agora), 0)
  assert.equal(progressoDoPeriodo(PLANO.diasPeriodo * 2), 1)
  assert.equal(progressoDoPeriodo(15), 0.5)
  assert.equal(progressoDoPeriodo(-3), 0)
})

test('datas na hora de Maputo', () => {
  const d = new Date('2026-12-10T10:00:00Z')
  assert.equal(dataCurta(d), '10/12/2026')
  assert.equal(dataLonga(d), '10 dez 2026')
  assert.equal(mesAno(d), 'dez 2026')
  // 23:30 UTC já é o dia seguinte em Maputo (UTC+2)
  assert.equal(dataCurta(new Date('2026-12-31T23:30:00Z')), '01/01/2027')
})
