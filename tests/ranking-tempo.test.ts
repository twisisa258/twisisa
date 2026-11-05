import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reinicioDaSemana } from '@/lib/ranking-tempo'

// Maputo = UTC+2. 2026-11-05 é quinta-feira.
test('quinta-feira 12:00 em Maputo: faltam 3 dias e 12 horas', () => {
  const agora = Date.UTC(2026, 10, 5, 10, 0) // 12:00 CAT
  const r = reinicioDaSemana(agora)
  assert.equal(r.dias, 3)
  assert.equal(r.horas, 12)
  assert.equal(r.texto, 'Reinicia em 3 dias')
})

test('domingo à noite: faltam horas, não dias', () => {
  const agora = Date.UTC(2026, 10, 8, 18, 30) // domingo 20:30 CAT
  const r = reinicioDaSemana(agora)
  assert.equal(r.dias, 0)
  assert.equal(r.horas, 3)
  assert.equal(r.texto, 'Reinicia em 3 h')
})

test('segunda-feira logo depois da meia-noite: quase uma semana', () => {
  const agora = Date.UTC(2026, 10, 8, 22, 30) // segunda 00:30 CAT
  const r = reinicioDaSemana(agora)
  assert.equal(r.dias, 6)
  assert.equal(r.texto, 'Reinicia em 6 dias')
})
