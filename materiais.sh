#!/usr/bin/env bash
# Admin: carregar vários materiais de uma vez (escolher ficheiros ou pasta, classificar uma só vez, publicar em lote).
# Corre na raiz do projeto (onde está o package.json). Usa só bash e node.
set -euo pipefail

[ -f package.json ] && grep -q '"name": "twisisa"' package.json || { echo "Corre este script na raiz do projeto twisisa."; exit 1; }

mkdir -p lib tests app/admin/materiais/novo components/admin

cat > 'lib/material-inference.ts' <<'TWISISA_EOF'
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
TWISISA_EOF
echo '  ok  lib/material-inference.ts'

cat > 'tests/material-inference.test.ts' <<'TWISISA_EOF'
import test from 'node:test'
import assert from 'node:assert/strict'
import { inferFromPath, normalize, titleFromFilename, type InferCatalog } from '../lib/material-inference'

const catalog: InferCatalog = {
  categories: [{ slug: 'exames', name: 'Exames de admissão' }, { slug: 'fichas', name: 'Fichas de exercícios' }, { slug: 'resumos', name: 'Resumos' }],
  subjects: [{ id: 's-mat', name: 'Matemática' }, { id: 's-fis', name: 'Física' }, { id: 's-port', name: 'Português' }],
  levels: [{ id: 'l-10', name: '10.ª classe' }, { id: 'l-12', name: '12.ª classe' }, { id: 'l-sup', name: 'Ensino superior' }],
  institutions: [{ shortName: 'UEM', name: 'Universidade Eduardo Mondlane' }, { shortName: 'UP', name: 'Universidade Pedagógica' }],
}
const now = new Date('2026-10-31')

test('normalize: sem acentos e com espaços nas pontas', () => {
  assert.equal(normalize('Matemática_2023.pdf'), ' matematica 2023 pdf ')
})

test('título: sem extensão, sublinhados nem cópias', () => {
  assert.equal(titleFromFilename('exame_matematica_2023 (1).pdf'), 'Exame matematica 2023')
  assert.equal(titleFromFilename('resumo.PDF'), 'Resumo')
})

test('deteta tudo a partir de pastas e nome', () => {
  const r = inferFromPath('Matemática/UEM/2023/Exame de admissão 12ª classe.pdf', catalog, now)
  assert.deepEqual(r, { year: '2023', subject: 's-mat', institution: 'UEM', level: 'l-12', category: 'exames' })
})

test('o nome do ficheiro manda no ano; pastas servem de recurso', () => {
  assert.equal(inferFromPath('2021/exame 2023.pdf', catalog, now).year, '2023')
  assert.equal(inferFromPath('2021/exame.pdf', catalog, now).year, '2021')
  assert.equal(inferFromPath('exame 1850.pdf', catalog, now).year, undefined)
  assert.equal(inferFromPath('exame 20231.pdf', catalog, now).year, undefined)
})

test('palavras inteiras: «up» não aparece dentro de «group»', () => {
  assert.equal(inferFromPath('group work.pdf', catalog, now).institution, undefined)
  assert.equal(inferFromPath('Exame UP 2024.pdf', catalog, now).institution, 'UP')
})

test('categoria ambígua não é adivinhada', () => {
  assert.equal(inferFromPath('exames fichas.pdf', catalog, now).category, undefined)
  assert.equal(inferFromPath('Resumo de física.pdf', catalog, now).category, 'resumos')
  assert.equal(inferFromPath('sem pistas.pdf', catalog, now).subject, undefined)
})

test('classe por número e nível por nome', () => {
  assert.equal(inferFromPath('teste 10 classe.pdf', catalog, now).level, 'l-10')
  assert.equal(inferFromPath('apontamentos ensino superior.pdf', catalog, now).level, 'l-sup')
})

test('categorias reais: plural do catálogo, singular no ficheiro', () => {
  const real: InferCatalog = { ...catalog, categories: [{ slug: 'exames', name: 'Exames anteriores' }, { slug: 'fichas', name: 'Fichas de exercícios' }, { slug: 'livros', name: 'Livros e manuais' }, { slug: 'guias', name: 'Guias de estudo' }] }
  assert.equal(inferFromPath('Exame 2023.pdf', real, now).category, 'exames')
  assert.equal(inferFromPath('Ficha 3.pdf', real, now).category, 'fichas')
  assert.equal(inferFromPath('Manual de química.pdf', real, now).category, 'livros')
  assert.equal(inferFromPath('Guia.pdf', real, now).category, 'guias')
})
TWISISA_EOF
echo '  ok  tests/material-inference.test.ts'

cat > 'app/admin/materiais/actions.ts' <<'TWISISA_EOF'
'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { destroyMaterialFile } from '@/lib/cloudinary-server'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

function mimeFromName(name: string) {
  const extension = name.toLowerCase().split('.').pop() ?? ''
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream'
}

const MAX_BATCH = 50

export type PublishItem = {
  key: string
  title: string
  description: string
  category: string // slug
  subject: string // id
  level: string // id
  institution: string // sigla (short_name)
  course: string
  year: string
  fileUrl: string
  fileName: string
  fileSize: number
}

export type PublishResult = { key: string; ok: boolean; message?: string }
export type PublishResponse = { ok: true; results: PublishResult[] } | { ok: false; message: string }

