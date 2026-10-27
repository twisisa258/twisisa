// Parte da Biblioteca que o navegador também usa (sem base de dados): tipos, secções, endereços e leitura de parâmetros.

export const MAIN_SECTIONS = [
  { slug: 'livros', title: 'Livros' },
  { slug: 'exames', title: 'Exames' },
  { slug: 'guias', title: 'Guias de estudos' },
] as const

export const PAGE_SIZE = 12
export const HUB_LIMIT = 8

export type LibraryItem = {
  id: string
  title: string
  category: string
  categorySlug: string
  subject: string
  level: string
  institution: string
  year: number | null
  fileUrl: string
  fileName: string
  downloads: number
  coverUrl: string | null
  canPreview: boolean
}

export type ListParams = {
  q: string
  institution: string
  subject: string
  year: number | null
  page: number
  categoria: string
}

type Query = Record<string, string | string[] | undefined>

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

// Lê e limita os parâmetros do endereço: nada que venha do navegador entra na consulta sem passar por aqui.
export function parseListParams(query: Query): ListParams {
  const q = one(query.q).replace(/\s+/g, ' ').trim().slice(0, 80)
  const institution = one(query.instituicao).trim().slice(0, 80)
  const subjectRaw = one(query.disciplina).trim()
  const subject = /^[\w-]{1,80}$/.test(subjectRaw) ? subjectRaw : ''
  const yearNumber = Number.parseInt(one(query.ano), 10)
  const year = Number.isInteger(yearNumber) && yearNumber >= 1900 && yearNumber <= 2100 ? yearNumber : null
  const pageNumber = Number.parseInt(one(query.pagina), 10)
  const page = Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 10000 ? pageNumber : 1
  const categoriaRaw = one(query.categoria).trim()
  const categoria = /^[a-z0-9-]{1,40}$/.test(categoriaRaw) ? categoriaRaw : ''
  return { q, institution, subject, year, page, categoria }
}

export type UrlValues = {
  q?: string
  instituicao?: string
  disciplina?: string
  ano?: string | number | null
  categoria?: string
  pagina?: number | null
}

// Junta o caminho com os parâmetros que têm valor (e a página só quando é maior que 1).
export function withParams(base: string, values: UrlValues) {
  const search = new URLSearchParams()
  const entries: [string, string | number | null | undefined][] = [
    ['q', values.q],
    ['categoria', values.categoria],
    ['instituicao', values.instituicao],
    ['disciplina', values.disciplina],
    ['ano', values.ano],
    ['pagina', values.pagina && values.pagina > 1 ? values.pagina : null],
  ]
  for (const [key, value] of entries) {
    if (value !== null && value !== undefined && String(value) !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `${base}?${text}` : base
}

export function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// Termo guardado no histórico: minúsculas, espaços únicos, entre 2 e 80 caracteres.
export function normalizeTerm(value: string) {
  const term = value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-PT').slice(0, 80)
  return term.length >= 2 ? term : ''
}
