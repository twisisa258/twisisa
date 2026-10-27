import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const migrationsDir = path.join(process.cwd(), 'database/migrations')

async function main() {
  const command = process.argv[2] ?? 'up'
  const client = await pool.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_migrations" (
        "id" integer PRIMARY KEY,
        "name" text NOT NULL UNIQUE,
        "applied_at" timestamptz NOT NULL DEFAULT now()
      )
    `)

    const result = await client.query<{ name: string }>(
      'SELECT name FROM "_migrations" ORDER BY id'
    )

    const applied = new Set(result.rows.map(row => row.name))
    const files = (await readdir(migrationsDir))
      .filter(file => /^\d+_.+\.sql$/.test(file))
      .sort()

    if (command === 'status') {
      for (const file of files) {
        console.log(`${applied.has(file) ? '[APLICADA]' : '[PENDENTE]'} ${file}`)
      }

      if (files.length === 0) console.log('Nenhuma migração encontrada.')
      return
    }

    if (command !== 'up') {
      throw new Error(`Comando desconhecido: ${command}. Usa "up" ou "status".`)
    }

    for (const file of files) {
      if (applied.has(file)) continue

      const id = Number(file.split('_', 1)[0])

      if (!Number.isSafeInteger(id)) {
        throw new Error(`Nome de migração inválido: ${file}`)
      }

      await client.query('BEGIN')

      try {
        await client.query(await readFile(path.join(migrationsDir, file), 'utf8'))
        await client.query(
          'INSERT INTO "_migrations" ("id", "name") VALUES ($1, $2)',
          [id, file]
        )
        await client.query('COMMIT')
        console.log(`[APLICADA] ${file}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }

    console.log('Migrações concluídas.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(error => {
  console.error('[MIGRATION] Erro:', error)
  process.exitCode = 1
})
