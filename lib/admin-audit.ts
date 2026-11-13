import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { notifyAdmin } from '@/lib/admin-notify'
import { descreverAcao } from '@/lib/admin-notify-pure'

// Regista uma acção sensível do admin e avisa o próprio admin (ver /admin/notificacoes).
// Uma falha ao registar nunca bloqueia a acção. `notify: false` quando a ação já envia um aviso mais completo.
export async function logAdminAction(
  admin: { id: string; email: string },
  action: string,
  entity: string,
  entityId: string | null,
  detail?: Record<string, unknown>,
  options: { notify?: boolean } = {},
) {
  try {
    await pool.query(
      'INSERT INTO admin_audit_log (id, admin_id, admin_email, action, entity, entity_id, detail) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [randomUUID(), admin.id, admin.email, action, entity, entityId, detail ? JSON.stringify(detail) : null],
    )
  } catch (error) {
    console.error('[AUDITORIA] Não foi possível registar a acção', action, error)
  }
  if (options.notify !== false) await notifyAdmin(admin.id, descreverAcao(action, entity, entityId, detail))
}