// Publica uma remessa de materiais já carregados no Cloudinary. Cada material é validado e gravado à parte:
// se um falhar, os outros seguem. A classificação vem por identificadores (nada de texto livre para disciplina ou instituição).
export async function publishMaterials(items: PublishItem[]): Promise<PublishResponse> {
  let admin
  try {
    admin = await requireAdmin()
  } catch (error) {
    return { ok: false, message: error instanceof AppError ? error.message : 'Acesso reservado à administração.' }
  }
  if (!Array.isArray(items) || items.length === 0) return { ok: true, results: [] }
  if (items.length > MAX_BATCH) return { ok: false, message: `Máximo de ${MAX_BATCH} materiais por remessa.` }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  if (!cloudName) return { ok: false, message: 'O Cloudinary não está configurado no servidor.' }

  const client = await pool.connect()
  try {
    const [categories, subjects, levels, institutions] = await Promise.all([
      client.query('SELECT id, slug FROM library_categories WHERE active = true'),
      client.query('SELECT id FROM library_subjects WHERE active = true'),
      client.query('SELECT id FROM library_levels WHERE active = true'),
      client.query('SELECT short_name FROM institutions'),
    ])
    const categoryBySlug = new Map<string, string>(categories.rows.map((row) => [row.slug as string, row.id as string]))
    const subjectIds = new Set<string>(subjects.rows.map((row) => row.id as string))
    const levelIds = new Set<string>(levels.rows.map((row) => row.id as string))
    const institutionByLower = new Map<string, string>(institutions.rows.map((row) => [(row.short_name as string).toLowerCase(), row.short_name as string]))

    const results: PublishResult[] = []
    await client.query('BEGIN')
    for (const item of items) {
      const fail = (message: string) => results.push({ key: item.key, ok: false, message })
      const title = String(item.title ?? '').trim()
      const fileName = String(item.fileName ?? '').trim()
      const categoryId = categoryBySlug.get(String(item.category ?? ''))
      if (!title || title.length > 180) { fail('O título tem de ter entre 1 e 180 caracteres.'); continue }
      if (!categoryId) { fail('Falta uma categoria válida.'); continue }
      if (!fileName || fileName.length > 240) { fail('Nome de ficheiro inválido.'); continue }
      if (item.subject && !subjectIds.has(item.subject)) { fail('A disciplina escolhida já não existe.'); continue }
      if (item.level && !levelIds.has(item.level)) { fail('O nível escolhido já não existe.'); continue }
      const institution = item.institution ? institutionByLower.get(String(item.institution).toLowerCase()) : null
      if (item.institution && !institution) { fail('A instituição escolhida já não existe.'); continue }
      const year = item.year ? Number(item.year) : null
      if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) { fail('Ano inválido.'); continue }
      const description = String(item.description ?? '').trim().slice(0, 1200)
      const course = String(item.course ?? '').trim().slice(0, 180)

      let url: URL
      try { url = new URL(String(item.fileUrl ?? '')) } catch { fail('O URL do documento não é válido.'); continue }
      if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(`/${cloudName}/`)) {
        fail('O documento tem de ser carregado através do upload.')
        continue
      }
      const size = Number.isFinite(item.fileSize) && item.fileSize > 0 && item.fileSize < 2_000_000_000 ? Math.round(item.fileSize) : null

      await client.query('SAVEPOINT item')
      try {
        await client.query(
          `INSERT INTO academic_materials
           (id, title, description, file_url, file_name, mime_type, file_size_bytes, category_id, subject_id, level_id, institution_name, course_name, academic_year, author_id, status, reviewed_by, reviewed_at, published_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'approved',$14,now(),now())`,
          [randomUUID(), title, description, url.toString(), fileName, mimeFromName(fileName), size, categoryId, item.subject || null, item.level || null, institution, course || null, year, admin.id],
        )
        await client.query('RELEASE SAVEPOINT item')
        results.push({ key: item.key, ok: true })
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT item')
        console.error('[ADMIN MATERIAIS] Falha ao gravar', item.key, error)
        fail('Não foi possível gravar este material.')
      }
    }
    await client.query('COMMIT')
    // A lista e a biblioteca revalidam-se uma vez, no fim (finishUpload), e não a cada remessa.
    return { ok: true, results }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    console.error('[ADMIN MATERIAIS] Remessa falhou', error)
    return { ok: false, message: 'Não foi possível publicar esta remessa. Tenta outra vez.' }
  } finally {
    client.release()
  }
}

// Chamada uma vez quando termina o envio: atualiza a lista de materiais e a biblioteca.
export async function finishUpload(): Promise<void> {
  try {
    await requireAdmin()
    revalidatePath('/admin/materiais')
    revalidatePath('/biblioteca')
  } catch {
    // Sem permissão: não há nada a revalidar.
  }
}

// Devolve, dos nomes recebidos, os que já existem na biblioteca (para não carregar duas vezes o mesmo ficheiro).
export async function findExistingMaterials(fileNames: string[]): Promise<{ ok: true; names: string[] } | { ok: false; message: string }> {
  try {
    await requireAdmin()
    const names = (Array.isArray(fileNames) ? fileNames : []).map((name) => String(name)).filter(Boolean).slice(0, 300)
    if (names.length === 0) return { ok: true, names: [] }
    const result = await pool.query('SELECT DISTINCT file_name FROM academic_materials WHERE file_name = ANY($1::text[])', [names])
    return { ok: true, names: result.rows.map((row) => row.file_name as string) }
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[ADMIN MATERIAIS] Verificação de duplicados falhou', error)
    return { ok: false, message: 'Não foi possível verificar duplicados.' }
  }
}

export async function deleteAcademicMaterial(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    if (!id) throw new AppError('Material inválido.')

    // Apaga o registo (favoritos, downloads e denúncias saem por ON DELETE CASCADE).
    const removed = await pool.query('DELETE FROM academic_materials WHERE id = $1 RETURNING file_url', [id])
    if (!removed.rowCount) throw new AppError('Esse material já não existe.')

    // Depois apaga o ficheiro no Cloudinary; se falhar, o material já não aparece mas o ficheiro fica órfão.
    const fileRemoved = await destroyMaterialFile(removed.rows[0].file_url)
    if (!fileRemoved) console.error('[ADMIN MATERIAIS] Ficheiro não removido do Cloudinary:', removed.rows[0].file_url)

    revalidatePath('/admin/materiais')
    revalidatePath('/biblioteca')
    return fileRemoved
      ? 'Material eliminado.'
      : 'Material eliminado da biblioteca, mas o ficheiro não foi removido do Cloudinary. Apaga-o no painel do Cloudinary.'
  }, 'Não foi possível eliminar o material. Tenta outra vez.')
}
TWISISA_EOF
echo '  ok  app/admin/materiais/actions.ts'

cat > 'app/admin/materiais/page.tsx' <<'TWISISA_EOF'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, ExternalLink, Plus } from 'lucide-react'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { deleteAcademicMaterial } from './actions'
import { DeleteMaterialButton } from '@/components/admin/delete-material-button'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminPager, AdminSearchBar, normalizeSearch } from '@/components/admin/page-parts'
import { UrlFeedback } from '@/components/url-feedback'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Administração de materiais | Twisisa' }

const PAGE_SIZE = 15

type Material = { id: string; title: string; category: string; subject: string; status: string }

function pageHref(q: string, page: number) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('pagina', String(page))
  const query = params.toString()
  return query ? `/admin/materiais?${query}` : '/admin/materiais'
}

