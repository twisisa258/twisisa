// Regras do blog que não dependem da base de dados nem do React: validação, tempo de leitura, visibilidade.
// Servem o servidor (acções e leitura), o formulário e os testes.
import { slugify } from './slug'

export const BLOG_PAGE_SIZE = 12
export const BLOG_TRACKS = ['10', '12', 'admissao'] as const
export type BlogTrack = (typeof BLOG_TRACKS)[number]
export const BLOG_TRACK_LABEL: Record<BlogTrack, string> = { '10': '10ª classe', '12': '12ª classe', admissao: 'Admissão' }
export const BLOG_STATUSES = ['draft', 'published', 'archived'] as const
export type BlogStatus = (typeof BLOG_STATUSES)[number]
export const BLOG_STATUS_LABEL: Record<BlogStatus, string> = { draft: 'Rascunho', published: 'Publicado', archived: 'Arquivado' }

export const LIMITS = { titleMin: 5, titleMax: 120, slugMin: 3, slugMax: 90, excerptMax: 160, bodyMax: 100_000, altMax: 160, tagsMax: 8, tagMax: 24 } as const
// Endereços que não podem ser de artigos (já têm outro uso dentro de /blog).
export const RESERVED_SLUGS = ['pre-visualizar', 'feed', 'novo']
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const isBlogTrack = (value: unknown): value is BlogTrack => typeof value === 'string' && (BLOG_TRACKS as readonly string[]).includes(value)
export const isBlogStatus = (value: unknown): value is BlogStatus => typeof value === 'string' && (BLOG_STATUSES as readonly string[]).includes(value)

/** Endereço sugerido a partir do título: minúsculas, sem acentos, hífens, no máximo 90 caracteres. */
export function slugFromTitle(title: string) {
  return slugify(title).slice(0, LIMITS.slugMax).replace(/-+$/, '')
}

/** Minutos de leitura (200 palavras por minuto, mínimo 1). Ignora marcas do Markdown, fórmulas, blocos de código e ligações de imagens. */
export function readingMinutes(body: string) {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]+?\$/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]+/g, ' ')
  const words = text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
  return Math.max(1, Math.ceil(words / 200))
}

/** Só é público o que está publicado e já passou a hora de publicação. */
export function isPublicNow(post: { status: string; publishedAt: Date | null }, now: Date = new Date()) {
  return post.status === 'published' && post.publishedAt !== null && post.publishedAt.getTime() <= now.getTime()
}

/** Etiquetas: separadas por vírgula ou linha, em minúsculas, sem repetidas. Devolve também o que foi recusado. */
export function parseTags(raw: string) {
  const tags: string[] = []
  for (const part of raw.split(/[,\n]/)) {
    const tag = part.trim().toLowerCase().replace(/\s+/g, ' ')
    if (tag && !tags.includes(tag)) tags.push(tag)
  }
  return tags
}

export type BlogInput = {
  title: string
  slug: string
  excerpt: string
  body: string
  coverUrl: string
  coverAlt: string
  track: string
  subjectId: string
  themeId: string
  tags: string
}
export type BlogClean = {
  title: string
  slug: string
  excerpt: string
  body: string
  coverUrl: string | null
  coverAlt: string | null
  track: BlogTrack | null
  subjectId: string | null
  themeId: string | null
  tags: string[]
  readingMinutes: number
}
export type BlogCheck = { ok: true; value: BlogClean } | { ok: false; message: string }

/** Validação feita no servidor (o formulário só ajuda). `publish` exige também resumo e corpo. */
export function checkBlogInput(input: BlogInput, mode: 'draft' | 'publish'): BlogCheck {
  const title = input.title.trim()
  const excerpt = input.excerpt.trim()
  const body = input.body.replace(/\r\n/g, '\n').trim()
  const slug = (input.slug.trim() || slugFromTitle(title)).toLowerCase()
  const coverUrl = input.coverUrl.trim()
  const coverAlt = input.coverAlt.trim()
  const tags = parseTags(input.tags)
  const fail = (message: string): BlogCheck => ({ ok: false, message })

  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) return fail(`O título precisa de ${LIMITS.titleMin} a ${LIMITS.titleMax} caracteres.`)
  if (slug.length < LIMITS.slugMin || slug.length > LIMITS.slugMax || !SLUG_PATTERN.test(slug)) return fail(`O endereço precisa de ${LIMITS.slugMin} a ${LIMITS.slugMax} caracteres, só com letras minúsculas, números e hífens.`)
  if (RESERVED_SLUGS.includes(slug)) return fail('Este endereço está reservado. Escolhe outro.')
  if (excerpt.length > LIMITS.excerptMax) return fail(`O resumo pode ter no máximo ${LIMITS.excerptMax} caracteres.`)
  if (body.length > LIMITS.bodyMax) return fail('O texto é demasiado longo. Divide-o em dois artigos.')
  if (coverUrl && !/^https:\/\//.test(coverUrl)) return fail('A capa tem de ser um endereço https.')
  if (coverUrl.length > 500) return fail('O endereço da capa é demasiado longo.')
  if (coverUrl && !coverAlt) return fail('Descreve a capa no texto alternativo.')
  if (coverAlt.length > LIMITS.altMax) return fail(`O texto alternativo pode ter no máximo ${LIMITS.altMax} caracteres.`)
  if (input.track && !isBlogTrack(input.track)) return fail('Percurso inválido.')
  if (input.themeId && !input.subjectId) return fail('Escolhe a disciplina antes do tema.')
  if (tags.length > LIMITS.tagsMax) return fail(`Usa no máximo ${LIMITS.tagsMax} etiquetas.`)
  if (tags.some((tag) => tag.length > LIMITS.tagMax)) return fail(`Cada etiqueta pode ter no máximo ${LIMITS.tagMax} caracteres.`)
  if (mode === 'publish') {
    if (!excerpt) return fail('Escreve o resumo antes de publicar: serve de descrição no Google.')
    if (!body) return fail('Escreve o texto do artigo antes de publicar.')
  }

  return {
    ok: true,
    value: {
      title,
      slug,
      excerpt,
      body,
      coverUrl: coverUrl || null,
      coverAlt: coverUrl ? coverAlt : null,
      track: isBlogTrack(input.track) ? input.track : null,
      subjectId: input.subjectId || null,
      themeId: input.themeId || null,
      tags,
      readingMinutes: readingMinutes(body),
    },
  }
}

const TZ = 'Africa/Maputo'
/** «7 de novembro de 2026» (hora de Maputo). */
export function dataLonga(date: Date) {
  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
}
/** «7 nov. 2026» para listas. */
export function dataCurta(date: Date) {
  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })
}

export const blogPath = (slug: string) => `/blog/${slug}`
/** Páginas de tema (indexáveis): /blog/disciplina/matematica e /blog/etiqueta/funcoes. */
export const blogSubjectPath = (subjectName: string) => `/blog/disciplina/${slugify(subjectName)}`
export const blogTagPath = (tag: string) => `/blog/etiqueta/${encodeURIComponent(tag)}`

/** Botão «Praticar»: leva ao Simulador já na disciplina e no tema do artigo (o Simulador lê d= e t=). */
export function practiceLink(post: { subjectId: string | null; themeId: string | null }) {
  if (!post.subjectId) return { href: '/aluno/simulador', label: 'Praticar no Simulador' }
  const query = new URLSearchParams({ m: 'pratica', d: post.subjectId })
  if (post.themeId) query.set('t', post.themeId)
  return { href: `/aluno/simulador?${query.toString()}`, label: post.themeId ? 'Praticar este tema' : 'Praticar esta disciplina' }
}
