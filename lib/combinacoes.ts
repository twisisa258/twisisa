import { pool } from '@/lib/db'
import { decideGate, uniqueCombos, type Combo, type ComboOptionRow, type Gate } from '@/lib/combinacoes-pure'
import { getCourseSubjects, type CourseSubject } from '@/lib/target-course'

// Combinações de provas do curso, disciplinas do aluno e bloqueio «escolhe o curso primeiro» (só servidor).
// Tudo vem das tabelas de cursos, geridas no admin. A coluna target_option_id vem da migração 0031: se faltar, nada rebenta,
// a aplicação segue sem restringir as disciplinas (e regista o aviso).

const isMissingColumn = (error: unknown) => (error as { code?: string } | null)?.code === '42703'
const warnMissing = () => console.error('[CURSO] falta a coluna student_profiles.target_option_id: corre `npm run migrate` (migração 0031).')

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

export async function getStudentOptionId(userId: string): Promise<string | null> {
  try {
    const result = await pool.query(`SELECT target_option_id FROM student_profiles WHERE user_id = $1`, [userId])
    return (result.rows[0]?.target_option_id as string | null) ?? null
  } catch (error) {
    if (isMissingColumn(error)) { warnMissing(); return null }
    throw error
  }
}

export async function setStudentOption(userId: string, optionId: string | null) {
  try {
    await pool.query(`UPDATE student_profiles SET target_option_id = $2, updated_at = now() WHERE user_id = $1`, [userId, optionId])
  } catch (error) {
    if (isMissingColumn(error)) return warnMissing()
    throw error
  }
}

/** Disciplinas da combinação escolhida. A opção só vale se for do curso atual (mudar de curso invalida a antiga). null = sem combinação. */
export async function getStudentSubjectIds(userId: string): Promise<string[] | null> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT p.subject_id
       FROM student_profiles sp
       JOIN course_exam_options o ON o.id = sp.target_option_id AND o.course_id = sp.target_course_id
       JOIN course_exam_option_papers op ON op.option_id = o.id
       JOIN exam_papers p ON p.id = op.paper_id
       WHERE sp.user_id = $1`,
      [userId],
    )
    return result.rows.length > 0 ? result.rows.map((row) => row.subject_id as string) : null
  } catch (error) {
    if (isMissingColumn(error)) { warnMissing(); return null }
    throw error
  }
}

/** Disciplinas das provas do aluno, com peso: as da combinação escolhida ou, sem ela, as de todo o curso. */
export async function getStudentCourseSubjects(userId: string, courseId: string): Promise<CourseSubject[]> {
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, max(op.weight)::int AS weight
       FROM student_profiles sp
       JOIN course_exam_options o ON o.id = sp.target_option_id AND o.course_id = $2
       JOIN course_exam_option_papers op ON op.option_id = o.id
       JOIN exam_papers p ON p.id = op.paper_id
       JOIN library_subjects s ON s.id = p.subject_id
       WHERE sp.user_id = $1
       GROUP BY s.id, s.name
       ORDER BY max(op.weight) DESC, s.name`,
      [userId, courseId],
    )
    if (result.rows.length > 0) return result.rows.map((row) => ({ id: row.id as string, name: row.name as string, weight: row.weight as number }))
  } catch (error) {
    if (!isMissingColumn(error)) throw error
    warnMissing()
  }
  return getCourseSubjects(courseId)
}

/**
 * Falta escolher curso (ou a combinação de provas)? Enquanto faltar, nada de prática. Nunca lança: se a base de dados falhar,
 * não bloqueia o aluno.
 */
export async function getCourseGate(userId: string): Promise<Gate> {
  try {
    const profile = (
      await pool.query(
        `SELECT sp.track, sp.institution_id, sp.target_course_id,
                EXISTS (SELECT 1 FROM courses c WHERE c.id = sp.target_course_id AND c.active AND c.institution_id = sp.institution_id) AS course_ok,
                EXISTS (SELECT 1 FROM course_exam_options o WHERE o.id = sp.target_option_id AND o.course_id = sp.target_course_id) AS option_ok,
                EXISTS (SELECT 1 FROM courses c WHERE c.institution_id = sp.institution_id AND c.active) AS has_courses
         FROM student_profiles sp WHERE sp.user_id = $1`,
        [userId],
      )
    ).rows[0]
    if (!profile) return { need: null, courseId: null, auto: null }
    const courseId = profile.course_ok ? (profile.target_course_id as string) : null
    const combos = courseId && !profile.option_ok ? await getCourseCombos(courseId) : []
    const gate = decideGate({ track: profile.track, institutionId: profile.institution_id, courseId, optionOk: profile.option_ok === true, institutionHasCourses: profile.has_courses === true, combos })
    if (gate.auto) {
      await setStudentOption(userId, gate.auto)
      return { need: null, courseId: gate.courseId, auto: null }
    }
    return gate
  } catch (error) {
    if (isMissingColumn(error)) warnMissing()
    else console.error('[CURSO] bloqueio', error)
    return { need: null, courseId: null, auto: null }
  }
}
