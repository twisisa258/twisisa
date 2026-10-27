import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  try {
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    console.log('Tabelas existentes:')
    console.table(tables.rows)

    const history = await pool.query(`
      SELECT to_regclass('public._migrations') AS history_table
    `)

    if (history.rows[0].history_table) {
      const migrations = await pool.query(
        'SELECT id, name, applied_at FROM "_migrations" ORDER BY id'
      )
      console.log('Histórico de migrações:')
      console.table(migrations.rows)
    }
  } finally {
    await pool.end()
  }
}

main().catch(console.error)
