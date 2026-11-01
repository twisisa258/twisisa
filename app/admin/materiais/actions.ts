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
