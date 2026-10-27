import { pool } from '@/lib/db'

export const VARIANT_DIFFICULTIES = [
  { value: 'facil', label: 'Fácil' },
  { value: 'media', label: 'Média' },
  { value: 'dificil', label: 'Difícil' },
] as const
export const variantDifficultyLabel = (value: string) => VARIANT_DIFFICULTIES.find((item) => item.value === value)?.label ?? value

export type VariantRow = { id: string; name: string; subjectId: string; subjectName: string; difficulty: string; active: boolean; sortOrder: number; inUse: number }

/** Variantes de todas as disciplinas (Admin → Variantes e formulário de questões). `inUse` = questões que a usam. */
export async function listVariants(): Promise<VariantRow[]> {
  const result = await pool.query(`
    SELECT v.id, v.name, v.subject_id, s.name AS subject_name, v.difficulty, v.active, v.sort_order,
      (SELECT count(*)::int FROM questions q WHERE q.subject_id = v.subject_id AND q.variant = v.name) AS in_use
    FROM subject_variants v JOIN library_subjects s ON s.id = v.subject_id
    ORDER BY s.name, v.sort_order, v.name
  `)
  return result.rows.map((r) => ({ id: r.id, name: r.name, subjectId: r.subject_id, subjectName: r.subject_name, difficulty: r.difficulty, active: r.active, sortOrder: r.sort_order, inUse: r.in_use }))
}
