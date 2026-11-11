import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { AppError } from '@/lib/action-result'
import { askAi } from '@/lib/kit-ai'
import { examHeading, examTextParagraphs, isYear, likePattern, parseKeyTopics, searchTokens, slugify } from '@/lib/exames-pure'

// Páginas públicas de exames (para o Google) e temas principais (só servidor).
// Tudo vem da base de dados: instituições, disciplinas, exames da Biblioteca e temas publicados no admin.

export type PublicInstitution = { id: string; slug: string; shortName: string; name: string; topics: number; exams: number; courses: number }

const EXAMS_FROM = `FROM academic_materials m JOIN library_categories c ON c.id = m.category_id
  WHERE m.status = 'approved' AND c.slug = 'exames' AND m.mime_type = 'application/pdf'`

export async function listPublicInstitutions(): Promise<PublicInstitution[]> {
  const result = await pool.query(
    `SELECT i.id, i.short_name, i.name,
       (SELECT count(*)::int FROM key_topics k WHERE k.institution_id = i.id AND k.status = 'publicado') AS topics,
       (SELECT count(*)::int ${EXAMS_FROM} AND lower(m.institution_name) IN (lower(i.short_name), lower(i.name))) AS exams,
       (SELECT count(*)::int FROM courses co WHERE co.institution_id = i.id AND co.active) AS courses
     FROM institutions i WHERE i.active ORDER BY i.short_name`,
  )
  return result.rows
    .map((row) => ({ id: row.id as string, slug: slugify(row.short_name as string), shortName: row.short_name as string, name: row.name as string, topics: row.topics as number, exams: row.exams as number, courses: row.courses as number }))
    .filter((item) => item.topics > 0 || item.exams > 0)
}

export async function getPublicInstitution(slug: string) {
  return (await listPublicInstitutions()).find((item) => item.slug === slug) ?? null
}

export type PublicSubject = { id: string; slug: string; name: string; topics: number; exams: number }

export async function listPublicSubjects(institution: PublicInstitution): Promise<PublicSubject[]> {
  const result = await pool.query(
    `SELECT s.id, s.slug, s.name,
       (SELECT count(*)::int FROM key_topics k WHERE k.institution_id = $1 AND k.subject_id = s.id AND k.status = 'publicado') AS topics,
       (SELECT count(*)::int ${EXAMS_FROM} AND m.subject_id = s.id AND lower(m.institution_name) IN (lower($2), lower($3))) AS exams
     FROM library_subjects s WHERE s.active ORDER BY s.name`,
    [institution.id, institution.shortName, institution.name],
  )
  return result.rows.filter((row) => row.topics > 0 || row.exams > 0).map((row) => ({ id: row.id, slug: row.slug, name: row.name, topics: row.topics, exams: row.exams }))
}

export type ExamEntry = { id: string; title: string; year: number | null; heading: string }

export async function getSubjectPage(institutionSlug: string, subjectSlug: string) {
  const institution = await getPublicInstitution(institutionSlug)
  if (!institution) return null
  const subject = (await pool.query(`SELECT id, slug, name FROM library_subjects WHERE slug = $1 AND active LIMIT 1`, [subjectSlug])).rows[0]
  if (!subject) return null
  const topics = (await pool.query(`SELECT position, title, summary, tips FROM key_topics WHERE institution_id = $1 AND subject_id = $2 AND status = 'publicado' ORDER BY position`, [institution.id, subject.id])).rows as { position: number; title: string; summary: string; tips: string | null }[]
  const exams = (
    await pool.query(
      `SELECT m.id, m.title, m.academic_year ${EXAMS_FROM} AND m.subject_id = $1 AND lower(m.institution_name) IN (lower($2), lower($3)) ORDER BY m.academic_year DESC NULLS LAST, m.title`,
      [subject.id, institution.shortName, institution.name],
    )
  ).rows.map((row) => ({ id: row.id as string, title: row.title as string, year: (row.academic_year as number | null) ?? null, heading: examHeading({ subject: subject.name, institution: institution.shortName, year: row.academic_year, title: row.title }) })) as ExamEntry[]
  if (topics.length === 0 && exams.length === 0) return null
  const courses = (
    await pool.query(
      `SELECT DISTINCT c.name, c.unit FROM courses c
       JOIN course_exam_options o ON o.course_id = c.id JOIN course_exam_option_papers op ON op.option_id = o.id JOIN exam_papers p ON p.id = op.paper_id
       WHERE c.institution_id = $1 AND c.active AND p.subject_id = $2 ORDER BY c.name LIMIT 40`,
      [institution.id, subject.id],
    )
  ).rows as { name: string; unit: string | null }[]
  return { institution, subject: { id: subject.id as string, slug: subject.slug as string, name: subject.name as string }, topics, exams, courses }
}

