import type { PoolClient } from 'pg'

// A ordem nunca se escreve à mão: um item novo vai para o fim (n+1) e reorganiza-se com Subir/Descer.
// `table` e `scopeColumn` vêm sempre do código (nunca de input do utilizador).
export type OrderTable = 'library_categories' | 'library_levels' | 'topics' | 'subject_variants'

export async function nextOrder(client: Pick<PoolClient, 'query'>, table: OrderTable, scopeColumn?: 'subject_id', scopeValue?: string) {
  const result = scopeColumn
    ? await client.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM ${table} WHERE ${scopeColumn} = $1`, [scopeValue])
    : await client.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM ${table}`)
  return result.rows[0].n as number
}

// Troca a posição com a vizinha e renumera a lista (1..n), para não haver empates.
// Devolve false se o item não existe; se já está na ponta, não muda nada.
export async function moveWithin(client: PoolClient, table: OrderTable, id: string, direction: 'up' | 'down', scopeColumn?: 'subject_id') {
  let scopeValue: string | undefined
  if (scopeColumn) {
    const row = await client.query(`SELECT ${scopeColumn} AS scope FROM ${table} WHERE id = $1`, [id])
    if (!row.rowCount) return false
    scopeValue = row.rows[0].scope
  }
  const list = scopeColumn
    ? await client.query(`SELECT id FROM ${table} WHERE ${scopeColumn} = $1 ORDER BY sort_order, name, id FOR UPDATE`, [scopeValue])
    : await client.query(`SELECT id FROM ${table} ORDER BY sort_order, name, id FOR UPDATE`)
  const ids: string[] = list.rows.map((row) => row.id)
  const index = ids.indexOf(id)
  if (index === -1) return false
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= ids.length) return true
  ;[ids[index], ids[target]] = [ids[target], ids[index]]
  for (let position = 0; position < ids.length; position += 1) {
    await client.query(`UPDATE ${table} SET sort_order = $2 WHERE id = $1`, [ids[position], position + 1])
  }
  return true
}
