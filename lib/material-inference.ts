// Deteção automática da classificação de um material a partir do nome do ficheiro e das pastas.
// Ex.: «Matemática/UEM/2023/Exame 12ª classe.pdf» → disciplina Matemática, instituição UEM, ano 2023, nível 12.ª classe.
// Só sugere: o que o administrador escolher (para todos ou para os selecionados) tem sempre prioridade.

export type InferCatalog = {
  categories: { slug: string; name: string }[]
  subjects: { id: string; name: string }[]
  levels: { id: string; name: string }[]
  institutions: { shortName: string; name: string }[]
}

export type Inferred = { category?: string; subject?: string; level?: string; institution?: string; year?: string }

const MIN_YEAR = 2000

/** Minúsculas, sem acentos, só letras e números separados por um espaço (e espaços nas pontas, para procurar palavras inteiras). */
export function normalize(text: string) {
  const body = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return ` ${body} `
}

const hasPhrase = (haystack: string, phrase: string) => {
  const needle = normalize(phrase)
  return needle.trim().length > 0 && haystack.includes(needle)
}

/** Título a partir do nome do ficheiro: sem extensão, sem «_» nem «(1)». */
export function titleFromFilename(fileName: string) {
  const base = fileName.replace(/\.[a-z0-9]{1,5}$/i, '')
  const title = base.replace(/[_]+/g, ' ').replace(/\s*\(\d+\)\s*$/, '').replace(/\s+/g, ' ').trim()
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : fileName
}

// Singular simples: «exames» → «exame», «manuais» → «manual».
const stem = (word: string) => word.replace(/ais$/, 'al').replace(/s$/, '')

function longest<T>(items: { item: T; length: number }[]): T | undefined {
  let best: { item: T; length: number } | undefined
  for (const entry of items) if (entry.length > 0 && (!best || entry.length > best.length)) best = entry
  return best?.item
}

/** `path` é o caminho relativo («pasta/subpasta/ficheiro.pdf») ou só o nome. */
export function inferFromPath(path: string, catalog: InferCatalog, now: Date = new Date()): Inferred {
  const parts = path.split(/[\\/]/).filter(Boolean)
  const fileName = parts[parts.length - 1] ?? ''
  const folders = parts.slice(0, -1)
  const nameText = normalize(fileName.replace(/\.[a-z0-9]{1,5}$/i, ''))
  const allText = normalize(parts.join(' '))
  const out: Inferred = {}

  // Ano: primeiro no nome do ficheiro, depois nas pastas (da mais próxima para a mais distante).
  const maxYear = now.getFullYear() + 1
  const findYear = (text: string) => {
    for (const match of text.matchAll(/(?<![0-9])((?:19|20)\d\d)(?![0-9])/g)) {
      const year = Number(match[1])
      if (year >= MIN_YEAR && year <= maxYear) return String(year)
    }
    return undefined
  }
  out.year = findYear(nameText) ?? [...folders].reverse().map((folder) => findYear(normalize(folder))).find(Boolean)

  out.subject = longest(catalog.subjects.map((subject) => ({ item: subject.id, length: hasPhrase(allText, subject.name) ? normalize(subject.name).length : 0 })))

  out.institution = longest(
    catalog.institutions.map((institution) => ({
      item: institution.shortName,
      length: Math.max(hasPhrase(allText, institution.shortName) ? normalize(institution.shortName).length : 0, hasPhrase(allText, institution.name) ? normalize(institution.name).length : 0),
    })),
  )

  // Classe: «12ª classe», «12 classe», «12.a classe»…
  const classNumbers = new Set([...allText.matchAll(/ (\d{1,2}) (?:a |o )?classe /g)].map((match) => match[1]))
  const levelByNumber = catalog.levels.find((level) => {
    const number = normalize(level.name).match(/ (\d{1,2}) (?:a |o )?classe /)?.[1]
    return !!number && classNumbers.has(number)
  })
  out.level = levelByNumber?.id ?? longest(catalog.levels.map((level) => ({ item: level.id, length: hasPhrase(allText, level.name) ? normalize(level.name).length : 0 })))

  // Categoria: palavras do nome da categoria (sem plural) presentes no caminho. Só decide se houver um vencedor claro.
  const words = new Set(allText.trim().split(' ').map(stem))
  const scored = catalog.categories.map((category) => {
    const tokens = normalize(category.name).trim().split(' ').filter((word) => word.length >= 4).map(stem)
    return { slug: category.slug, score: tokens.filter((token) => words.has(token)).length }
  })
  const top = Math.max(0, ...scored.map((entry) => entry.score))
  const winners = scored.filter((entry) => entry.score === top && top > 0)
  if (winners.length === 1) out.category = winners[0].slug

  for (const key of Object.keys(out) as (keyof Inferred)[]) if (!out[key]) delete out[key]
  return out
}