/** Um exame (PDF) visível ao público: só aprovado e da categoria «Exames». */
export async function getPublicExam(id: string) {
  const row = (
    await pool.query(
      `SELECT m.id, m.title, m.description, m.academic_year, m.institution_name, m.subject_id, s.name AS subject_name, s.slug AS subject_slug, m.published_at, m.updated_at
       ${EXAMS_FROM.replace('FROM academic_materials m', 'FROM academic_materials m LEFT JOIN library_subjects s ON s.id = m.subject_id')} AND m.id = $1`,
      [id],
    )
  ).rows[0]
  if (!row || !row.institution_name || !row.subject_name) return null
  const wanted = String(row.institution_name).toLowerCase()
  const institution = (await listPublicInstitutions()).find((item) => item.shortName.toLowerCase() === wanted || item.name.toLowerCase() === wanted)
  if (!institution) return null
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? '',
    year: (row.academic_year as number | null) ?? null,
    institution,
    subject: { id: row.subject_id as string, name: row.subject_name as string, slug: row.subject_slug as string },
    heading: examHeading({ subject: row.subject_name, institution: institution.shortName, year: row.academic_year, title: row.title }),
    updatedAt: (row.updated_at as Date) ?? null,
  }
}

/**
 * Texto do exame lido do PDF (existe nos exames importados com o Jonas, em material_imports).
 * Vai no HTML da página: o Google não lê o PDF que o ecrã desenha. Sem texto aproveitável devolve [] e a página não mostra nada.
 */
export async function getExamText(id: string): Promise<string[]> {
  const result = await pool.query(`SELECT left(extracted_text, 40000) AS texto FROM material_imports WHERE material_id = $1 LIMIT 1`, [id]).catch(() => null)
  const raw = result?.rows[0]?.texto
  return typeof raw === 'string' ? examTextParagraphs(raw) : []
}

// ---------------------------------------------------------------- listas de exames (hub, pesquisa, anos, sitemap)

export type ExamListItem = { id: string; title: string; year: number | null; heading: string; institutionSlug: string; institutionShort: string; subjectSlug: string; subjectName: string; updatedAt: Date | null }

type ExamFilter = { institutionId?: string; subjectId?: string; year?: number; q?: string; limit?: number; offset?: number }

