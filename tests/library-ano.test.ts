import assert from 'node:assert/strict'
import { test } from 'node:test'
import { groupByYear } from '@/lib/library-shared'

test('agrupa por ano, do mais recente para o mais antigo, com os sem ano no fim', () => {
  const items = [{ id: 'a', year: 2026 }, { id: 'b', year: null }, { id: 'c', year: 2027 }, { id: 'd', year: 2026 }]
  const groups = groupByYear(items)
  assert.deepEqual(groups.map((group) => group.year), [2027, 2026, null])
  assert.deepEqual(groups[1].items.map((item) => item.id), ['a', 'd'])
})

test('sem materiais não há grupos', () => {
  assert.deepEqual(groupByYear([]), [])
})