export default async function AdminMateriaisPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)
  const requested = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1)

  let materials: Material[] | null = null
  let total = 0
  let page = requested
  try {
    // Pesquisa sem acentos nem maiúsculas: «portugues» encontra «Português».
    const term = normalizeSearch(q)
    const like = term ? `%${term.replace(/[\\%_]/g, '\\$&')}%` : null
    const where = `WHERE ($1::text IS NULL OR translate(lower(m.title), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE $1)`
    const count = await pool.query(`SELECT count(*)::int AS n FROM academic_materials m ${where}`, [like])
    total = count.rows[0].n
    page = Math.min(requested, Math.max(1, Math.ceil(total / PAGE_SIZE)))
    const list = await pool.query(
      `SELECT m.id, m.title, c.name AS category, COALESCE(s.name, '') AS subject, m.status
       FROM academic_materials m JOIN library_categories c ON c.id = m.category_id LEFT JOIN library_subjects s ON s.id = m.subject_id
       ${where} ORDER BY m.created_at DESC, m.id LIMIT ${PAGE_SIZE} OFFSET $2`,
      [like, (page - 1) * PAGE_SIZE],
    )
    materials = list.rows
  } catch (error) {
    console.error('[ADMIN MATERIAIS]', error)
  }
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const countLabel = materials ? (q ? `${total} ${total === 1 ? 'resultado' : 'resultados'}` : `${total} ${total === 1 ? 'material' : 'materiais'}`) : undefined

  return (
    <AdminPage>
      <UrlFeedback />
      <AdminPageHeader
        icon={BookOpen}
        title="Materiais académicos"
        description="Consulta, abre e elimina os recursos da Biblioteca. Podes carregar vários de uma vez."
        action={
          <Link href="/admin/materiais/novo" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1d4d41] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#163e34] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4d41]">
            <Plus size={18} aria-hidden="true" />Adicionar
          </Link>
        }
      />
      <AdminSearchBar q={q} placeholder="Pesquisar título" countLabel={countLabel} />

      <AdminListPanel>
        {materials === null ? (
          <AdminLoadError href={pageHref(q, page)} />
        ) : materials.length === 0 ? (
          <div className="m-4">
            {q ? (
              <EmptyState title="Sem resultados" description={`Nenhum material tem “${q}” no título.`} actionLabel="Limpar pesquisa" actionHref="/admin/materiais" />
            ) : (
              <EmptyState title="Ainda sem materiais" description="Usa o botão Adicionar para publicar os primeiros." />
            )}
          </div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium leading-5">{m.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[#737c75]">
                    {m.category}{m.subject ? ` · ${m.subject}` : ''}
                    <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.status === 'approved' ? 'bg-[#e6f0e9] text-[#1d4d41]' : 'bg-[#f4eddb] text-[#805f19]'}`}>{m.status === 'approved' ? 'Publicado' : m.status}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a href={`/api/biblioteca/${m.id}/ficheiro`} target="_blank" rel="noreferrer" aria-label={`Abrir ${m.title}`} className="rounded-lg p-2 text-[#1d4d41] hover:bg-[#f1f4ef]"><ExternalLink size={17} /></a>
                  <DeleteMaterialButton id={m.id} title={m.title} action={deleteAcademicMaterial} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {materials && total > 0 && <AdminPager page={page} pages={pages} prevHref={pageHref(q, page - 1)} nextHref={pageHref(q, page + 1)} />}
      </AdminListPanel>
    </AdminPage>
  )
}
TWISISA_EOF
echo '  ok  app/admin/materiais/page.tsx'

cat > 'app/admin/materiais/novo/page.tsx' <<'TWISISA_EOF'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Upload } from 'lucide-react'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { AdminLoadError, AdminPage, AdminPageHeader } from '@/components/admin/page-parts'
import { MaterialBulk, type Catalog } from '@/components/admin/material-bulk'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Adicionar materiais | Twisisa' }

// Anos para classificar materiais: desde 2000 até ao ano seguinte ao atual, do mais recente para o mais antigo.
function materialYears(now = new Date()) {
  const last = now.getFullYear() + 1
  return Array.from({ length: last - 2000 + 1 }, (_, index) => last - index)
}

export default async function NovoMaterialPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')

  let catalog: Catalog | null = null
  try {
    const [categories, subjects, levels, institutions] = await Promise.all([
      pool.query('SELECT slug, name FROM library_categories WHERE active = true ORDER BY sort_order, name'),
      pool.query('SELECT id, name FROM library_subjects WHERE active = true ORDER BY name'),
      pool.query('SELECT id, name FROM library_levels WHERE active = true ORDER BY sort_order, name'),
      pool.query('SELECT short_name, name FROM institutions WHERE active = true ORDER BY short_name'),
    ])
    catalog = {
      categories: categories.rows,
      subjects: subjects.rows,
      levels: levels.rows,
      institutions: institutions.rows.map((row) => ({ shortName: row.short_name as string, name: row.name as string })),
      years: materialYears(),
    }
  } catch (error) {
    console.error('[ADMIN MATERIAIS NOVO]', error)
  }

  return (
    <AdminPage>
      <AdminPageHeader
        icon={Upload}
        title="Adicionar materiais"
        description="Escolhe vários ficheiros ou uma pasta e classifica tudo de uma vez."
        action={<Link href="/admin/materiais" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#c9d7cd] bg-white/80 px-4 text-sm font-semibold text-[#1d4d41] shadow-sm hover:bg-white"><ArrowLeft size={16} aria-hidden="true" />Materiais</Link>}
      />
      {catalog ? <MaterialBulk catalog={catalog} /> : <AdminLoadError href="/admin/materiais/novo" />}
    </AdminPage>
  )
}
TWISISA_EOF
echo '  ok  app/admin/materiais/novo/page.tsx'

cat > 'app/admin/materiais/novo/loading.tsx' <<'TWISISA_EOF'
import { AdminMateriaisNovoSkeleton } from '@/components/skeletons/admin-skeleton'

export default function Loading() {
  return <AdminMateriaisNovoSkeleton />
}
TWISISA_EOF
echo '  ok  app/admin/materiais/novo/loading.tsx'

cat > 'components/admin/material-bulk.tsx' <<'TWISISA_EOF'
'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, FolderOpen, RotateCcw, Trash2, Upload } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { finishUpload, findExistingMaterials, publishMaterials, type PublishItem } from '@/app/admin/materiais/actions'
import { inferFromPath, titleFromFilename, type Inferred } from '@/lib/material-inference'

// Carregamento de vários materiais de uma vez.
//  1. Escolhe ficheiros (ou uma pasta inteira).
//  2. Define uma vez o que vale para todos (categoria, disciplina, instituição, ano…). O que não definires é detetado
//     pelo nome do ficheiro e pelas pastas.
//  3. Corrige o que for preciso: seleciona linhas e aplica um valor a todas de uma vez.
//  4. Publica: os ficheiros vão directamente ao Cloudinary (3 de cada vez) e são registados em remessas.
// Quem decide a classificação de cada material: valor escolhido para ele > valor para todos > deteção automática.

export type Catalog = {
  categories: { slug: string; name: string }[]
  subjects: { id: string; name: string }[]
  levels: { id: string; name: string }[]
  institutions: { shortName: string; name: string }[]
  years: number[]
}

type FieldKey = 'category' | 'subject' | 'level' | 'institution' | 'year' | 'course'
type Fields = Record<FieldKey, string>
type Status = 'pendente' | 'a_enviar' | 'a_publicar' | 'publicado' | 'erro' | 'existe'

type Row = {
  key: string
  file: File
  path: string
  title: string
  overrides: Partial<Fields>
  inferred: Inferred
  selected: boolean
  status: Status
  progress: number
  message: string
  allowDuplicate: boolean
}

type SignData = { cloudName: string; apiKey: string; signature: string; timestamp: string | number; folder: string; use_filename: string; unique_filename: string }

const MAX_MB = 10
const EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp'])
const ACCEPT = [...EXTENSIONS].map((ext) => `.${ext}`).join(',')
const CONCURRENCY = 3
const BATCH = 20
const SIGN_TTL_MS = 30 * 60 * 1000
const EMPTY: Fields = { category: '', subject: '', level: '', institution: '', year: '', course: '' }

const input = 'h-10 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 text-sm outline-none transition-colors focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10 disabled:opacity-60'
const btn = 'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40'
const btnSolid = `${btn} bg-[#1d4d41] text-white hover:bg-[#163e34]`
const btnLine = `${btn} border border-[#c9d7cd] bg-white text-[#1d4d41] hover:bg-[#f1f4ef]`

const extensionOf = (name: string) => name.toLowerCase().split('.').pop() ?? ''
const rowKey = (file: File, path: string) => `${path}|${file.size}|${file.lastModified}`

type Lookups = { category: Map<string, string>; subject: Map<string, string>; level: Map<string, string>; institution: Map<string, string> }

function effective(row: Row, key: FieldKey, defaults: Fields, detect: boolean): { value: string; detected: boolean } {
  const own = row.overrides[key]
  if (own) return { value: own, detected: false }
  if (defaults[key]) return { value: defaults[key], detected: false }
  const guess = detect && key !== 'course' ? row.inferred[key] : undefined
  return guess ? { value: guess, detected: true } : { value: '', detected: false }
}

function FieldInputs({ values, onChange, catalog, blank, disabled }: { values: Fields; onChange: (key: FieldKey, value: string) => void; catalog: Catalog; blank: string; disabled?: boolean }) {
  const select = (key: FieldKey, label: string, options: { value: string; label: string }[]) => (
    <label className="grid gap-1 text-xs font-semibold text-[#526057]">
      {label}
      <select value={values[key]} onChange={(event) => onChange(key, event.target.value)} disabled={disabled} className={input}>
        <option value="">{blank}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {select('category', 'Categoria', catalog.categories.map((c) => ({ value: c.slug, label: c.name })))}
      {select('subject', 'Disciplina', catalog.subjects.map((s) => ({ value: s.id, label: s.name })))}
      {select('level', 'Classe / nível', catalog.levels.map((l) => ({ value: l.id, label: l.name })))}
      {select('institution', 'Instituição', catalog.institutions.map((i) => ({ value: i.shortName, label: `${i.shortName} · ${i.name}` })))}
      {select('year', 'Ano', catalog.years.map((y) => ({ value: String(y), label: String(y) })))}
      <label className="grid gap-1 text-xs font-semibold text-[#526057]">
        Curso
        <input value={values.course} onChange={(event) => onChange('course', event.target.value)} maxLength={180} disabled={disabled} placeholder={blank} className={input} />
      </label>
    </div>
  )
}

type RowProps = {
  row: Row
  defaults: Fields
  detect: boolean
  lookups: Lookups
  locked: boolean
  onSelect: (key: string, checked: boolean) => void
  onTitle: (key: string, title: string) => void
  onRetry: (key: string) => void
  onAllowDuplicate: (key: string) => void
}

const RowItem = memo(function RowItem({ row, defaults, detect, lookups, locked, onSelect, onTitle, onRetry, onAllowDuplicate }: RowProps) {
  const chips: { text: string; detected: boolean; missing?: boolean }[] = []
  const category = effective(row, 'category', defaults, detect)
  const add = (key: FieldKey, map: Map<string, string>) => {
    const { value, detected } = effective(row, key, defaults, detect)
    if (value) chips.push({ text: map.get(value) ?? value, detected })
  }
  chips.push(category.value ? { text: lookups.category.get(category.value) ?? category.value, detected: category.detected } : { text: 'Sem categoria', detected: false, missing: true })
  add('subject', lookups.subject)
  add('level', lookups.level)
  add('institution', lookups.institution)
  const year = effective(row, 'year', defaults, detect)
  if (year.value) chips.push({ text: year.value, detected: year.detected })

  const busy = row.status === 'a_enviar' || row.status === 'a_publicar'
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 [contain-intrinsic-size:auto_64px] [content-visibility:auto] sm:px-5">
      <input type="checkbox" checked={row.selected} disabled={locked || row.status === 'publicado'} onChange={(event) => onSelect(row.key, event.target.checked)} aria-label={`Selecionar ${row.file.name}`} className="size-4 shrink-0 accent-[#1d4d41]" />
      <div className="min-w-0 flex-1 basis-60">
        <input
          value={row.title}
          onChange={(event) => onTitle(row.key, event.target.value)}
          disabled={locked || row.status === 'publicado'}
          maxLength={180}
          aria-label={`Título de ${row.file.name}`}
          className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-medium outline-none hover:border-[#dfe3d9] focus:border-[#1d4d41] focus:bg-white disabled:opacity-70"
        />
        <p className="truncate px-2 text-xs text-[#737c75]" title={row.path}>{row.path} · {(row.file.size / 1048576).toFixed(1)} MB</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {chips.map((chip, index) => (
          <span key={index} title={chip.detected ? 'Detetado pelo nome ou pasta' : undefined} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip.missing ? 'bg-[#fbeeee] text-[#9a3030]' : chip.detected ? 'border border-dashed border-[#b9c8bd] bg-white text-[#526057]' : 'bg-[#e6f0e9] text-[#1d4d41]'}`}>{chip.text}</span>
        ))}
      </div>
      <div className="flex w-32 shrink-0 items-center justify-end gap-1.5 text-xs" aria-live="polite">
        {row.status === 'a_enviar' && <><Spinner className="size-3.5 text-[#1d4d41]" /><span className="text-[#526057]">{row.progress}%</span></>}
        {row.status === 'a_publicar' && <><Spinner className="size-3.5 text-[#1d4d41]" /><span className="text-[#526057]">A publicar</span></>}
        {row.status === 'publicado' && <span className="inline-flex items-center gap-1 font-semibold text-[#1d4d41]"><Check size={14} aria-hidden="true" />Publicado</span>}
        {row.status === 'erro' && (
          <span className="flex flex-col items-end gap-0.5 text-right">
            <span className="font-medium text-[#9a3030]">{row.message || 'Falhou'}</span>
            {row.file.size <= MAX_MB * 1048576 && <button type="button" onClick={() => onRetry(row.key)} disabled={locked} className="inline-flex items-center gap-1 font-semibold text-[#1d4d41] underline disabled:opacity-40"><RotateCcw size={12} aria-hidden="true" />Repetir</button>}
          </span>
        )}
        {row.status === 'existe' && (
          <span className="flex flex-col items-end gap-0.5 text-right">
            <span className="font-medium text-[#805f19]">Já existe</span>
            <button type="button" onClick={() => onAllowDuplicate(row.key)} disabled={locked} className="font-semibold text-[#1d4d41] underline disabled:opacity-40">Enviar mesmo assim</button>
          </span>
        )}
        {!busy && row.status === 'pendente' && <span className="text-[#737c75]">Por enviar</span>}
      </div>
    </li>
  )
})

type Filter = 'todos' | 'incompletos' | 'erros' | 'existem'

// Percorre pastas arrastadas para dentro do ecrã (guarda o caminho de cada ficheiro, para detetar a classificação).
async function walk(entry: FileSystemEntry, prefix: string, out: { file: File; path: string }[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File | null>((resolve) => (entry as FileSystemFileEntry).file(resolve, () => resolve(null)))
    if (file) out.push({ file, path: `${prefix}${entry.name}` })
    return
  }
  if (!entry.isDirectory) return
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])))
    if (batch.length === 0) break
    for (const child of batch) await walk(child, `${prefix}${entry.name}/`, out)
  }
}

export function MaterialBulk({ catalog }: { catalog: Catalog }) {
  const [rows, setRows] = useState<Row[]>([])
  const [defaults, setDefaults] = useState<Fields>(EMPTY)
  const [detect, setDetect] = useState(true)
  const [apply, setApply] = useState<Fields>(EMPTY)
  const [filter, setFilter] = useState<Filter>('todos')
  const [query, setQuery] = useState('')
  const [running, setRunning] = useState(false)
  const [checking, setChecking] = useState(false)
  const [notice, setNotice] = useState('')
  const [dragging, setDragging] = useState(false)

  const rowsRef = useRef<Row[]>([])
  const defaultsRef = useRef(defaults)
  const detectRef = useRef(detect)
  const stopRef = useRef(false)
  const runningRef = useRef(false)
  const xhrs = useRef(new Set<XMLHttpRequest>())
  const urlsRef = useRef(new Map<string, string>())
  const runKeysRef = useRef(new Set<string>())
  const signRef = useRef<{ promise: Promise<SignData>; at: number } | null>(null)
  const filesInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  useEffect(() => { rowsRef.current = rows }, [rows])
  useEffect(() => { defaultsRef.current = defaults }, [defaults])
  useEffect(() => { detectRef.current = detect }, [detect])

  // Aviso ao sair a meio do envio.
  useEffect(() => {
    if (!running) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [running])

  const lookups = useMemo<Lookups>(() => ({
    category: new Map(catalog.categories.map((c) => [c.slug, c.name])),
    subject: new Map(catalog.subjects.map((s) => [s.id, s.name])),
    level: new Map(catalog.levels.map((l) => [l.id, l.name])),
    institution: new Map(catalog.institutions.map((i) => [i.shortName, i.shortName])),
  }), [catalog])

  const patch = useCallback((key: string, change: Partial<Row>) => {
    setRows((previous) => {
      const next = previous.map((row) => (row.key === key ? { ...row, ...change } : row))
      rowsRef.current = next
      return next
    })
  }, [])

  const patchMany = useCallback((keys: Set<string>, change: (row: Row) => Partial<Row>) => {
    setRows((previous) => {
      const next = previous.map((row) => (keys.has(row.key) ? { ...row, ...change(row) } : row))
      rowsRef.current = next
      return next
    })
  }, [])

  // ---------- Adicionar ficheiros ----------
  async function addFiles(list: { file: File; path: string }[]) {
    if (running) return
    const known = new Set(rowsRef.current.map((row) => row.key))
    const fresh: Row[] = []
    let ignored = 0
    for (const { file, path } of list) {
      if (!EXTENSIONS.has(extensionOf(file.name))) { ignored++; continue }
      const key = rowKey(file, path)
      if (known.has(key)) continue
      known.add(key)
      const tooBig = file.size > MAX_MB * 1048576
      fresh.push({
        key, file, path, title: titleFromFilename(file.name), overrides: {}, inferred: inferFromPath(path, catalog), selected: false,
        status: tooBig ? 'erro' : 'pendente', progress: 0, allowDuplicate: false,
        message: tooBig ? `${(file.size / 1048576).toFixed(1)} MB: o limite é ${MAX_MB} MB` : '',
      })
    }
    setNotice(ignored > 0 ? `${ignored} ${ignored === 1 ? 'ficheiro ignorado' : 'ficheiros ignorados'} (tipo não suportado).` : '')
    if (fresh.length === 0) return
    setRows((previous) => { const next = [...previous, ...fresh]; rowsRef.current = next; return next })

    // Marca o que já existe na biblioteca (mesmo nome de ficheiro).
    setChecking(true)
    try {
      const names = [...new Set(fresh.filter((row) => row.status === 'pendente').map((row) => row.file.name))]
      const existing = new Set<string>()
      for (let i = 0; i < names.length; i += 200) {
        const result = await findExistingMaterials(names.slice(i, i + 200))
        if (!result.ok) { setNotice(result.message); break }
        result.names.forEach((name) => existing.add(name))
      }
      if (existing.size > 0) {
        const keys = new Set(fresh.filter((row) => existing.has(row.file.name)).map((row) => row.key))
        patchMany(keys, (row) => (row.status === 'pendente' && !row.allowDuplicate ? { status: 'existe', message: '' } : {}))
      }
    } catch {
      setNotice('Não foi possível verificar duplicados.')
    } finally {
      setChecking(false)
    }
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).map((file) => ({ file, path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name }))
    event.target.value = ''
    void addFiles(files)
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragging(false)
    // As entradas têm de ser lidas já, dentro do evento: depois deixam de estar disponíveis.
    const entries = Array.from(event.dataTransfer.items ?? []).map((item) => item.webkitGetAsEntry?.() ?? null)
    if (entries.some(Boolean)) {
      void (async () => {
        const found: { file: File; path: string }[] = []
        for (const entry of entries) if (entry) await walk(entry, '', found)
        await addFiles(found)
      })()
    } else {
      void addFiles(Array.from(event.dataTransfer.files).map((file) => ({ file, path: file.name })))
    }
  }

  // ---------- Seleção e edição ----------
  const onSelect = useCallback((key: string, checked: boolean) => patch(key, { selected: checked }), [patch])
  const onTitle = useCallback((key: string, title: string) => patch(key, { title }), [patch])
  const onRetry = useCallback((key: string) => patch(key, { status: 'pendente', message: '' }), [patch])
  const onAllowDuplicate = useCallback((key: string) => patch(key, { status: 'pendente', allowDuplicate: true }), [patch])

  const counts = useMemo(() => {
    let ready = 0, incomplete = 0, done = 0, errors = 0, exist = 0, selected = 0
    for (const row of rows) {
      if (row.selected) selected++
      if (row.status === 'publicado') done++
      else if (row.status === 'erro') errors++
      else if (row.status === 'existe') exist++
      else if (row.status === 'pendente') (effective(row, 'category', defaults, detect).value ? ready++ : incomplete++)
    }
    return { ready, incomplete, done, errors, exist, selected }
  }, [rows, defaults, detect])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (needle && !row.title.toLowerCase().includes(needle) && !row.path.toLowerCase().includes(needle)) return false
      if (filter === 'incompletos') return row.status === 'pendente' && !effective(row, 'category', defaults, detect).value
      if (filter === 'erros') return row.status === 'erro'
      if (filter === 'existem') return row.status === 'existe'
      return true
    })
  }, [rows, query, filter, defaults, detect])

  const allVisibleSelected = visible.length > 0 && visible.every((row) => row.selected || row.status === 'publicado')

  function toggleVisible(checked: boolean) {
    patchMany(new Set(visible.filter((row) => row.status !== 'publicado').map((row) => row.key)), () => ({ selected: checked }))
  }

  function applyToSelected() {
    const keys = new Set(rows.filter((row) => row.selected).map((row) => row.key))
    const changes = (Object.keys(apply) as FieldKey[]).filter((key) => apply[key].trim())
    if (keys.size === 0 || changes.length === 0) return
    patchMany(keys, (row) => ({ overrides: { ...row.overrides, ...Object.fromEntries(changes.map((key) => [key, apply[key].trim()])) } }))
    setApply(EMPTY)
  }

  const clearOverrides = () => patchMany(new Set(rows.filter((row) => row.selected).map((row) => row.key)), () => ({ overrides: {} }))
  const removeSelected = () => {
    setRows((previous) => { const next = previous.filter((row) => !row.selected || row.status === 'a_enviar' || row.status === 'a_publicar'); rowsRef.current = next; return next })
  }
  const clearAll = () => { setRows([]); rowsRef.current = []; setNotice('') }

  // ---------- Envio ----------
  function getSign(): Promise<SignData> {
    const cached = signRef.current
    if (cached && Date.now() - cached.at < SIGN_TTL_MS) return cached.promise
    const promise = fetch('/api/admin/cloudinary-sign', { method: 'POST' }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível preparar o carregamento.')
      return data as SignData
    })
    signRef.current = { promise, at: Date.now() }
    promise.catch(() => { if (signRef.current?.promise === promise) signRef.current = null })
    return promise
  }

  function uploadFile(row: Row, sign: SignData): Promise<string> {
    return new Promise((resolve, reject) => {
      const body = new FormData()
      body.append('file', row.file)
      body.append('api_key', sign.apiKey)
      body.append('timestamp', String(sign.timestamp))
      body.append('signature', sign.signature)
      body.append('folder', sign.folder)
      body.append('use_filename', sign.use_filename)
      body.append('unique_filename', sign.unique_filename)
      const xhr = new XMLHttpRequest()
      xhrs.current.add(xhr)
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`)
      let last = -1
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return
        const percent = Math.round((event.loaded / event.total) * 100)
        if (percent !== last && (percent - last >= 5 || percent === 100)) { last = percent; patch(row.key, { progress: percent }) }
      }
      xhr.onload = () => {
        xhrs.current.delete(xhr)
        let data: { secure_url?: string; error?: { message?: string } } | null = null
        try { data = JSON.parse(xhr.responseText) } catch { data = null }
        if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url) resolve(data.secure_url)
        else reject(new Error(data?.error?.message ?? 'O Cloudinary recusou o ficheiro.'))
      }
      xhr.onerror = () => { xhrs.current.delete(xhr); reject(new Error('Sem ligação ao Cloudinary.')) }
      xhr.onabort = () => { xhrs.current.delete(xhr); reject(new Error('stopped')) }
      xhr.send(body)
    })
  }

  function toItem(row: Row): PublishItem {
    const d = defaultsRef.current
    const on = detectRef.current
    const value = (key: FieldKey) => effective(row, key, d, on).value
    return {
      key: row.key, title: row.title.trim() || titleFromFilename(row.file.name), description: '', category: value('category'), subject: value('subject'), level: value('level'),
      institution: value('institution'), course: value('course'), year: value('year'), fileUrl: urlsRef.current.get(row.key) ?? '', fileName: row.file.name, fileSize: row.file.size,
    }
  }

  async function publishBatch(items: PublishItem[]) {
    const keys = new Set(items.map((item) => item.key))
    patchMany(keys, () => ({ status: 'a_publicar' as Status }))
    try {
      const response = await publishMaterials(items)
      if (!response.ok) {
        patchMany(keys, () => ({ status: 'erro' as Status, message: response.message }))
        return
      }
      const byKey = new Map(response.results.map((result) => [result.key, result]))
      patchMany(keys, (row) => {
        const result = byKey.get(row.key)
        return result?.ok ? { status: 'publicado' as Status, selected: false, message: '' } : { status: 'erro' as Status, message: result?.message ?? 'Não foi possível publicar.' }
      })
    } catch {
      patchMany(keys, () => ({ status: 'erro' as Status, message: 'Falha de ligação. Repete.' }))
    }
  }

  async function start() {
    if (runningRef.current || checking) return
    const queue = rowsRef.current
      .filter((row) => row.status === 'pendente' && effective(row, 'category', defaultsRef.current, detectRef.current).value)
      .map((row) => row.key)
    if (queue.length === 0) return
    runningRef.current = true
    stopRef.current = false
    setRunning(true)
    runKeysRef.current = new Set(queue)
    setNotice('')

    const buffer: PublishItem[] = []
    let chain: Promise<void> = Promise.resolve()
    const flush = (force: boolean) => {
      while (buffer.length >= BATCH || (force && buffer.length > 0)) {
        const items = buffer.splice(0, BATCH)
        chain = chain.then(() => publishBatch(items))
      }
    }

    const worker = async () => {
      while (!stopRef.current) {
        const key = queue.shift()
        if (!key) return
        const row = rowsRef.current.find((item) => item.key === key)
        if (!row) continue
        try {
          if (!urlsRef.current.has(key)) {
            patch(key, { status: 'a_enviar', progress: 0, message: '' })
            const sign = await getSign()
            urlsRef.current.set(key, await uploadFile(row, sign))
            patch(key, { progress: 100 })
          }
          buffer.push(toItem(row))
          patch(key, { status: 'a_publicar' })
          flush(false)
        } catch (error) {
          const stopped = error instanceof Error && error.message === 'stopped'
          patch(key, stopped ? { status: 'pendente', progress: 0 } : { status: 'erro', message: error instanceof Error ? error.message : 'Falha no envio.' })
        }
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    flush(true)
    await chain
    runningRef.current = false
    setRunning(false)
    void finishUpload()
  }

  function stop() {
    stopRef.current = true
    xhrs.current.forEach((xhr) => xhr.abort())
  }

  const retryErrors = () => patchMany(new Set(rowsRef.current.filter((row) => row.status === 'erro' && row.file.size <= MAX_MB * 1048576).map((row) => row.key)), () => ({ status: 'pendente' as Status, message: '' }))

  const finished = counts.done + counts.errors
  const runSize = runKeysRef.current.size
  const runDone = running ? rows.filter((row) => runKeysRef.current.has(row.key) && (row.status === 'publicado' || row.status === 'erro')).length : 0
  const pct = runSize > 0 ? Math.min(100, Math.round((runDone / runSize) * 100)) : 0

  // ---------- Ecrã ----------
  if (rows.length === 0) {
    return (
      <div
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${dragging ? 'border-[#1d4d41] bg-[#eef3ee]' : 'border-[#c9d7cd] bg-white'}`}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[#e6f0e9] text-[#1d4d41]"><Upload size={26} aria-hidden="true" /></span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Arrasta os documentos para aqui</h2>
          <p className="mt-1 max-w-md text-sm text-[#5f6d63]">Podes escolher vários ficheiros, ou uma pasta inteira. Depois classificas tudo de uma vez, sem repetir.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => filesInput.current?.click()} className={btnSolid}><Upload size={16} aria-hidden="true" />Escolher ficheiros</button>
          <button type="button" onClick={() => folderInput.current?.click()} className={btnLine}><FolderOpen size={16} aria-hidden="true" />Escolher pasta</button>
        </div>
        <p className="text-xs text-[#737c75]">PDF, Word, PowerPoint, Excel ou imagem. Até {MAX_MB} MB cada. Se as pastas tiverem o nome da disciplina, do ano ou da instituição, detetamo-los.</p>
        {notice && <p role="status" className="text-sm text-[#805f19]">{notice}</p>}
        <input ref={filesInput} type="file" multiple accept={ACCEPT} onChange={onPick} className="sr-only" tabIndex={-1} />
        <input ref={folderInput} type="file" multiple onChange={onPick} className="sr-only" tabIndex={-1} {...({ webkitdirectory: '' } as Record<string, string>)} />
      </div>
    )
  }

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'todos', label: 'Todos', count: rows.length },
    { id: 'incompletos', label: 'Sem categoria', count: counts.incomplete },
    { id: 'erros', label: 'Com erro', count: counts.errors },
    { id: 'existem', label: 'Já existem', count: counts.exist },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <section className="rounded-2xl border border-[#e3e5dc] bg-white p-4 sm:p-5" aria-label="Para todos">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Para todos os documentos</h2>
            <p className="text-xs text-[#737c75]">Define uma vez. O que deixares em branco é detetado pelo nome e pelas pastas.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-[#526057]"><input type="checkbox" checked={detect} onChange={(event) => setDetect(event.target.checked)} className="size-4 accent-[#1d4d41]" />Detetar pelo nome e pasta</label>
        </div>
        <FieldInputs values={defaults} onChange={(key, value) => setDefaults((previous) => ({ ...previous, [key]: value }))} catalog={catalog} blank="Não definir" disabled={running} />
      </section>

      <section className="flex min-h-[18rem] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e3e5dc] bg-white" aria-label="Documentos">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0e9] px-4 py-3 sm:px-5">
          <input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleVisible(event.target.checked)} disabled={running || visible.length === 0} aria-label="Selecionar todos os visíveis" className="size-4 accent-[#1d4d41]" />
          <div role="group" aria-label="Filtro" className="flex flex-wrap gap-1">
            {filters.filter((item) => item.id === 'todos' || item.count > 0).map((item) => (
              <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === item.id ? 'bg-[#1d4d41] text-white' : 'bg-[#eef0ea] text-[#526057] hover:bg-[#e3e7de]'}`}>{item.label} {item.count}</button>
            ))}
          </div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Procurar" aria-label="Procurar na lista" className={`${input} ml-auto h-9 max-w-48`} />
          <button type="button" onClick={() => filesInput.current?.click()} disabled={running} className={`${btnLine} min-h-9 px-3 text-xs`}>Adicionar mais</button>
          <button type="button" onClick={() => folderInput.current?.click()} disabled={running} className={`${btnLine} min-h-9 px-3 text-xs`}><FolderOpen size={14} aria-hidden="true" />Pasta</button>
          <input ref={filesInput} type="file" multiple accept={ACCEPT} onChange={onPick} className="sr-only" tabIndex={-1} />
          <input ref={folderInput} type="file" multiple onChange={onPick} className="sr-only" tabIndex={-1} {...({ webkitdirectory: '' } as Record<string, string>)} />
        </div>

        {counts.selected > 0 && !running && (
          <div className="border-b border-[#edf0e9] bg-[#f6f9f6] px-4 py-3 sm:px-5">
            <p className="mb-2 text-xs font-semibold text-[#1d4d41]">{counts.selected} {counts.selected === 1 ? 'selecionado' : 'selecionados'}: aplica um valor a todos de uma vez</p>
            <FieldInputs values={apply} onChange={(key, value) => setApply((previous) => ({ ...previous, [key]: value }))} catalog={catalog} blank="Não alterar" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={applyToSelected} disabled={!Object.values(apply).some((value) => value.trim())} className={`${btnSolid} min-h-9 px-4 text-xs`}>Aplicar aos selecionados</button>
              <button type="button" onClick={clearOverrides} className={`${btnLine} min-h-9 px-3 text-xs`}>Repor classificação</button>
              <button type="button" onClick={removeSelected} className={`${btnLine} min-h-9 px-3 text-xs text-[#9a3030]`}><Trash2 size={13} aria-hidden="true" />Tirar da lista</button>
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          <p className="m-6 text-center text-sm text-[#737c75]">Nenhum documento neste filtro.</p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto">
            {visible.map((row) => <RowItem key={row.key} row={row} defaults={defaults} detect={detect} lookups={lookups} locked={running} onSelect={onSelect} onTitle={onTitle} onRetry={onRetry} onAllowDuplicate={onAllowDuplicate} />)}
          </ul>
        )}
      </section>

      <footer className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d5e5da] bg-white/95 px-4 py-3 shadow-[0_-6px_24px_-16px_rgba(20,50,40,0.35)] backdrop-blur sm:px-5">
        <div className="min-w-0 flex-1 basis-56" aria-live="polite">
          {running ? (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#e6f0e9]"><div className="h-full rounded-full bg-[#1d4d41] transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
              <p className="mt-1.5 text-xs text-[#526057]">A publicar: {runDone} de {runSize}{counts.errors > 0 ? `, ${counts.errors} com erro` : ''}. Não feches esta página.</p>
            </>
          ) : (
            <p className="text-sm text-[#526057]">
              {counts.done > 0 && <span className="font-semibold text-[#1d4d41]">{counts.done} publicados. </span>}
              {counts.ready > 0 ? `${counts.ready} prontos a publicar` : counts.done > 0 && counts.errors === 0 && counts.incomplete === 0 ? 'Tudo publicado.' : 'Nada pronto a publicar'}
              {counts.incomplete > 0 && <span className="text-[#9a3030]"> · {counts.incomplete} sem categoria</span>}
              {counts.errors > 0 && <span className="text-[#9a3030]"> · {counts.errors} com erro</span>}
              {checking && <span> · a verificar duplicados…</span>}
            </p>
          )}
          {notice && !running && <p role="status" className="mt-0.5 text-xs text-[#805f19]">{notice}</p>}
        </div>
        {!running && counts.errors > 0 && <button type="button" onClick={retryErrors} className={btnLine}><RotateCcw size={15} aria-hidden="true" />Repetir erros</button>}
        {!running && finished > 0 && counts.ready === 0 && <Link href="/admin/materiais" className={btnLine}>Ver materiais</Link>}
        {!running && <button type="button" onClick={clearAll} className={btnLine}>Limpar lista</button>}
        {running ? (
          <button type="button" onClick={stop} className={btnLine}>Parar</button>
        ) : (
          <button type="button" onClick={start} disabled={counts.ready === 0 || checking} className={btnSolid}>{counts.ready > 0 ? `Publicar ${counts.ready} ${counts.ready === 1 ? 'material' : 'materiais'}` : 'Publicar'}</button>
        )}
      </footer>
    </div>
  )
}
TWISISA_EOF
echo '  ok  components/admin/material-bulk.tsx'

