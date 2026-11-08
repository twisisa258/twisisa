import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { AppError } from '@/lib/action-result'
import { BLOG_PAGE_SIZE, checkBlogInput, isBlogStatus, isBlogTrack, type BlogClean, type BlogInput, type BlogStatus, type BlogTrack } from '@/lib/blog-pure'

// Blog do Twisisa. A tabela e as regras estão em database/migrations/0039_blog.sql.
// Escrita: só a administração (as acções em app/admin/blog/actions.ts verificam a permissão).
// Leitura pública: só o que tem status = 'published' e published_at <= now(). A leitura nunca deve deitar a página abaixo:
// quem a usa recebe { ok: false } (ou uma lista vazia) e mostra o estado de erro em vez de partir.

export type BlogSummary = {
  id: string
  slug: string
  title: string
  excerpt: string
  coverUrl: string | null
  coverAlt: string | null
  status: BlogStatus
  publishedAt: Date | null
  updatedAt: Date
  createdAt: Date
  authorId: string | null
  authorName: string | null
  readingMinutes: number
  track: BlogTrack | null
  subjectId: string | null
  subjectName: string | null
  themeId: string | null
  themeName: string | null
  tags: string[]
}
export type BlogPost = BlogSummary & { body: string }
export type Read<T> = { ok: true; data: T } | { ok: false }

const PUBLIC = `p.status = 'published' AND p.published_at <= now()`
const COLUMNS = `p.id, p.slug, p.title, p.excerpt, p.cover_url, p.cover_alt, p.status, p.published_at, p.updated_at, p.created_at,
  p.author_id, u.name AS author_name, p.reading_minutes, p.track, p.subject_id, s.name AS subject_name, p.theme_id, t.name AS theme_name, p.tags`
