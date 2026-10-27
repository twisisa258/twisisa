'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { isUniqueViolation } from '@/lib/pg-errors'
import { slugify } from '@/lib/slug'
import { moveWithin, nextOrder } from '@/lib/reorder'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}



const TABLES = { categoria: 'library_categories', nivel: 'library_levels' } as const
type Kind = keyof typeof TABLES

function kindOf(formData: FormData): Kind {
  const kind = text(formData, 'kind')
  if (kind !== 'categoria' && kind !== 'nivel') throw new AppError('Tipo inválido.')
  return kind
}

function refresh() {
  revalidatePath('/admin/classificacao')
  revalidatePath('/admin/materiais')
  revalidatePath('/biblioteca')
}

// Categorias e níveis. O slug não muda ao renomear (links e filtros guardados continuam a funcionar).
// A ordem não se escreve: um item novo vai para o fim e reorganiza-se com Subir/Descer.
export async function saveClassItem(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const kind = kindOf(formData)
    const table = TABLES[kind]
    const id = text(formData, 'id')
    const name = text(formData, 'name').replace(/\s+/g, ' ')
    if (name.length < 2 || name.length > 80) throw new AppError('O nome deve ter entre 2 e 80 caracteres.')
    const description = text(formData, 'description').slice(0, 300) || null
    try {
      if (kind === 'categoria') {
        if (id) {
          const r = await pool.query(`UPDATE ${table} SET name = $2, description = $3 WHERE id = $1 RETURNING id`, [id, name, description])
          if (!r.rowCount) throw new AppError('Esse item já não existe.')
        } else {
          await pool.query(`INSERT INTO ${table} (id, name, slug, description, sort_order) VALUES ($1, $2, $3, $4, $5)`, [`cat-${randomUUID()}`, name, slugify(name) || randomUUID(), description, await nextOrder(pool, 'library_categories')])
        }
      } else if (id) {
        const r = await pool.query(`UPDATE ${table} SET name = $2 WHERE id = $1 RETURNING id`, [id, name])
        if (!r.rowCount) throw new AppError('Esse item já não existe.')
      } else {
        await pool.query(`INSERT INTO ${table} (id, name, slug, sort_order) VALUES ($1, $2, $3, $4)`, [`level-${randomUUID()}`, name, slugify(name) || randomUUID(), await nextOrder(pool, 'library_levels')])
      }
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError('Já existe um item com esse nome.')
      throw error
    }
    await logAdminAction(admin, `${kind}.${id ? 'update' : 'create'}`, kind, id || null, { name })
    refresh()
    return id ? 'Alterações guardadas.' : 'Criado.'
  }, 'Não foi possível guardar. Tenta outra vez.')
}

export async function moveClassItem(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin()
    const kind = kindOf(formData)
    const id = text(formData, 'id')
    const direction = text(formData, 'direction')
    if (!id || (direction !== 'up' && direction !== 'down')) throw new AppError('Pedido inválido.')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const found = await moveWithin(client, kind === 'categoria' ? 'library_categories' : 'library_levels', id, direction)
      if (!found) throw new AppError('Esse item já não existe.')
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

export async function setClassItemActive(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const kind = kindOf(formData)
    const id = text(formData, 'id')
    const active = text(formData, 'active') === 'true'
    const r = await pool.query(`UPDATE ${TABLES[kind]} SET active = $2 WHERE id = $1 RETURNING name`, [id, active])
    if (!r.rowCount) throw new AppError('Esse item já não existe.')
    await logAdminAction(admin, `${kind}.${active ? 'activate' : 'archive'}`, kind, id, { name: r.rows[0].name })
    refresh()
    return active ? 'Activado.' : 'Arquivado.'
  }, 'Não foi possível alterar o estado. Tenta outra vez.')
}

export async function deleteClassItem(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const kind = kindOf(formData)
    const id = text(formData, 'id')
    const column = kind === 'categoria' ? 'category_id' : 'level_id'
    const found = await pool.query(`SELECT x.name, (SELECT count(*)::int FROM academic_materials m WHERE m.${column} = x.id) AS used FROM ${TABLES[kind]} x WHERE x.id = $1`, [id])
    if (!found.rowCount) throw new AppError('Esse item já não existe.')
    const { name, used } = found.rows[0]
    if (used > 0) throw new AppError(`${name} está em uso (${used} materiais). Arquiva-o em vez de o eliminar.`)
    await pool.query(`DELETE FROM ${TABLES[kind]} WHERE id = $1`, [id])
    await logAdminAction(admin, `${kind}.delete`, kind, id, { name })
    refresh()
    return 'Eliminado.'
  }, 'Não foi possível eliminar. Tenta outra vez.')
}
