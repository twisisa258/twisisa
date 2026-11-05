import { pool } from '@/lib/db'

export const INSTITUTION_KINDS = [
  { value: 'universidade', label: 'Universidade' },
  { value: 'instituto', label: 'Instituto' },
  { value: 'academia', label: 'Academia' },
] as const

export type InstitutionKind = (typeof INSTITUTION_KINDS)[number]['value']

export function kindLabel(value: string) {
  return INSTITUTION_KINDS.find((kind) => kind.value === value)?.label ?? value
}

export type InstitutionRow = {
  id: string
  shortName: string
  name: string
  kind: string
  description: string | null
  logoUrl: string | null
  city: string | null
  province: string | null
  active: boolean
  sortOrder: number
  showWhenEmpty: boolean
  contentCount: number
  courseCount: number
  questionCount: number
  studentCount: number
}

// Conteúdos hoje = materiais publicados cuja instituição (texto livre) coincide com a sigla.
// Quando os exames e as questões existirem (fases 2 e 3), passam a ligar-se por id e entram nesta contagem.
export async function listInstitutions(): Promise<InstitutionRow[]> {
  const result = await pool.query(`
    SELECT i.id, i.short_name, i.name, i.kind, i.description, i.logo_url, i.city, i.province, i.active, i.sort_order, i.show_when_empty,
      (SELECT count(*)::int FROM academic_materials m WHERE m.status = 'approved' AND lower(m.institution_name) = lower(i.short_name)) AS content_count,
      (SELECT count(*)::int FROM courses c WHERE c.institution_id = i.id AND c.active) AS course_count,
      (SELECT count(*)::int FROM questions q WHERE q.institution_id = i.id AND q.status = 'publicada') AS question_count,
      (SELECT count(*)::int FROM student_profiles p WHERE p.institution_id = i.id) AS student_count
    FROM institutions i
    ORDER BY i.sort_order, i.short_name
  `)
  return result.rows.map((row) => ({
    id: row.id,
    shortName: row.short_name,
    name: row.name,
    kind: row.kind,
    description: row.description,
    logoUrl: row.logo_url,
    city: row.city,
    province: row.province,
    active: row.active,
    sortOrder: row.sort_order,
    showWhenEmpty: row.show_when_empty,
    contentCount: row.content_count,
    courseCount: row.course_count,
    questionCount: row.question_count,
    studentCount: row.student_count,
  }))
}

// Regra do produto: o aluno vê instituições activas com materiais publicados, com cursos (para escolher o curso) ou marcadas como visíveis mesmo vazias.
export function isVisibleToStudents(institution: Pick<InstitutionRow, 'active' | 'contentCount' | 'courseCount' | 'showWhenEmpty'>) {
  return institution.active && (institution.contentCount > 0 || institution.courseCount > 0 || institution.showWhenEmpty)
}

export async function listStudentInstitutions() {
  return (await listInstitutions()).filter(isVisibleToStudents)
}
