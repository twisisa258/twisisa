import { pool } from '@/lib/db'
import { canPreview, previewPageUrl } from '@/lib/cloudinary-file'
import { HUB_LIMIT, MAIN_SECTIONS, PAGE_SIZE, normalizeText, type LibraryItem } from '@/lib/library-shared'

// Consultas da Biblioteca (só servidor). Tudo é paginado e filtrado na base de dados:
// o navegador nunca recebe o catálogo inteiro, por isso funciona com milhares de materiais.

type Row = {
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
}

export type ListFilters = {
  category?: string
  q?: string
  institution?: string
  subject?: string
  year?: number | null
}

export type Facet = { value: string; label: string; count: number }
export type CategoryCount = { slug: string; name: string; count: number }

const NORM = (expr: string) => `translate(lower(${expr}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`
const SEARCHABLE = NORM(`concat_ws(' ', m.title, m.description, m.institution_name, m.course_name, s.name, c.name, l.name, m.academic_year::text)`)

const FROM = `FROM academic_materials m
  JOIN library_categories c ON c.id = m.category_id
  LEFT JOIN library_subjects s ON s.id = m.subject_id
  LEFT JOIN library_levels l ON l.id = m.level_id`

const COLUMNS = `m.id, m.title, c.name AS category, c.slug AS "categorySlug",
  COALESCE(s.name, '') AS subject, COALESCE(l.name, '') AS level,
  COALESCE(m.institution_name, '') AS institution, m.academic_year AS year,
  m.file_url AS "fileUrl", m.file_name AS "fileName", m.download_count AS downloads`

function toItem(row: Row): LibraryItem {
  return {
    ...row,
    year: row.year ?? null,
    coverUrl: previewPageUrl(row.fileUrl, 1, 360),
    canPreview: canPreview(row.fileUrl),
  }
}

function words(q: string | undefined) {
  return normalizeText(q ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&')

type Skip = 'institution' | 'subject' | 'year'

function buildWhere(filters: ListFilters, skip: Skip[] = []) {
  const params: unknown[] = []
  const push = (value: unknown) => {
    params.push(value)
    return `$${params.length}`
  }
  const where = [`m.status = 'approved'`, `c.active = true`]
  if (filters.category) where.push(`c.slug = ${push(filters.category)}`)
  for (const word of words(filters.q)) where.push(`${SEARCHABLE} LIKE ${push(`%${escapeLike(word)}%`)}`)
  if (filters.institution && !skip.includes('institution')) where.push(`m.institution_name = ${push(filters.institution)}`)
  if (filters.subject && !skip.includes('subject')) where.push(`m.subject_id = ${push(filters.subject)}`)
  if (filters.year && !skip.includes('year')) where.push(`m.academic_year = ${push(filters.year)}`)
  return { where: where.join(' AND '), params }
}

function orderFor(filters: ListFilters) {
  if (filters.category === 'exames') return 'm.academic_year DESC NULLS LAST, m.title, m.id'
  if (filters.q) return 'm.download_count DESC, m.title, m.id'
  return 'm.published_at DESC NULLS LAST, m.created_at DESC, m.id'
}

export async function listMaterials(filters: ListFilters, page: number) {
  const { where, params } = buildWhere(filters)
  const counted = await pool.query<{ total: number }>(`SELECT count(*)::int AS total ${FROM} WHERE ${where}`, params)
  const total = Number(counted.rows[0]?.total ?? 0)
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(Math.max(1, page), pages)
  const result = await pool.query<Row>(
    `SELECT ${COLUMNS} ${FROM} WHERE ${where} ORDER BY ${orderFor(filters)} LIMIT ${PAGE_SIZE} OFFSET ${(current - 1) * PAGE_SIZE}`,
    params,
  )
  return { items: result.rows.map(toItem), total, pages, page: current }
}

export async function listTop(category: string, limit = HUB_LIMIT) {
  const filters: ListFilters = { category }
  const { where, params } = buildWhere(filters)
  const result = await pool.query<Row>(`SELECT ${COLUMNS} ${FROM} WHERE ${where} ORDER BY ${orderFor(filters)} LIMIT ${limit}`, params)
  return result.rows.map(toItem)
}

// Os mais populares são os mais descarregados; sem nenhum download a secção não aparece.
export async function listPopular(limit = HUB_LIMIT) {
  const result = await pool.query<Row>(
    `SELECT ${COLUMNS} ${FROM}
     WHERE m.status = 'approved' AND c.active = true AND m.download_count > 0
     ORDER BY m.download_count DESC, m.published_at DESC NULLS LAST, m.id
     LIMIT ${limit}`,
  )
  return result.rows.map(toItem)
}

export async function getCategoryCounts(): Promise<CategoryCount[]> {
  const result = await pool.query<{ slug: string; name: string; count: number }>(
    `SELECT c.slug, c.name, count(m.id)::int AS count
     FROM library_categories c
     JOIN academic_materials m ON m.category_id = c.id AND m.status = 'approved'
     WHERE c.active = true
     GROUP BY c.id
     ORDER BY c.sort_order, c.name`,
  )
  return result.rows.map((row) => ({ slug: row.slug, name: row.name, count: Number(row.count) }))
}

export async function getCategoryName(slug: string) {
  const result = await pool.query<{ name: string }>('SELECT name FROM library_categories WHERE slug = $1 AND active = true LIMIT 1', [slug])
  return result.rows[0]?.name ?? null
}

// Filtros em funil: as instituições dependem da pesquisa e da categoria; as disciplinas, também da instituição; os anos, também da disciplina.
export async function getFacets(filters: ListFilters) {
  const institutions = buildWhere(filters, ['institution', 'subject', 'year'])
  const subjects = buildWhere(filters, ['subject', 'year'])
  const years = buildWhere(filters, ['year'])
  const [i, s, y] = await Promise.all([
    pool.query<{ value: string; count: number }>(
      `SELECT m.institution_name AS value, count(*)::int AS count ${FROM}
       WHERE ${institutions.where} AND COALESCE(m.institution_name, '') <> ''
       GROUP BY m.institution_name ORDER BY m.institution_name LIMIT 80`,
      institutions.params,
    ),
    pool.query<{ value: string; label: string; count: number }>(
      `SELECT s.id AS value, s.name AS label, count(*)::int AS count ${FROM}
       WHERE ${subjects.where} AND s.id IS NOT NULL
       GROUP BY s.id, s.name ORDER BY s.name LIMIT 120`,
      subjects.params,
    ),
    pool.query<{ value: number; count: number }>(
      `SELECT m.academic_year AS value, count(*)::int AS count ${FROM}
       WHERE ${years.where} AND m.academic_year IS NOT NULL
       GROUP BY m.academic_year ORDER BY m.academic_year DESC LIMIT 60`,
      years.params,
    ),
  ])
  return {
    institutions: i.rows.map((row): Facet => ({ value: row.value, label: row.value, count: Number(row.count) })),
    subjects: s.rows.map((row): Facet => ({ value: row.value, label: row.label, count: Number(row.count) })),
    years: y.rows.map((row): Facet => ({ value: String(row.value), label: String(row.value), count: Number(row.count) })),
  }
}

export async function getSavedIds(userId: string) {
  const result = await pool.query<{ material_id: string }>('SELECT material_id FROM library_favorites WHERE user_id = $1', [userId])
  return result.rows.map((row) => String(row.material_id))
}

// ---- Pesquisa: sugestões e histórico ----

export type Suggestion = { id: string; title: string; meta: string; categorySlug: string }

export async function suggestMaterials(q: string, scope?: string): Promise<Suggestion[]> {
  const filters: ListFilters = { q, category: scope }
  const { where, params } = buildWhere(filters)
  params.push(`${escapeLike(normalizeText(q.trim()))}%`)
  const starts = `$${params.length}`
  const result = await pool.query<Row>(
    `SELECT ${COLUMNS} ${FROM} WHERE ${where}
     ORDER BY (${NORM('m.title')} LIKE ${starts}) DESC, m.download_count DESC, m.title, m.id
     LIMIT 6`,
    params,
  )
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    categorySlug: row.categorySlug,
    meta: [row.institution, row.subject, row.year ? String(row.year) : ''].filter(Boolean).join(' · ') || row.category,
  }))
}

