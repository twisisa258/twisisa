import { pool } from '@/lib/db'

// Curso alvo: lista de cursos da instituição e disciplinas das provas de cada curso (só servidor).

export type CourseOption = { id: string; name: string; unit: string | null }
export type CourseInfo = { id: string; name: string; unit: string | null; institutionId: string; institution: string }
export type CourseSubject = { id: string; name: string; weight: number }

export async function listInstitutionCourses(institutionId: string): Promise<CourseOption[]> {
  const result = await pool.query(
    `SELECT id, name, unit FROM courses WHERE institution_id = $1 AND active ORDER BY name, unit NULLS FIRST`,
    [institutionId],
  )
  return result.rows.map((row) => ({ id: row.id as string, name: row.name as string, unit: (row.unit as string | null) ?? null }))
}

export async function getCourse(courseId: string): Promise<CourseInfo | null> {
  const result = await pool.query(
    `SELECT c.id, c.name, c.unit, c.institution_id, i.short_name
     FROM courses c JOIN institutions i ON i.id = c.institution_id
     WHERE c.id = $1 AND c.active AND i.active`,
    [courseId],
  )
  const row = result.rows[0]
  return row ? { id: row.id, name: row.name, unit: row.unit ?? null, institutionId: row.institution_id, institution: row.short_name } : null
}

// Uma disciplina conta uma vez, com o maior peso que tem nas opções de exame do curso (laboral e pós-laboral).
export async function getCourseSubjects(courseId: string): Promise<CourseSubject[]> {
  const result = await pool.query(
    `SELECT s.id, s.name, max(op.weight)::int AS weight
     FROM course_exam_options o
     JOIN course_exam_option_papers op ON op.option_id = o.id
     JOIN exam_papers p ON p.id = op.paper_id
     JOIN library_subjects s ON s.id = p.subject_id
     WHERE o.course_id = $1
     GROUP BY s.id, s.name
     ORDER BY max(op.weight) DESC, s.name`,
    [courseId],
  )
  return result.rows.map((row) => ({ id: row.id as string, name: row.name as string, weight: row.weight as number }))
}
