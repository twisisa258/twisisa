import { pool } from '@/lib/db'

// Apaga tudo o que é de um utilizador, numa só transação: se alguma coisa falhar, não se apaga nada.
// Em vez de uma lista de tabelas (que ficava desatualizada a cada migração), procura na base todas as tabelas com uma coluna
// `user_id` (ou `userId`, as do início de sessão) e apaga as linhas dessa pessoa; o que depende delas cai por `ON DELETE CASCADE`.
// Se uma tabela estiver presa a outra sem cascata, tenta-se de novo depois de a outra ser apagada (até 6 voltas).
// Por último apaga-se o próprio utilizador. A foto no Cloudinary e eventuais cópias de segurança ficam de fora.

const aspas = (nome: string) => `"${nome.replace(/"/g, '""')}"`

export async function apagarUtilizador(userId: string, email: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const colunas = await client.query<{ tabela: string; coluna: string }>(
      `SELECT c.table_name AS tabela, c.column_name AS coluna
         FROM information_schema.columns c
         JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
        WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND c.column_name IN ('user_id', 'userId') AND c.table_name <> 'user'`,
    )
    let pendentes = colunas.rows
    for (let volta = 0; volta < 6 && pendentes.length > 0; volta++) {
      const falhadas: typeof pendentes = []
      for (const { tabela, coluna } of pendentes) {
        await client.query('SAVEPOINT apagar')
        try {
          await client.query(`DELETE FROM ${aspas(tabela)} WHERE ${aspas(coluna)} = $1`, [userId])
          await client.query('RELEASE SAVEPOINT apagar')
        } catch (error) {
          await client.query('ROLLBACK TO SAVEPOINT apagar')
          if ((error as { code?: string }).code !== '23503') throw error
          falhadas.push({ tabela, coluna })
        }
      }
      if (falhadas.length === pendentes.length) break
      pendentes = falhadas
    }
    if (pendentes.length > 0) throw new Error(`Tabelas que não deixaram apagar: ${pendentes.map((item) => item.tabela).join(', ')}`)
    await client.query(`DELETE FROM verification WHERE identifier = $1`, [email])
    await client.query(`DELETE FROM "user" WHERE id = $1`, [userId])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}