export async function recentSearches(userId: string, q: string) {
  const term = normalizeText(q.trim())
  const result = term
    ? await pool.query<{ term: string }>(
        `SELECT term FROM library_searches WHERE user_id = $1 AND ${NORM('term')} LIKE $2 ORDER BY last_searched_at DESC LIMIT 4`,
        [userId, `%${escapeLike(term)}%`],
      )
    : await pool.query<{ term: string }>('SELECT term FROM library_searches WHERE user_id = $1 ORDER BY last_searched_at DESC LIMIT 6', [userId])
  return result.rows.map((row) => row.term)
}

// Termos de pesquisa de vários alunos: só aparecem os que 3 ou mais alunos diferentes pesquisaram.
export async function popularTerms() {
  const result = await pool.query<{ term: string }>(
    `SELECT term FROM library_searches
     GROUP BY term HAVING count(DISTINCT user_id) >= 3
     ORDER BY sum(search_count) DESC, term LIMIT 5`,
  )
  return result.rows.map((row) => row.term)
}

export async function recordSearch(userId: string, term: string) {
  await pool.query(
    `INSERT INTO library_searches (user_id, term) VALUES ($1, $2)
     ON CONFLICT (user_id, term) DO UPDATE SET search_count = library_searches.search_count + 1, last_searched_at = now()`,
    [userId, term],
  )
  await pool.query(
    `DELETE FROM library_searches WHERE user_id = $1
     AND term NOT IN (SELECT term FROM library_searches WHERE user_id = $1 ORDER BY last_searched_at DESC LIMIT 30)`,
    [userId],
  )
}

export async function clearSearches(userId: string) {
  await pool.query('DELETE FROM library_searches WHERE user_id = $1', [userId])
}

// ---- Página inicial da Biblioteca ----

export type HubSection = { slug: string; title: string; items: LibraryItem[] }

async function safe<T>(label: string, run: () => Promise<T>, fallback: T): Promise<{ value: T; failed: boolean }> {
  try {
    return { value: await run(), failed: false }
  } catch (error) {
    console.error(`[BIBLIOTECA] ${label}`, error)
    return { value: fallback, failed: true }
  }
}

export async function getHub() {
  const [popular, counts, sections] = await Promise.all([
    safe('populares', () => listPopular(), [] as LibraryItem[]),
    safe('categorias', () => getCategoryCounts(), [] as CategoryCount[]),
    Promise.all(MAIN_SECTIONS.map((section) => safe(section.slug, () => listTop(section.slug), [] as LibraryItem[]))),
  ])
  const failed = popular.failed || counts.failed || sections.some((section) => section.failed)
  return {
    failed,
    popular: popular.value,
    total: counts.value.reduce((sum, item) => sum + item.count, 0),
    sections: MAIN_SECTIONS.map((section, index): HubSection => ({ slug: section.slug, title: section.title, items: sections[index].value })),
  }
}
