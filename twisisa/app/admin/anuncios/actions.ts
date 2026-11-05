'use server'

import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { isAnuncioTom, newAnuncioId } from '@/lib/anuncios'

// Só a administração publica anúncios.
async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}
const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim()
const refresh = () => {
  revalidatePath('/admin/anuncios')
  revalidatePath('/aluno')
}
const hojeEmMaputo = () => new Date(Date.now() + 2 * 3600_000).toISOString().slice(0, 10)

export async function saveAnuncio(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const title = text(formData, 'title')
    const body = text(formData, 'body')
    const tone = text(formData, 'tone')
    const ctaLabel = text(formData, 'ctaLabel')
    const ctaHref = text(formData, 'ctaHref')
    const track = text(formData, 'track')
    const endsOn = text(formData, 'endsOn')
    const featured = formData.get('featured') === 'on'

    if (title.length < 3 || title.length > 80) throw new AppError('O título precisa de 3 a 80 caracteres.')
    if (body.length > 220) throw new AppError('O texto pode ter no máximo 220 caracteres.')
    if (!isAnuncioTom(tone)) throw new AppError('Escolhe o tipo de anúncio.')
    if (track && !['10', '12', 'admissao'].includes(track)) throw new AppError('Percurso inválido.')
    if (ctaHref && !/^(\/[^/]|https:\/\/)/.test(ctaHref)) throw new AppError('A ligação tem de começar por / (dentro do Twisisa) ou por https://.')
    if (ctaHref && !ctaLabel) throw new AppError('Escreve o texto do botão.')
    if (ctaLabel && !ctaHref) throw new AppError('Escreve a ligação do botão ou apaga o texto do botão.')
    if (ctaLabel.length > 24) throw new AppError('O texto do botão pode ter no máximo 24 caracteres.')
    if (endsOn && !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) throw new AppError('Data de fim inválida.')
    if (endsOn && endsOn < hojeEmMaputo()) throw new AppError('A data de fim já passou.')

    // O anúncio vale até ao fim do dia escolhido (hora de Maputo).
    const values = [title, body || null, tone, featured, ctaLabel || null, ctaHref || null, track || null, endsOn || null]
    if (id) {
      const result = await pool.query(
        `UPDATE announcements SET title = $2, body = $3, tone = $4, featured = $5, cta_label = $6, cta_href = $7, track = $8,
                ends_at = ($9::date + 1)::timestamp AT TIME ZONE 'Africa/Maputo'
         WHERE id = $1`,
        [id, ...values],
      )
      if (result.rowCount === 0) throw new AppError('Este anúncio já não existe.')
      await logAdminAction(admin, 'anuncio.update', 'announcement', id, { title })
    } else {
      const novo = newAnuncioId()
      await pool.query(
        `INSERT INTO announcements (id, title, body, tone, featured, cta_label, cta_href, track, ends_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ($9::date + 1)::timestamp AT TIME ZONE 'Africa/Maputo', $10)`,
        [novo, ...values, admin.id],
      )
      await logAdminAction(admin, 'anuncio.create', 'announcement', novo, { title })
    }
    refresh()
    return id ? 'Anúncio atualizado.' : 'Anúncio publicado.'
  }, 'Não foi possível guardar o anúncio.')
}

export async function setAnuncioActive(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    const active = text(formData, 'active') === 'true'
    await pool.query('UPDATE announcements SET active = $2 WHERE id = $1', [id, active])
    await logAdminAction(admin, active ? 'anuncio.show' : 'anuncio.hide', 'announcement', id)
    refresh()
    return active ? 'Anúncio visível aos alunos.' : 'Anúncio ocultado.'
  }, 'Não foi possível mudar o estado do anúncio.')
}

export async function deleteAnuncio(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = text(formData, 'id')
    await pool.query('DELETE FROM announcements WHERE id = $1', [id])
    await logAdminAction(admin, 'anuncio.delete', 'announcement', id)
    refresh()
    return 'Anúncio eliminado.'
  }, 'Não foi possível eliminar o anúncio.')
}