# O formulário antigo (um documento de cada vez, disciplina escrita à mão) deixa de ser usado.
if [ -f components/admin/material-upload.tsx ]; then rm components/admin/material-upload.tsx; echo '  rm  components/admin/material-upload.tsx'; fi

# Alterações pequenas em ficheiros existentes (repetível: o que já está aplicado fica como está).
node - <<'JSEOF'
const fs = require("node:fs")
const patches = {
 "components/skeletons/admin-skeleton.tsx": [
  [
   "export function AdminMateriaisSkeleton() {",
   "/** /admin/materiais/novo: cabeçalho e a zona de largar ficheiros. */\nexport function AdminMateriaisNovoSkeleton() {\n  return (\n    <SkeletonRegion label=\"A preparar o carregamento\" className={adminPageSkeletonClass}>\n      <AdminHeaderSkeleton />\n      <div className=\"flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[#d6e2d9] bg-white px-6 py-16\">\n        <Skeleton className=\"size-14 rounded-2xl\" />\n        <Skeleton className=\"h-5 w-64\" />\n        <Skeleton className=\"h-4 w-80 max-w-full\" />\n        <div className=\"flex gap-2\"><Skeleton className=\"h-11 w-40 rounded-xl\" /><Skeleton className=\"h-11 w-36 rounded-xl\" /></div>\n      </div>\n    </SkeletonRegion>\n  )\n}\n\nexport function AdminMateriaisSkeleton() {"
  ]
 ],
 "ADMIN-MATERIAIS.md": [
  [
   "4. Preencha os metadados, escolha o documento e aguarde o fim do carregamento. O material é publicado no catálogo após a gravação.",
   "4. Clique em **Adicionar** (abre `/admin/materiais/novo`). Escolha vários ficheiros ou uma pasta inteira (também se pode arrastar).\n5. Em «Para todos os documentos» defina uma vez a categoria, disciplina, classe, instituição, ano e curso. O que ficar em branco é detetado pelo nome do ficheiro e pelas pastas (ex.: `Matemática/UEM/2023/Exame 12ª classe.pdf`). Prioridade: valor escolhido para o material > valor para todos > deteção automática.\n6. Para corrigir alguns: selecione as linhas e aplique um valor a todas de uma vez («Aplicar aos selecionados»). Os títulos editam-se na própria linha.\n7. Clique em **Publicar**. Os ficheiros vão para o Cloudinary 3 de cada vez e são registados em remessas de 20; as falhas ficam na lista para «Repetir». Ficheiros com o mesmo nome de um já existente aparecem como «Já existe».\n\nA disciplina, a instituição, a categoria e a classe são escolhidas das listas existentes (Disciplinas, Instituições…), não escritas à mão. Para uma disciplina nova, crie-a primeiro em `/admin/disciplinas`."
  ]
 ]
}
let failed = false
for (const [file, pairs] of Object.entries(patches)) {
  if (!fs.existsSync(file)) { console.log('  --  ' + file + ' (não existe, ignorado)'); continue }
  let s = fs.readFileSync(file, 'utf8')
  let changed = 0
  for (const [from, to] of pairs) {
    if (s.includes(to)) continue
    if (s.split(from).length !== 2) {
      console.error('  ERRO ' + file + ': não encontrei (ou há mais de um) o trecho: ' + from.slice(0, 70).replace(/\n/g, ' '))
      failed = true
      continue
    }
    s = s.replace(from, () => to)
    changed++
  }
  if (changed) fs.writeFileSync(file, s)
  console.log((changed ? '  ok  ' : '  --  ') + file + (changed ? '' : ' (já estava aplicado)'))
}
if (failed) process.exit(1)
JSEOF

echo
echo "Feito. Não há migração nova. Para publicar:"
echo "  git add -A"
echo "  git commit -m \"feat(admin): carregar vários materiais de uma vez, com classificação em lote\""
echo "  git push"
