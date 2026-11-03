import { pool } from '@/lib/db'
import { uniqueCombos, type Combo, type ComboOptionRow } from '@/lib/combinacoes-pure'

// Combinações de provas do curso e disciplinas do aluno (só servidor). Tudo vem das tabelas de cursos, geridas no admin.

export async function getCourseCombos(courseId: string): Promise<Combo[]> {
  const result = await pool.query(
    `SELECT o.id AS option_id, o.sort_order, p.id AS paper_id, s.id AS subject_id, s.name AS subject_name, p.variant
     FROM course_exam_options o
     JOIN course_exam_option_papers op ON op.option_id = o.id
     JOIN exam_papers p ON p.id = op.paper_id
     JOIN library_subjects s ON s.id = p.subject_id
     WHERE o.course_id = $1
     ORDER BY o.sort_order, o.id`,
    [courseId],
  )
  const rows = new Map<string, ComboOptionRow>()
  for (const row of result.rows) {
    const entry = rows.get(row.option_id) ?? { optionId: row.option_id as string, sortOrder: row.sort_order as number, papers: [] }
    entry.papers.push({ paperId: row.paper_id as string, subjectId: row.subject_id as string, subjectName: row.subject_name as string, variant: (row.variant as string) ?? '' })
    rows.set(row.option_id, entry)
  }
  return uniqueCombos([...rows.values()])
}

/** Disciplinas da combinação escolhida pelo aluno. null = sem combinação (o Simulador mostra tudo). */
export async function getStudentSubjectIds(userId: string): Promise<string[] | null> {
  const result = await pool.query(
    `SELECT DISTINCT p.subject_id
     FROM student_profiles sp
     JOIN course_exam_option_papers op ON op.option_id = sp.target_option_id
     JOIN exam_papers p ON p.id = op.paper_id
     WHERE sp.user_id = $1`,
    [userId],
  )
  return result.rows.length > 0 ? result.rows.map((row) => row.subject_id as string) : null
}
