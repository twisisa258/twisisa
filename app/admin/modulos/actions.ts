'use server'

import { revalidatePath } from 'next/cache'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { EXAM_MODULES, isModuleKey, isModuleStatus } from '@/lib/exam-modules'
import { TRACKS } from '@/lib/percurso'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}



// Estado de um módulo nos três percursos, mais a etiqueta "Novidade" (dias de validade).
// "Ativo" só é aceite se a funcionalidade existe (ready): nada aparece simulado.
export async function saveModule(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const key = text(formData, 'module_key')
    if (!isModuleKey(key)) throw new AppError('Módulo inválido.')
    const module = EXAM_MODULES.find((item) => item.key === key)!
    const novelty = text(formData, 'novelty')
    if (!['', 'keep', '7', '30', '60'].includes(novelty)) throw new AppError('Validade da etiqueta inválida.')

    const statuses = TRACKS.map((track) => ({ track: track.value, status: text(formData, `status_${track.value}`) }))
    for (const { status } of statuses) {
      if (!isModuleStatus(status)) throw new AppError('Estado inválido.')
      if (status === 'active' && !module.ready) throw new AppError(`${module.label} ainda não está disponível. Usa «Em breve» ou «Oculto».`)
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      for (const { track, status } of statuses) {
        if (novelty === 'keep') {
          await client.query(
            'INSERT INTO exam_modules (module_key, track, status) VALUES ($1, $2, $3) ON CONFLICT (module_key, track) DO UPDATE SET status = $3, updated_at = now()',
            [key, track, status],
          )
        } else {
          await client.query(
            `INSERT INTO exam_modules (module_key, track, status, novelty_until)
             VALUES ($1, $2, $3, CASE WHEN $4::int > 0 THEN now() + make_interval(days => $4::int) ELSE NULL END)
             ON CONFLICT (module_key, track) DO UPDATE SET status = $3, novelty_until = EXCLUDED.novelty_until, updated_at = now()`,
            [key, track, status, novelty ? Number(novelty) : 0],
          )
        }
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    await logAdminAction(admin, 'module.update', 'module', key, { statuses, novelty })
    revalidatePath('/admin/modulos')
    return `${module.label} guardado.`
  }, 'Não foi possível guardar o módulo. Tenta outra vez.')
}
