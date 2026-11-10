// Pequenas regras puras da página de disciplina (testadas em tests/exames-ui.test.ts).

const HUES = [215, 152, 28, 338, 268, 190, 92, 8] as const

/** Uma cor de identidade por disciplina: sempre a mesma para o mesmo endereço. */
export function subjectHue(slug: string): number {
  let hash = 0
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return HUES[hash % HUES.length]
}

/** «Exame de admissão de Matemática UEM 2023 (I)» → «2023 (I)». Sem ano no título, usa o ano da base ou o título inteiro. */
export function examLabel(heading: string, institutionShort: string, year: number | null): string {
  const marker = `${institutionShort} `
  const at = heading.indexOf(marker)
  const rest = at >= 0 ? heading.slice(at + marker.length).trim() : ''
  if (rest) return rest
  return year ? String(year) : heading.replace(/^Exame de admissão de /, '')
}

/** «Praticar Português»; nomes compridos ficam só «Praticar» (o botão não quebra o texto). */
export function practiceLabel(subjectName: string): string {
  return subjectName.length <= 14 ? `Praticar ${subjectName}` : 'Praticar'
}

export type CourseGroup = { unit: string; names: string[] }

/** Cursos agrupados pela faculdade ou escola (os maiores grupos primeiro; sem unidade vão para o fim). */
export function groupCourses(courses: { name: string; unit: string | null }[]): CourseGroup[] {
  const others = 'Outros cursos'
  const map = new Map<string, string[]>()
  for (const course of courses) {
    const unit = course.unit?.trim() || others
    map.set(unit, [...(map.get(unit) ?? []), course.name])
  }
  return [...map.entries()]
    .map(([unit, names]) => ({ unit, names }))
    .sort((x, y) => (x.unit === others ? 1 : y.unit === others ? -1 : y.names.length - x.names.length || x.unit.localeCompare(y.unit)))
}

/** Texto sem acentos e em minúsculas, para a pesquisa de cursos. */
export function plain(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/** Cursos que contêm a pesquisa no nome do curso ou da faculdade. */
export function searchCourses(groups: CourseGroup[], query: string): { name: string; unit: string }[] {
  const q = plain(query.trim())
  if (!q) return []
  const found: { name: string; unit: string }[] = []
  for (const group of groups) {
    for (const name of group.names) {
      if (plain(name).includes(q) || plain(group.unit).includes(q)) found.push({ name, unit: group.unit })
    }
  }
  return found
}
