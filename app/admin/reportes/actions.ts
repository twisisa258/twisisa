'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { pool } from '@/lib/db'

export async function resolveReport(formData: FormData): Promise<void> {
  const admin = await getAdminUser()
  if (!admin) return
  const id = String(formData.get('id') ?? '')
  if (!id || id.length > 100) return
  const done = await pool.query(`UPDATE question_reports SET status = 'resolvido', resolved_at = now() WHERE id = $1 AND status = 'aberto' RETURNING question_id`, [id])
  if (done.rowCount) await logAdminAction(admin, 'reporte.resolvido', 'question_report', id)
  revalidatePath('/admin/reportes')
}
