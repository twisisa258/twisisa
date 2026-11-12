import { pool } from '@/lib/db'

// Preferência do aluno: ver ou não as sugestões do plano Plus (cartão ao entrar e faixa). Definições, «Plano».
// Coluna `student_profiles.plus_suggestions` (migração «plus_sugestoes»). Sem a coluna ou sem linha, vale o valor por defeito: ligado.

export async function sugestoesPlusAtivas(userId: string): Promise<boolean> {
  try {
    const result = await pool.query<{ plus_suggestions: boolean | null }>(`SELECT plus_suggestions FROM student_profiles WHERE user_id = $1`, [userId])
    return result.rows[0]?.plus_suggestions !== false
  } catch {
    return true
  }
}

export async function definirSugestoesPlus(userId: string, ligado: boolean): Promise<void> {
  const result = await pool.query(`UPDATE student_profiles SET plus_suggestions = $2, updated_at = now() WHERE user_id = $1`, [userId, ligado])
  if (result.rowCount === 0) {
    await pool.query(
      `INSERT INTO student_profiles (user_id, plus_suggestions) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET plus_suggestions = EXCLUDED.plus_suggestions`,
      [userId, ligado],
    )
  }
}
