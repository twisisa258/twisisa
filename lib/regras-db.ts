import { pool } from '@/lib/db'

/** Instituições onde há variantes (hoje só a UEM; a marca está em institutions.has_variants). */
export async function idsInstituicoesComVariantes(): Promise<string[]> {
  const result = await pool.query('SELECT id FROM institutions WHERE has_variants = true')
  return result.rows.map((row) => row.id as string)
}