/** Exames aprovados (PDF, categoria «Exames») ligados a uma instituição e a uma disciplina ativas. Uma só consulta. */
export async function findExams(filter: ExamFilter = {}): Promise<{ items: ExamListItem[]; total: number }> {
  const where = [`m.status = 'approved'`, `c.slug = 'exames'`, `m.mime_type = 'application/pdf'`, `s.active`]
  const params: unknown[] = []
  const add = (sql: string, value: unknown) => {
    params.push(value)
    where.push(sql.replace('$n', `$${params.length}`))
  }
  if (filter.institutionId) add('i.id = $n', filter.institutionId)
  if (filter.subjectId) add('m.subject_id = $n', filter.subjectId)
  if (filter.year) add('m.academic_year = $n', filter.year)
  for (const token of searchTokens(filter.q ?? '')) {
    params.push(likePattern(token))
    const n = `$${params.length}`
    const yearClause = isYear(token) ? ` OR m.academic_year = ${Number(token)}` : ''
    where.push(`(m.title ILIKE ${n} OR s.name ILIKE ${n} OR i.short_name ILIKE ${n} OR i.name ILIKE ${n}${yearClause})`)
  }
  const from = `FROM academic_materials m
    JOIN library_categories c ON c.id = m.category_id
    JOIN library_subjects s ON s.id = m.subject_id
    JOIN institutions i ON i.active AND lower(m.institution_name) IN (lower(i.short_name), lower(i.name))
    WHERE ${where.join(' AND ')}`
  const limit = Math.min(Math.max(filter.limit ?? 24, 1), 5000)
  const offset = Math.max(filter.offset ?? 0, 0)
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT m.id, m.title, m.academic_year, m.updated_at, s.name AS subject_name, s.slug AS subject_slug, i.short_name
       ${from} ORDER BY m.academic_year DESC NULLS LAST, m.published_at DESC NULLS LAST, m.title LIMIT ${limit} OFFSET ${offset}`,
      params,
    ),
    pool.query(`SELECT count(*)::int AS n ${from}`, params),
  ])
  return {
    total: (count.rows[0]?.n as number) ?? 0,
    items: rows.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      year: (row.academic_year as number | null) ?? null,
      heading: examHeading({ subject: row.subject_name, institution: row.short_name, year: row.academic_year, title: row.title }),
      institutionSlug: slugify(row.short_name as string),
      institutionShort: row.short_name as string,
      subjectSlug: row.subject_slug as string,
      subjectName: row.subject_name as string,
      updatedAt: (row.updated_at as Date) ?? null,
    })),
  }
}

/** Anos com exames numa instituição (mais recente primeiro), com o número de exames de cada um. */
export async function listExamYears(institutionId: string): Promise<{ year: number; count: number }[]> {
  const result = await pool.query(
    `SELECT m.academic_year AS year, count(*)::int AS n
     FROM academic_materials m
     JOIN library_categories c ON c.id = m.category_id
     JOIN library_subjects s ON s.id = m.subject_id AND s.active
     JOIN institutions i ON i.id = $1 AND lower(m.institution_name) IN (lower(i.short_name), lower(i.name))
     WHERE m.status = 'approved' AND c.slug = 'exames' AND m.mime_type = 'application/pdf' AND m.academic_year IS NOT NULL
     GROUP BY m.academic_year ORDER BY m.academic_year DESC`,
    [institutionId],
  )
  return result.rows.map((row) => ({ year: row.year as number, count: row.n as number }))
}

/** Página «Exames da UEM de 2023»: só existe se houver pelo menos um exame nesse ano. */
export async function getYearPage(institutionSlug: string, year: number) {
  if (!Number.isInteger(year) || year < 1990 || year > 2100) return null
  const institution = await getPublicInstitution(institutionSlug)
  if (!institution) return null
  const { items } = await findExams({ institutionId: institution.id, year, limit: 200 })
  if (items.length === 0) return null
  const years = await listExamYears(institution.id)
  return { institution, year, exams: items, years }
}

/** Categorias da Biblioteca antiga que não são exames (livros, guias), só as que têm materiais aprovados. */
export async function listOtherCategories(): Promise<{ slug: string; name: string; total: number }[]> {
  const result = await pool.query(
    `SELECT c.slug, c.name, count(*)::int AS total
     FROM academic_materials m JOIN library_categories c ON c.id = m.category_id
     WHERE m.status = 'approved' AND c.active AND c.slug <> 'exames'
     GROUP BY c.slug, c.name, c.sort_order ORDER BY c.sort_order, c.name`,
  )
  return result.rows.map((row) => ({ slug: row.slug as string, name: row.name as string, total: row.total as number }))
}

/** Todas as páginas públicas, para o sitemap (poucas consultas, sem uma por disciplina). */
export async function listExamSitemapPaths(): Promise<{ path: string; lastModified?: Date }[]> {
  const out: { path: string; lastModified?: Date }[] = [{ path: '/exames' }]
  const institutions = await listPublicInstitutions()
  const { items: exams } = await findExams({ limit: 5000 })
  const yearsSeen = new Set<string>()
  for (const institution of institutions) {
    out.push({ path: `/exames/${institution.slug}` })
    for (const subject of await listPublicSubjects(institution)) out.push({ path: `/exames/${institution.slug}/${subject.slug}` })
  }
  for (const exam of exams) {
    out.push({ path: `/exames/${exam.institutionSlug}/${exam.subjectSlug}/${exam.id}`, lastModified: exam.updatedAt ?? undefined })
    if (exam.year) {
      const key = `${exam.institutionSlug}/${exam.year}`
      if (!yearsSeen.has(key)) {
        yearsSeen.add(key)
        out.push({ path: `/exames/${exam.institutionSlug}/ano/${exam.year}` })
      }
    }
  }
  return out
}

// ---------------------------------------------------------------- administração

export type AdminSubject = { id: string; slug: string; name: string; total: number; published: number }

export async function listAdminSubjects(institutionId: string): Promise<AdminSubject[]> {
  const result = await pool.query(
    `SELECT s.id, s.slug, s.name,
       (SELECT count(*)::int FROM key_topics k WHERE k.institution_id = $1 AND k.subject_id = s.id) AS total,
       (SELECT count(*)::int FROM key_topics k WHERE k.institution_id = $1 AND k.subject_id = s.id AND k.status = 'publicado') AS published
     FROM subject_scopes sc JOIN library_subjects s ON s.id = sc.subject_id
     WHERE sc.institution_id = $1 AND s.active ORDER BY s.name`,
    [institutionId],
  )
  return result.rows.map((row) => ({ id: row.id, slug: row.slug, name: row.name, total: row.total, published: row.published }))
}

export type AdminKeyTopic = { position: number; title: string; summary: string; tips: string; status: 'rascunho' | 'publicado'; origin: 'manual' | 'jonas' }

export async function listKeyTopics(institutionId: string, subjectId: string): Promise<AdminKeyTopic[]> {
  const result = await pool.query(`SELECT position, title, summary, tips, status, origin FROM key_topics WHERE institution_id = $1 AND subject_id = $2 ORDER BY position`, [institutionId, subjectId])
  return result.rows.map((row) => ({ position: row.position, title: row.title, summary: row.summary, tips: row.tips ?? '', status: row.status, origin: row.origin }))
}

export async function saveKeyTopic(input: { institutionId: string; subjectId: string; position: number; title: string; summary: string; tips: string; adminId: string }) {
  const title = input.title.trim()
  const summary = input.summary.trim()
  if (!Number.isInteger(input.position) || input.position < 1 || input.position > 10) throw new AppError('Posição inválida.')
  if (title.length < 3 || title.length > 120) throw new AppError('O título precisa de 3 a 120 caracteres.')
  if (summary.length < 20 || summary.length > 2500) throw new AppError('O resumo precisa de 20 a 2500 caracteres.')
  if (input.tips.trim().length > 600) throw new AppError('As dicas têm no máximo 600 caracteres.')
  await pool.query(
    `INSERT INTO key_topics (id, institution_id, subject_id, position, title, summary, tips, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (institution_id, subject_id, position) DO UPDATE SET title = $5, summary = $6, tips = $7, origin = 'manual', updated_by = $8, updated_at = now()`,
    [`topic-${randomUUID()}`, input.institutionId, input.subjectId, input.position, title, summary, input.tips.trim() || null, input.adminId],
  )
}

export async function setKeyTopicsStatus(institutionId: string, subjectId: string, status: 'rascunho' | 'publicado', adminId: string) {
  if (status === 'publicado') {
    const count = (await pool.query(`SELECT count(*)::int AS n FROM key_topics WHERE institution_id = $1 AND subject_id = $2`, [institutionId, subjectId])).rows[0].n as number
    if (count < 3) throw new AppError('Precisas de pelo menos 3 temas para publicar.')
  }
  await pool.query(`UPDATE key_topics SET status = $3, updated_by = $4, updated_at = now() WHERE institution_id = $1 AND subject_id = $2`, [institutionId, subjectId, status, adminId])
}

export async function deleteKeyTopic(institutionId: string, subjectId: string, position: number) {
  await pool.query(`DELETE FROM key_topics WHERE institution_id = $1 AND subject_id = $2 AND position = $3`, [institutionId, subjectId, position])
}

/** O Jonas propõe os 10 temas principais, com base nos exames já importados e na lista de temas da disciplina. Substitui os atuais e fica como rascunho. */
export async function generateKeyTopics(institutionId: string, subjectId: string, adminId: string): Promise<number> {
  const target = (await pool.query(`SELECT i.short_name, i.name AS institution_name, s.name AS subject_name FROM institutions i, library_subjects s WHERE i.id = $1 AND s.id = $2`, [institutionId, subjectId])).rows[0]
  if (!target) throw new AppError('Instituição ou disciplina não encontrada.')
  const frequent = (
    await pool.query(
      `SELECT t.name, count(*)::int AS n FROM questions q JOIN topics t ON t.id = q.topic_id
       WHERE q.institution_id = $1 AND q.subject_id = $2 AND q.status IN ('publicada', 'rascunho') GROUP BY t.name ORDER BY n DESC LIMIT 15`,
      [institutionId, subjectId],
    )
  ).rows as { name: string; n: number }[]
  const syllabus = (await pool.query(`SELECT name FROM topics WHERE subject_id = $1 AND active = true ORDER BY name LIMIT 40`, [subjectId])).rows.map((row) => row.name as string)
  const exams = (await pool.query(`SELECT count(*)::int AS n ${EXAMS_FROM} AND m.subject_id = $1 AND lower(m.institution_name) = lower($2)`, [subjectId, target.short_name])).rows[0].n as number

  const user = `Disciplina: ${target.subject_name}
Instituição: ${target.name} (${target.short_name})
Exames anteriores desta disciplina na Biblioteca: ${exams}
Temas que mais aparecem nas questões já importadas: ${frequent.length ? frequent.map((item) => `${item.name} (${item.n})`).join('; ') : 'ainda sem dados'}
Temas da disciplina na plataforma: ${syllabus.length ? syllabus.join('; ') : 'ainda sem lista'}

TAREFA: propõe os 10 TEMAS PRINCIPAIS que um candidato deve dominar para o exame de admissão de ${target.subject_name} na ${target.short_name}, pelo programa do ensino secundário de Moçambique. Dá prioridade aos temas que mais aparecem nos exames. Se não há dados dos exames, usa o programa, sem referir essa falta.

Para cada tema escreve: um título curto (até 60 caracteres), um resumo de 4 a 6 frases (o que estudar, os conceitos-chave e os erros mais comuns) e uma dica de 1 a 2 frases. Texto simples, SEM fórmulas nem LaTeX (escreve «x ao quadrado», «raiz quadrada de x»). Sem inventar dados nem estatísticas.

FORMATO (nada fora dele):
@@T 1
titulo: <título>
@@RESUMO
<texto>
@@DICAS
<texto>
@@FIM
(repete até 10 temas)`

  let raw: string
  try {
    raw = await askAi({ system: 'És o Jonas, assistente da Twisisa. Escreves conteúdo de estudo claro e correto para candidatos moçambicanos aos exames de admissão. Segues exatamente o formato pedido.', user, maxTokens: 5000, temperature: 0.3 })
  } catch (error) {
    if (error instanceof AppError) throw error
    console.error('[TEMAS] pedido ao Jonas', error)
    throw new AppError('O Jonas não respondeu. Tenta outra vez dentro de um minuto.')
  }
  const topics = parseKeyTopics(raw)
  if (topics.length < 3) throw new AppError('O Jonas respondeu num formato inesperado. Tenta outra vez.')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM key_topics WHERE institution_id = $1 AND subject_id = $2`, [institutionId, subjectId])
    for (const topic of topics) {
      await client.query(
        `INSERT INTO key_topics (id, institution_id, subject_id, position, title, summary, tips, status, origin, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'rascunho', 'jonas', $8)`,
        [`topic-${randomUUID()}`, institutionId, subjectId, topic.position, topic.title, topic.summary, topic.tips || null, adminId],
      )
    }
    await client.query('COMMIT')
    return topics.length
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    console.error('[TEMAS] gravação', error)
    throw new AppError('Não foi possível guardar os temas. Tenta outra vez.')
  } finally {
    client.release()
  }
}

export async function listAdminInstitutions(): Promise<{ id: string; shortName: string; name: string }[]> {
  const result = await pool.query(`SELECT id, short_name, name FROM institutions WHERE active ORDER BY short_name`)
  return result.rows.map((row) => ({ id: row.id, shortName: row.short_name, name: row.name }))
}
