'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { auth } from '@/lib/auth'
import { destroyMaterialFile } from '@/lib/cloudinary-server'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
  if (!allowed.length || !allowed.includes(session.user.email.toLowerCase())) {
    throw new AppError('Acesso reservado à administração.')
  }
  return session.user
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

export async function createAcademicMaterial(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
  const admin = await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const categorySlug = String(formData.get('category') ?? '').trim()
  const subjectName = String(formData.get('subject') ?? '').trim()
  const levelName = String(formData.get('level') ?? '').trim()
  const institution = String(formData.get('institution') ?? '').trim()
  const course = String(formData.get('course') ?? '').trim()
  const yearRaw = String(formData.get('year') ?? '').trim()
  const fileUrl = String(formData.get('fileUrl') ?? '').trim()
  const fileName = String(formData.get('fileName') ?? '').trim()

  if (!title || !categorySlug || !fileUrl || !fileName) throw new AppError('Preenche o título, categoria, nome do ficheiro e URL do documento.')
  let parsedUrl: URL
  try { parsedUrl = new URL(fileUrl) } catch { throw new AppError('O URL do documento não é válido.') }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  if (!cloudName) throw new AppError('O Cloudinary não está configurado no servidor.')
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'res.cloudinary.com' || !parsedUrl.pathname.startsWith(`/${cloudName}/`)) {
    throw new AppError('O documento tem de ser carregado através do botão de upload.')
  }
  const year = yearRaw ? Number(yearRaw) : null
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) throw new AppError('Indica um ano válido.')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const category = await client.query('SELECT id FROM library_categories WHERE slug = $1 AND active = true LIMIT 1', [categorySlug])
    if (!category.rowCount) throw new AppError('A categoria seleccionada não existe ou está inactiva.')

    let subjectId: string | null = null
    if (subjectName) {
      const subject = await client.query(
        `INSERT INTO library_subjects (id, name, slug, active) VALUES ($1, $2, $3, true)
         ON CONFLICT (name) DO UPDATE SET active = true RETURNING id`,
        [`subject-${randomUUID()}`, subjectName, subjectName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || randomUUID()],
      )
      subjectId = subject.rows[0].id
    }

    let levelId: string | null = null
    if (levelName) {
      const level = await client.query('SELECT id FROM library_levels WHERE name = $1 AND active = true LIMIT 1', [levelName])
      levelId = level.rows[0]?.id ?? null
    }

    await client.query(
      `INSERT INTO academic_materials
       (id, title, description, file_url, file_name, mime_type, category_id, subject_id, level_id, institution_name, course_name, academic_year, author_id, status, reviewed_by, reviewed_at, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'approved',$13,now(),now())`,
      [randomUUID(), title, description, parsedUrl.toString(), fileName, mimeFromName(fileName), category.rows[0].id, subjectId, levelId, institution || null, course || null, year, admin.id],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  revalidatePath('/admin/materiais')
  revalidatePath('/biblioteca')
  return 'Material publicado na biblioteca.'
  }, 'Não foi possível publicar o material. Tenta outra vez.')
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