const FROM = `FROM blog_posts p
  LEFT JOIN "user" u ON u.id = p.author_id
  LEFT JOIN library_subjects s ON s.id = p.subject_id
  LEFT JOIN topics t ON t.id = p.theme_id`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSummary(row: any): BlogSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverUrl: row.cover_url,
    coverAlt: row.cover_alt,
    status: isBlogStatus(row.status) ? row.status : 'draft',
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    authorId: row.author_id,
    authorName: row.author_name,
    readingMinutes: row.reading_minutes,
    track: isBlogTrack(row.track) ? row.track : null,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    themeId: row.theme_id,
    themeName: row.theme_name,
    tags: row.tags ?? [],
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPost = (row: any): BlogPost => ({ ...toSummary(row), body: row.body })

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`

// ───────────── Leitura pública ─────────────

export type BlogFilters = { q?: string; track?: string; subjectId?: string; tag?: string; page?: number }
export type BlogPage = { items: BlogSummary[]; total: number; page: number; pages: number }

export async function listPublished(filters: BlogFilters = {}): Promise<Read<BlogPage>> {
  try {
    const where = [PUBLIC]
    const params: unknown[] = []
    const add = (sql: string, value: unknown) => { params.push(value); where.push(sql.replace('$n', `$${params.length}`)) }
    const q = (filters.q ?? '').trim().slice(0, 100)
    if (q) add(`(p.title ILIKE $n OR p.excerpt ILIKE $n OR p.body ILIKE $n)`, likePattern(q))
    if (isBlogTrack(filters.track)) add(`p.track = $n`, filters.track)
    if (filters.subjectId) add(`p.subject_id = $n`, filters.subjectId)
    if (filters.tag) add(`$n = ANY(p.tags)`, filters.tag.trim().toLowerCase().slice(0, 24))
    const clause = where.join(' AND ')
    const total = (await pool.query(`SELECT count(*)::int AS n ${FROM} WHERE ${clause}`, params)).rows[0].n as number
    const pages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE))
    const page = Math.min(Math.max(1, Math.floor(filters.page ?? 1) || 1), pages)
    const rows = (await pool.query(
      `SELECT ${COLUMNS} ${FROM} WHERE ${clause} ORDER BY p.published_at DESC, p.id LIMIT ${BLOG_PAGE_SIZE} OFFSET ${(page - 1) * BLOG_PAGE_SIZE}`,
      params,
    )).rows
    return { ok: true, data: { items: rows.map(toSummary), total, page, pages } }
  } catch (error) {
    console.error('[BLOG] listar publicados', error)
    return { ok: false }
  }
}

/** Artigo público por endereço. `data: null` = não existe ou não está publicado (404); `ok: false` = falha de leitura. */
export async function getPublishedBySlug(slug: string): Promise<Read<BlogPost | null>> {
  try {
    const row = (await pool.query(`SELECT ${COLUMNS}, p.body ${FROM} WHERE p.slug = $1 AND ${PUBLIC}`, [slug.slice(0, 120)])).rows[0]
    return { ok: true, data: row ? toPost(row) : null }
  } catch (error) {
    console.error('[BLOG] obter artigo', error)
    return { ok: false }
  }
}

/** Relacionados: primeiro o mesmo tema, depois a mesma disciplina. Em caso de falha, nenhum. */
export async function listRelated(post: Pick<BlogSummary, 'id' | 'themeId' | 'subjectId'>, limit = 3): Promise<BlogSummary[]> {
  if (!post.themeId && !post.subjectId) return []
  try {
    const rows = (await pool.query(
      `SELECT ${COLUMNS} ${FROM}
       WHERE ${PUBLIC} AND p.id <> $1 AND (($2::text IS NOT NULL AND p.theme_id = $2) OR ($3::text IS NOT NULL AND p.subject_id = $3))
       ORDER BY ($2::text IS NOT NULL AND p.theme_id = $2) DESC, p.published_at DESC LIMIT $4`,
      [post.id, post.themeId, post.subjectId, limit],
    )).rows
    return rows.map(toSummary)
  } catch (error) {
    console.error('[BLOG] relacionados', error)
    return []
  }
}

/** Disciplinas que têm artigos publicados (para o filtro). */
export async function listBlogSubjects(): Promise<{ id: string; name: string }[]> {
  try {
    const rows = (await pool.query(
      `SELECT DISTINCT s.id, s.name FROM blog_posts p JOIN library_subjects s ON s.id = p.subject_id WHERE ${PUBLIC} ORDER BY s.name`,
    )).rows
    return rows.map((row) => ({ id: row.id, name: row.name }))
  } catch (error) {
    console.error('[BLOG] disciplinas do filtro', error)
    return []
  }
}

/** Etiquetas com artigos publicados, as mais usadas primeiro (páginas de tema e sitemap). */
export async function listBlogTags(limit = 200): Promise<{ tag: string; total: number }[]> {
  try {
    const rows = (await pool.query(
      `SELECT t.tag, count(*)::int AS total FROM (SELECT unnest(p.tags) AS tag FROM blog_posts p WHERE ${PUBLIC}) t GROUP BY t.tag ORDER BY total DESC, t.tag LIMIT $1`,
      [limit],
    )).rows
    return rows.map((row) => ({ tag: row.tag as string, total: row.total as number }))
  } catch (error) {
    console.error('[BLOG] etiquetas', error)
    return []
  }
}

export async function listLatest(limit = 3): Promise<BlogSummary[]> {
  try {
    return (await pool.query(`SELECT ${COLUMNS} ${FROM} WHERE ${PUBLIC} ORDER BY p.published_at DESC LIMIT $1`, [limit])).rows.map(toSummary)
  } catch (error) {
    console.error('[BLOG] últimos artigos', error)
    return []
  }
}

export async function listSitemapPosts(): Promise<{ slug: string; updatedAt: Date }[]> {
  try {
    const rows = (await pool.query(`SELECT p.slug, p.updated_at FROM blog_posts p WHERE ${PUBLIC} ORDER BY p.published_at DESC LIMIT 5000`)).rows
    return rows.map((row) => ({ slug: row.slug, updatedAt: row.updated_at }))
  } catch (error) {
    console.error('[BLOG] sitemap', error)
    return []
  }
}

export async function listFeedPosts(limit = 30): Promise<Read<BlogSummary[]>> {
  try {
    return { ok: true, data: (await pool.query(`SELECT ${COLUMNS} ${FROM} WHERE ${PUBLIC} ORDER BY p.published_at DESC LIMIT $1`, [limit])).rows.map(toSummary) }
  } catch (error) {
    console.error('[BLOG] feed', error)
    return { ok: false }
  }
}

// ───────────── Administração ─────────────

export async function listAdminPosts(filters: { status?: string; q?: string } = {}): Promise<BlogSummary[]> {
  const where: string[] = ['true']
  const params: unknown[] = []
  if (isBlogStatus(filters.status)) { params.push(filters.status); where.push(`p.status = $${params.length}`) }
  const q = (filters.q ?? '').trim().slice(0, 100)
  if (q) { params.push(likePattern(q)); where.push(`(p.title ILIKE $${params.length} OR p.slug ILIKE $${params.length})`) }
  const rows = (await pool.query(`SELECT ${COLUMNS} ${FROM} WHERE ${where.join(' AND ')} ORDER BY p.updated_at DESC LIMIT 200`, params)).rows
  return rows.map(toSummary)
}

/** Qualquer artigo, publicado ou não (editor e pré-visualização). */
export async function getAdminPost(id: string): Promise<BlogPost | null> {
  const row = (await pool.query(`SELECT ${COLUMNS}, p.body ${FROM} WHERE p.id = $1`, [id.slice(0, 80)])).rows[0]
  return row ? toPost(row) : null
}

/** Disciplinas e temas ativos, para os seletores dependentes do editor. */
export async function listClassification() {
  const [subjects, topics] = await Promise.all([
    pool.query(`SELECT id, name FROM library_subjects WHERE active ORDER BY name`),
    pool.query(`SELECT id, subject_id, name FROM topics WHERE active ORDER BY sort_order, name`),
  ])
  return {
    subjects: subjects.rows.map((row) => ({ id: row.id as string, name: row.name as string })),
    topics: topics.rows.map((row) => ({ id: row.id as string, subjectId: row.subject_id as string, name: row.name as string })),
  }
}

export const inputFromPost = (post: BlogPost): BlogInput => ({
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt,
  body: post.body,
  coverUrl: post.coverUrl ?? '',
  coverAlt: post.coverAlt ?? '',
  track: post.track ?? '',
  subjectId: post.subjectId ?? '',
  themeId: post.themeId ?? '',
  tags: post.tags.join(', '),
})

async function assertClassification(clean: BlogClean) {
  if (clean.subjectId) {
    const subject = await pool.query(`SELECT 1 FROM library_subjects WHERE id = $1`, [clean.subjectId])
    if (subject.rowCount === 0) throw new AppError('A disciplina escolhida já não existe.')
  }
  if (clean.themeId) {
    const theme = await pool.query(`SELECT 1 FROM topics WHERE id = $1 AND subject_id = $2`, [clean.themeId, clean.subjectId])
    if (theme.rowCount === 0) throw new AppError('O tema não pertence a esta disciplina.')
  }
}

const MAX_REVISIONS = 20

function mapWriteError(error: unknown): never {
  const e = error as { code?: string; constraint?: string }
  if (e?.code === '23505') throw new AppError('Já existe um artigo com este endereço. Escolhe outro.')
  if (e?.code === '23514') throw new AppError('Algum campo não cumpre as regras (tamanho ou formato). Revê o formulário.')
  throw error
}

/** Cria (sem id) ou atualiza (com id). `publish` publica; sem ele o estado não muda. Cada gravação guarda a versão anterior (últimas 20). */
export async function saveBlogPost(args: { id: string | null; clean: BlogClean; publish: boolean; userId: string }): Promise<{ id: string; slug: string; status: BlogStatus; previousSlug: string | null; wasPublished: boolean }> {
  const { id, clean, publish, userId } = args
  await assertClassification(clean)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const values = [clean.slug, clean.title, clean.excerpt, clean.body, clean.coverUrl, clean.coverAlt, clean.track, clean.subjectId, clean.themeId, clean.tags, clean.readingMinutes]
    if (!id) {
      const newId = randomUUID()
      const created = await client.query(
        `INSERT INTO blog_posts (id, slug, title, excerpt, body, cover_url, cover_alt, track, subject_id, theme_id, tags, reading_minutes, author_id, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CASE WHEN $15 THEN now() ELSE NULL END)
         RETURNING id, slug, status`,
        [newId, ...values, userId, publish ? 'published' : 'draft', publish],
      )
      await client.query('COMMIT')
      return { id: created.rows[0].id, slug: created.rows[0].slug, status: created.rows[0].status, previousSlug: null, wasPublished: false }
    }
    const current = (await client.query(`SELECT slug, title, body, status FROM blog_posts WHERE id = $1 FOR UPDATE`, [id])).rows[0]
    if (!current) throw new AppError('Este artigo já não existe.')
    if (current.title !== clean.title || current.body !== clean.body) {
      await client.query(`INSERT INTO blog_post_revisions (post_id, title, body, saved_by) VALUES ($1, $2, $3, $4)`, [id, current.title, current.body, userId])
      await client.query(
        `DELETE FROM blog_post_revisions WHERE post_id = $1 AND id NOT IN (SELECT id FROM blog_post_revisions WHERE post_id = $1 ORDER BY saved_at DESC, id DESC LIMIT ${MAX_REVISIONS})`,
        [id],
      )
    }
    const updated = await client.query(
      `UPDATE blog_posts SET slug = $2, title = $3, excerpt = $4, body = $5, cover_url = $6, cover_alt = $7, track = $8, subject_id = $9, theme_id = $10, tags = $11,
              reading_minutes = $12, updated_at = now(),
              status = CASE WHEN $13 THEN 'published' ELSE status END,
              published_at = CASE WHEN $13 THEN COALESCE(published_at, now()) ELSE published_at END
       WHERE id = $1 RETURNING id, slug, status`,
      [id, ...values, publish],
    )
    await client.query('COMMIT')
    return { id: updated.rows[0].id, slug: updated.rows[0].slug, status: updated.rows[0].status, previousSlug: current.slug === clean.slug ? null : current.slug, wasPublished: current.status === 'published' }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    if (error instanceof AppError) throw error
    return mapWriteError(error)
  } finally {
    client.release()
  }
}

/** Publicar, despublicar (volta a rascunho) ou arquivar um artigo que já existe. Ao publicar, volta a validar o que está guardado. */
export async function setBlogStatus(id: string, status: BlogStatus): Promise<{ slug: string; title: string; previous: BlogStatus }> {
  const post = await getAdminPost(id)
  if (!post) throw new AppError('Este artigo já não existe.')
  if (status === 'published') {
    const check = checkBlogInput(inputFromPost(post), 'publish')
    if (!check.ok) throw new AppError(check.message)
  }
  try {
    await pool.query(
      `UPDATE blog_posts SET status = $2, updated_at = now(), published_at = CASE WHEN $2 = 'published' THEN COALESCE(published_at, now()) ELSE published_at END WHERE id = $1`,
      [id, status],
    )
  } catch (error) {
    return mapWriteError(error)
  }
  return { slug: post.slug, title: post.title, previous: post.status }
}

export async function deleteBlogPost(id: string): Promise<{ slug: string; title: string; wasPublished: boolean }> {
  const result = await pool.query(`DELETE FROM blog_posts WHERE id = $1 RETURNING slug, title, status`, [id])
  if (result.rowCount === 0) throw new AppError('Este artigo já não existe.')
  const row = result.rows[0]
  return { slug: row.slug, title: row.title, wasPublished: row.status === 'published' }
}

export async function blogSlugTaken(slug: string, exceptId: string | null): Promise<boolean> {
  const row = await pool.query(`SELECT 1 FROM blog_posts WHERE slug = $1 AND ($2::text IS NULL OR id <> $2)`, [slug, exceptId])
  return (row.rowCount ?? 0) > 0
}
