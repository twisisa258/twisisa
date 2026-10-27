'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { isUniqueViolation } from '@/lib/pg-errors'
import { moveWithin, nextOrder } from '@/lib/reorder'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}


function refresh() {
  revalidatePath('/admin/temas')
  revalidatePath('/admin/disciplinas')
}

export async function saveTopic(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const subjectId = text(formData, 'subject_id')
    const name = text(formData, 'name').replace(/\s+/g, ' ')
    if (name.length < 2 || name.length > 120) throw new AppError('O nome do tema deve ter entre 2 e 120 caracteres.')
    if (!subjectId) throw new AppError('Escolhe a disciplina do tema.')
    const subject = await pool.query('SELECT id FROM library_subjects WHERE id = $1', [subjectId])
    if (!subject.rowCount) throw new AppError('Essa disciplina já não existe.')
    try {
      if (id) {
        const current = await pool.query('SELECT subject_id FROM topics WHERE id = $1', [id])
        if (!current.rowCount) throw new AppError('Esse tema já não existe.')
        // Mudar de disciplina põe o tema no fim da nova disciplina; senão a posição mantém-se.
        const moved = current.rows[0].subject_id !== subjectId
        const updated = moved
          ? await pool.query('UPDATE topics SET subject_id = $2, name = $3, sort_order = $4 WHERE id = $1 RETURNING id', [id, subjectId, name, await nextOrder(pool, 'topics', 'subject_id', subjectId)])
          : await pool.query('UPDATE topics SET name = $2 WHERE id = $1 RETURNING id', [id, name])
        if (!updated.rowCount) throw new AppError('Esse tema já não existe.')
      } else {
        await pool.query('INSERT INTO topics (id, subject_id, name, sort_order) VALUES ($1, $2, $3, $4)', [`topic-${randomUUID()}`, subjectId, name, await nextOrder(pool, 'topics', 'subject_id', subjectId)])
      }
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError('Essa disciplina já tem um tema com esse nome.')
      throw error
    }
    await logAdminAction(admin, id ? 'topic.update' : 'topic.create', 'topic', id || null, { name, subjectId })
    refresh()
    return id ? 'Tema actualizado.' : 'Tema criado.'
  }, 'Não foi possível guardar o tema. Tenta outra vez.')
}

export async function setTopicActive(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const active = text(formData, 'active') === 'true'
    const updated = await pool.query('UPDATE topics SET active = $2 WHERE id = $1 RETURNING name', [id, active])
    if (!updated.rowCount) throw new AppError('Esse tema já não existe.')
    await logAdminAction(admin, active ? 'topic.activate' : 'topic.archive', 'topic', id, { name: updated.rows[0].name })
    refresh()
    return active ? 'Tema activado.' : 'Tema arquivado.'
  }, 'Não foi possível alterar o tema. Tenta outra vez.')
}

// Ainda nada usa temas (questões e materiais ligam-se na Fase 3). Quando passarem a usá-los,
// esta acção tem de recusar temas em uso e mandar arquivar (regra: não se apaga o que está em uso).
export async function deleteTopic(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const deleted = await pool.query('DELETE FROM topics WHERE id = $1 RETURNING name', [id])
    if (!deleted.rowCount) throw new AppError('Esse tema já não existe.')
    await logAdminAction(admin, 'topic.delete', 'topic', id, { name: deleted.rows[0].name })
    refresh()
    return 'Tema eliminado.'
  }, 'Não foi possível eliminar o tema. Tenta outra vez.')
}

// Sobe ou desce um tema dentro da sua disciplina.
export async function moveTopic(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin()
    const id = text(formData, 'id')
    const direction = text(formData, 'direction')
    if (!id || (direction !== 'up' && direction !== 'down')) throw new AppError('Pedido inválido.')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const found = await moveWithin(client, 'topics', id, direction, 'subject_id')
      if (!found) throw new AppError('Esse tema já não existe.')
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
