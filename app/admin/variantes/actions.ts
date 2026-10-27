'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { isUniqueViolation } from '@/lib/pg-errors'
import { moveWithin, nextOrder } from '@/lib/reorder'
import { VARIANT_DIFFICULTIES } from '@/lib/variants'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim()

function refresh() {
  revalidatePath('/admin/variantes')
  revalidatePath('/admin/questoes')
  revalidatePath('/aluno/simulador')
}

// Uma variante é uma versão do exame de uma disciplina (ex.: Matemática I, II, III). A dificuldade pesa na nota e nos pontos.
export async function saveVariant(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const subjectId = text(formData, 'subject_id')
    const name = text(formData, 'name').replace(/\s+/g, ' ')
    const difficulty = text(formData, 'difficulty') || 'media'
    if (name.length < 1 || name.length > 60) throw new AppError('O nome da variante deve ter entre 1 e 60 caracteres.')
    if (!subjectId) throw new AppError('Escolhe a disciplina da variante.')
    if (!VARIANT_DIFFICULTIES.some((item) => item.value === difficulty)) throw new AppError('Dificuldade inválida.')
    const subject = await pool.query('SELECT id FROM library_subjects WHERE id = $1', [subjectId])
    if (!subject.rowCount) throw new AppError('Essa disciplina já não existe.')
    try {
      if (id) {
        const current = await pool.query('SELECT subject_id FROM subject_variants WHERE id = $1', [id])
        if (!current.rowCount) throw new AppError('Essa variante já não existe.')
        // As questões ligam-se à variante pela disciplina e pelo nome: não se muda a disciplina de uma variante em uso.
        if (current.rows[0].subject_id !== subjectId) throw new AppError('Não se muda a disciplina de uma variante. Cria uma nova na outra disciplina.')
        // Renomear atualiza sozinho as questões (a ligação é em cascata).
        await pool.query('UPDATE subject_variants SET name = $2, difficulty = $3 WHERE id = $1', [id, name, difficulty])
      } else {
        await pool.query('INSERT INTO subject_variants (id, subject_id, name, difficulty, sort_order) VALUES ($1, $2, $3, $4, $5)', [`variant-${randomUUID()}`, subjectId, name, difficulty, await nextOrder(pool, 'subject_variants', 'subject_id', subjectId)])
      }
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError('Essa disciplina já tem uma variante com esse nome.')
      throw error
    }
    await logAdminAction(admin, id ? 'variant.update' : 'variant.create', 'variant', id || null, { name, subjectId, difficulty })
    refresh()
    return id ? 'Variante atualizada.' : 'Variante criada.'
  }, 'Não foi possível guardar a variante. Tenta outra vez.')
}

export async function setVariantActive(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const active = text(formData, 'active') === 'true'
    const updated = await pool.query('UPDATE subject_variants SET active = $2 WHERE id = $1 RETURNING name', [id, active])
    if (!updated.rowCount) throw new AppError('Essa variante já não existe.')
    await logAdminAction(admin, active ? 'variant.activate' : 'variant.archive', 'variant', id, { name: updated.rows[0].name })
    refresh()
    return active ? 'Variante ativada.' : 'Variante arquivada. Deixa de aparecer aos alunos.'
  }, 'Não foi possível alterar a variante. Tenta outra vez.')
}

// Não se apaga o que está em uso: arquiva-se.
export async function deleteVariant(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const used = await pool.query('SELECT 1 FROM questions q JOIN subject_variants v ON v.subject_id = q.subject_id AND v.name = q.variant WHERE v.id = $1 LIMIT 1', [id])
    if (used.rowCount) throw new AppError('Há questões nesta variante. Arquiva-a em vez de eliminar.')
    const deleted = await pool.query('DELETE FROM subject_variants WHERE id = $1 RETURNING name', [id])
    if (!deleted.rowCount) throw new AppError('Essa variante já não existe.')
    await logAdminAction(admin, 'variant.delete', 'variant', id, { name: deleted.rows[0].name })
    refresh()
    return 'Variante eliminada.'
  }, 'Não foi possível eliminar a variante. Tenta outra vez.')
}

export async function moveVariant(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin()
    const id = text(formData, 'id')
    const direction = text(formData, 'direction')
    if (!id || (direction !== 'up' && direction !== 'down')) throw new AppError('Pedido inválido.')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const found = await moveWithin(client, 'subject_variants', id, direction, 'subject_id')
      if (!found) throw new AppError('Essa variante já não existe.')
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
