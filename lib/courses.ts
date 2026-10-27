import { pool } from '@/lib/db'

export const PERIODS = [
  { value: 'laboral', label: 'Laboral' },
  { value: 'pos_laboral', label: 'Pós-laboral' },
] as const
export type Period = (typeof PERIODS)[number]['value']

// Variante da prova: I, II e III são provas diferentes da mesma disciplina (Matemática-I, Matemática-II...); «prática» e «escrita» são as de Música, Teatro e Aptidão Física.
export const VARIANTS = [
  { value: '', label: 'Sem variante' },
  { value: 'I', label: 'I' },
  { value: 'II', label: 'II' },
  { value: 'III', label: 'III' },
  { value: 'pratica', label: 'Prova prática' },
  { value: 'escrita', label: 'Prova escrita' },
] as const

// Educação Ambiental e Ensino de Filosofia têm 3 combinações em cada período (6 no total).
export const MAX_OPTIONS = 6
export const MAX_PAPERS = 3

export const isPeriod = (value: unknown): value is Period => PERIODS.some((item) => item.value === value)
export const isVariant = (value: unknown): value is (typeof VARIANTS)[number]['value'] => VARIANTS.some((item) => item.value === value)
export const periodLabel = (value: string) => PERIODS.find((item) => item.value === value)?.label ?? value

export function paperLabel(subject: string, variant: string) {
  if (variant === 'pratica') return `${subject} (prova prática)`
  if (variant === 'escrita') return `${subject} (prova escrita)`
  return variant ? `${subject}-${variant}` : subject
}

export type CoursePaper = { subjectId: string; subjectName: string; variant: string; weight: number }
export type CourseOption = { id: string; period: Period; papers: CoursePaper[] }
export type CourseRow = {
  id: string
  institutionId: string
  institutionShortName: string
  name: string
  unit: string | null
  campus: string | null
  active: boolean
  options: CourseOption[]
}

export async function listCourses(): Promise<CourseRow[]> {
  const result = await pool.query(`
    SELECT c.id, c.institution_id, i.short_name, c.name, c.unit, c.campus, c.active,
      COALESCE((
        SELECT json_agg(json_build_object('id', o.id, 'period', o.period, 'papers', COALESCE((
          SELECT json_agg(json_build_object('subjectId', s.id, 'subjectName', s.name, 'variant', p.variant, 'weight', cp.weight) ORDER BY cp.weight DESC, s.name)
          FROM course_exam_option_papers cp
          JOIN exam_papers p ON p.id = cp.paper_id
          JOIN library_subjects s ON s.id = p.subject_id
          WHERE cp.option_id = o.id
        ), '[]'::json)) ORDER BY (o.period = 'laboral') DESC, o.sort_order)
        FROM course_exam_options o WHERE o.course_id = c.id
      ), '[]'::json) AS options
    FROM courses c
    JOIN institutions i ON i.id = c.institution_id
    ORDER BY i.sort_order, i.short_name, c.unit NULLS LAST, c.name
  `)
  return result.rows.map((row) => ({
    id: row.id,
    institutionId: row.institution_id,
    institutionShortName: row.short_name,
    name: row.name,
    unit: row.unit,
    campus: row.campus,
    active: row.active,
    options: row.options as CourseOption[],
  }))
}

const percent = (papers: CoursePaper[]) => papers.map((p) => `${paperLabel(p.subjectName, p.variant)} ${p.weight}%`).join(' + ')

// Combinação de provas sem pesos (chave da vista «Por provas»).
export const comboKey = (papers: CoursePaper[]) => papers.map((p) => paperLabel(p.subjectName, p.variant)).sort((a, b) => a.localeCompare(b, 'pt')).join(' + ')

// Descreve as opções de um curso por período; períodos com as mesmas opções juntam-se numa só linha.
export function describeOptions(options: CourseOption[]) {
  const byPeriod = new Map<Period, string[]>()
  for (const option of options) byPeriod.set(option.period, [...(byPeriod.get(option.period) ?? []), percent(option.papers)])
  const lines: { periods: string; text: string }[] = []
  const done = new Set<Period>()
  for (const [period, texts] of byPeriod) {
    if (done.has(period)) continue
    const text = texts.join('  ou  ')
    const same = [...byPeriod].filter(([other, otherTexts]) => other !== period && otherTexts.join('  ou  ') === text).map(([other]) => other)
    const group = [period, ...same]
    group.forEach((item) => done.add(item))
    lines.push({ periods: group.map(periodLabel).join(' e '), text })
  }
  return lines
}

export type ComboGroup = { key: string; courses: { id: string; name: string; periods: Period[]; institution: string }[] }

export function groupByCombo(courses: CourseRow[]): ComboGroup[] {
  const map = new Map<string, Map<string, { id: string; name: string; periods: Set<Period>; institution: string }>>()
  for (const course of courses) {
    for (const option of course.options) {
      const key = comboKey(option.papers)
      const inner = map.get(key) ?? new Map()
      const entry = inner.get(course.id) ?? { id: course.id, name: course.name, periods: new Set<Period>(), institution: course.institutionShortName }
      entry.periods.add(option.period)
      inner.set(course.id, entry)
      map.set(key, inner)
    }
  }
  return [...map].map(([key, inner]) => ({ key, courses: [...inner.values()].map((c) => ({ ...c, periods: [...c.periods] })).sort((a, b) => a.name.localeCompare(b.name, 'pt')) })).sort((a, b) => b.courses.length - a.courses.length || a.key.localeCompare(b.key, 'pt'))
}
