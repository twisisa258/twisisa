'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { isUniqueViolation } from '@/lib/pg-errors'
import { slugify } from '@/lib/slug'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function refresh() {
  revalidatePath('/admin/disciplinas')
  revalidatePath('/admin/materiais')
  revalidatePath('/biblioteca')
}

export async function saveSubject(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const name = text(formData, 'name').replace(/\s+/g, ' ')
    if (name.length < 2 || name.length > 100) throw new AppError('O nome da disciplina deve ter entre 2 e 100 caracteres.')

    const tracks: string[] = []
    const institutionIds: string[] = []
    for (const raw of formData.getAll('scope').map(String)) {
      if (raw === '10' || raw === '12') tracks.push(raw)
      else if (raw.startsWith('inst:')) institutionIds.push(raw.slice(5))
    }

    const client = await pool.connect()
    let subjectId = id
    try {
      await client.query('BEGIN')
      if (institutionIds.length) {
        const found = await client.query('SELECT id FROM institutions WHERE id = ANY($1::text[])', [institutionIds])
        if (found.rowCount !== new Set(institutionIds).size) throw new AppError('Uma das instituições escolhidas já não existe.')
      }
      if (id) {
        const updated = await client.query('UPDATE library_subjects SET name = $2, slug = $3 WHERE id = $1 RETURNING id', [id, name, slugify(name) || randomUUID()])
        if (!updated.rowCount) throw new AppError('Essa disciplina já não existe.')
      } else {
        subjectId = `subject-${randomUUID()}`
        await client.query('INSERT INTO library_subjects (id, name, slug, active) VALUES ($1, $2, $3, true)', [subjectId, name, slugify(name) || randomUUID()])
      }
      await client.query('DELETE FROM subject_scopes WHERE subject_id = $1', [subjectId])
      for (const track of new Set(tracks)) {
        await client.query('INSERT INTO subject_scopes (id, subject_id, track) VALUES ($1, $2, $3)', [randomUUID(), subjectId, track])
      }
      for (const institutionId of new Set(institutionIds)) {
        await client.query('INSERT INTO subject_scopes (id, subject_id, institution_id) VALUES ($1, $2, $3)', [randomUUID(), subjectId, institutionId])
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      if (isUniqueViolation(error)) throw new AppError('Já existe uma disciplina com esse nome.')
      throw error
    } finally {
      client.release()
    }

    await logAdminAction(admin, id ? 'subject.update' : 'subject.create', 'subject', subjectId, { name })
    refresh()
    return id ? 'Disciplina actualizada.' : 'Disciplina criada.'
  }, 'Não foi possível guardar a disciplina. Tenta outra vez.')
}

// Não se apaga uma disciplina em uso: arquiva-se.
export async function setSubjectActive(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const active = text(formData, 'active') === 'true'
    if (!id) throw new AppError('Disciplina inválida.')
    const updated = await pool.query('UPDATE library_subjects SET active = $2 WHERE id = $1 RETURNING name', [id, active])
    if (!updated.rowCount) throw new AppError('Essa disciplina já não existe.')
    await logAdminAction(admin, active ? 'subject.activate' : 'subject.archive', 'subject', id, { name: updated.rows[0].name })
    refresh()
    return active ? 'Disciplina activada.' : 'Disciplina arquivada.'
  }, 'Não foi possível alterar o estado da disciplina. Tenta outra vez.')
}

export async function deleteSubject(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    if (!id) throw new AppError('Disciplina inválida.')
    const found = await pool.query(
      `SELECT s.name,
        (SELECT count(*)::int FROM academic_materials m WHERE m.subject_id = s.id) AS materials,
        (SELECT count(*)::int FROM topics t WHERE t.subject_id = s.id) AS topics,
        (SELECT count(*)::int FROM exam_papers e WHERE e.subject_id = s.id) AS papers
       FROM library_subjects s WHERE s.id = $1`,
      [id],
    )
    if (!found.rowCount) throw new AppError('Essa disciplina já não existe.')
    const { name, materials, topics, papers } = found.rows[0]
    if (materials > 0 || topics > 0 || papers > 0) throw new AppError(`${name} está em uso (${materials} materiais, ${topics} temas, ${papers} provas de cursos). Arquiva-a em vez de a eliminar.`)
    await pool.query('DELETE FROM library_subjects WHERE id = $1', [id])
    await logAdminAction(admin, 'subject.delete', 'subject', id, { name })
    refresh()
    return 'Disciplina eliminada.'
  }, 'Não foi possível eliminar a disciplina. Tenta outra vez.')
}
