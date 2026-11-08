import { pool } from '@/lib/db'

/** Questões publicadas no simulador (número real mostrado na página inicial). Em caso de falha devolve 0 e o número não aparece. */
export async function countPublishedQuestions(): Promise<number> {
  try {
    const result = await pool.query(`SELECT count(*)::int AS n FROM questions WHERE status = 'publicada'`)
    return (result.rows[0]?.n as number) ?? 0
  } catch (error) {
    console.error('[HOME] questões', error)
    return 0
  }
}
