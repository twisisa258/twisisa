'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { INSTITUTION_KINDS } from '@/lib/institutions'
import { isUniqueViolation } from '@/lib/pg-errors'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function refresh() {
  revalidatePath('/admin/instituicoes')
  revalidatePath('/aluno/percurso')
  revalidatePath('/aluno/perfil')
}

// O logótipo tem de vir do upload para a pasta da conta Cloudinary (nunca um URL qualquer).
function checkLogoUrl(value: string) {
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new AppError('O URL do logótipo não é válido.')
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  if (!cloudName) throw new AppError('O Cloudinary não está configurado no servidor.')
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(`/${cloudName}/`)) {
    throw new AppError('O logótipo tem de ser carregado através do botão de upload.')
  }
  return url.toString()
}

export async function saveInstitution(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const shortName = text(formData, 'shortName').toUpperCase()
    const name = text(formData, 'name')
    const kind = text(formData, 'kind')
    const description = text(formData, 'description')
    const city = text(formData, 'city')
    const province = text(formData, 'province')
    const logoUrl = checkLogoUrl(text(formData, 'logoUrl'))
    const showWhenEmpty = formData.get('showWhenEmpty') === 'on'

    if (!/^[A-Z0-9-]{2,12}$/.test(shortName)) throw new AppError('A sigla deve ter 2 a 12 letras, números ou hífenes.')
    if (name.length < 3 || name.length > 160) throw new AppError('O nome completo deve ter entre 3 e 160 caracteres.')
    if (!INSTITUTION_KINDS.some((item) => item.value === kind)) throw new AppError('Escolhe o tipo de instituição.')
    if (description.length > 600) throw new AppError('A descrição pode ter no máximo 600 caracteres.')
    if (city.length > 80 || province.length > 80) throw new AppError('A cidade e a província podem ter no máximo 80 caracteres.')

    try {
      if (id) {
        const updated = await pool.query(
          `UPDATE institutions SET short_name = $2, name = $3, kind = $4, description = $5, logo_url = $6, city = $7, province = $8, show_when_empty = $9, updated_at = now()
           WHERE id = $1 RETURNING id`,
          [id, shortName, name, kind, description || null, logoUrl, city || null, province || null, showWhenEmpty],
        )
        if (!updated.rowCount) throw new AppError('Essa instituição já não existe.')
        await logAdminAction(admin, 'institution.update', 'institution', id, { shortName })
      } else {
        const next = await pool.query('SELECT COALESCE(max(sort_order), 0) + 1 AS next FROM institutions')
        const newId = randomUUID()
        await pool.query(
          `INSERT INTO institutions (id, short_name, name, kind, description, logo_url, city, province, show_when_empty, sort_order, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)`,
          [newId, shortName, name, kind, description || null, logoUrl, city || null, province || null, showWhenEmpty, next.rows[0].next],
        )
        await logAdminAction(admin, 'institution.create', 'institution', newId, { shortName })
      }
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError(`Já existe uma instituição com a sigla ${shortName}.`)
      throw error
    }

    refresh()
    return id ? 'Instituição actualizada.' : 'Instituição criada.'
  }, 'Não foi possível guardar a instituição. Tenta outra vez.')
}

export async function setInstitutionActive(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const active = text(formData, 'active') === 'true'
    if (!id) throw new AppError('Instituição inválida.')
    const updated = await pool.query('UPDATE institutions SET active = $2, updated_at = now() WHERE id = $1 RETURNING short_name', [id, active])
    if (!updated.rowCount) throw new AppError('Essa instituição já não existe.')
    await logAdminAction(admin, active ? 'institution.activate' : 'institution.hide', 'institution', id, { shortName: updated.rows[0].short_name })
    refresh()
    return active ? 'Instituição activada.' : 'Instituição ocultada.'
  }, 'Não foi possível alterar o estado da instituição. Tenta outra vez.')
}

// Troca a posição com a vizinha. Renumera a lista toda (1..n) para não haver empates na ordem.
export async function moveInstitution(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin()
    const id = text(formData, 'id')
    const direction = text(formData, 'direction')
    if (!id || (direction !== 'up' && direction !== 'down')) throw new AppError('Pedido inválido.')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const list = await client.query('SELECT id FROM institutions ORDER BY sort_order, short_name FOR UPDATE')
      const ids: string[] = list.rows.map((row) => row.id)
      const index = ids.indexOf(id)
      if (index === -1) throw new AppError('Essa instituição já não existe.')
      const target = direction === 'up' ? index - 1 : index + 1
      if (target >= 0 && target < ids.length) {
        ;[ids[index], ids[target]] = [ids[target], ids[index]]
        for (let position = 0; position < ids.length; position += 1) {
          await client.query('UPDATE institutions SET sort_order = $2 WHERE id = $1', [ids[position], position + 1])
        }
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    refresh()
  }, 'Não foi possível mudar a ordem. Tenta outra vez.')
}

// Só se elimina uma instituição sem conteúdos nem alunos associados; senão, oculta-se.
export async function deleteInstitution(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    if (!id) throw new AppError('Instituição inválida.')
    const found = await pool.query(
      `SELECT i.short_name,
        (SELECT count(*)::int FROM academic_materials m WHERE lower(m.institution_name) = lower(i.short_name)) AS contents,
        (SELECT count(*)::int FROM student_profiles p WHERE p.institution_id = i.id) AS students,
        (SELECT count(*)::int FROM subject_scopes sc WHERE sc.institution_id = i.id) AS scopes,
        (SELECT count(*)::int FROM courses c WHERE c.institution_id = i.id) AS courses
       FROM institutions i WHERE i.id = $1`,
      [id],
    )
    if (!found.rowCount) throw new AppError('Essa instituição já não existe.')
    const { short_name: shortName, contents, students, scopes, courses } = found.rows[0]
    if (contents > 0 || students > 0 || scopes > 0 || courses > 0) {
      throw new AppError(`${shortName} tem conteúdos, alunos, disciplinas ou cursos associados e não pode ser eliminada. Oculta-a.`)
    }
    await pool.query('DELETE FROM institutions WHERE id = $1', [id])
    await logAdminAction(admin, 'institution.delete', 'institution', id, { shortName })
    refresh()
    return 'Instituição eliminada.'
  }, 'Não foi possível eliminar a instituição. Tenta outra vez.')
}
