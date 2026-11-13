import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import type { AvisoNovo, NivelAviso } from '@/lib/admin-notify-pure'

// Notificações do admin: cada coisa que acontece na administração chega ao próprio admin.
// Nunca bloqueia a ação que a gerou: se falhar, só fica no registo do servidor.

export async function notifyAdmin(adminId: string, aviso: AvisoNovo): Promise<void> {
  try {
    await pool.query(
      'INSERT INTO admin_notifications (id, admin_id, kind, level, title, body, link, data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [randomUUID(), adminId, aviso.kind, aviso.level, aviso.title.slice(0, 200), aviso.body?.slice(0, 2000) ?? null, aviso.link ?? null, aviso.data ? JSON.stringify(aviso.data) : null],
    )
  } catch (error) {
    console.error('[NOTIFICAÇÕES] Não foi possível criar o aviso', aviso.kind, error)
  }
}

export type AvisoRow = {
  id: string
  kind: string
  level: NivelAviso
  title: string
  body: string | null
  link: string | null
  data: Record<string, unknown> | null
  read: boolean
  createdAt: Date
}
export type FiltroAvisos = 'todas' | 'por_ler' | 'avisos'

export async function listNotifications(adminId: string, filtro: FiltroAvisos = 'todas', limit = 60): Promise<AvisoRow[]> {
  const where = filtro === 'por_ler' ? 'AND read_at IS NULL' : filtro === 'avisos' ? "AND level IN ('aviso', 'erro')" : ''
  const result = await pool.query(
    `SELECT id, kind, level, title, body, link, data, read_at, created_at FROM admin_notifications WHERE admin_id = $1 ${where} ORDER BY created_at DESC LIMIT $2`,
    [adminId, limit],
  )
  return result.rows.map((row) => ({
    id: row.id as string,
    kind: row.kind as string,
    level: row.level as NivelAviso,
    title: row.title as string,
    body: (row.body as string | null) ?? null,
    link: (row.link as string | null) ?? null,
    data: (row.data as Record<string, unknown> | null) ?? null,
    read: row.read_at !== null,
    createdAt: row.created_at as Date,
  }))
}

export async function countNotifications(adminId: string): Promise<{ todas: number; porLer: number; avisos: number }> {
  const result = await pool.query(
    `SELECT count(*)::int AS todas,
            count(*) FILTER (WHERE read_at IS NULL)::int AS por_ler,
            count(*) FILTER (WHERE level IN ('aviso', 'erro'))::int AS avisos
     FROM admin_notifications WHERE admin_id = $1`,
    [adminId],
  )
  const row = result.rows[0]
  return { todas: row.todas as number, porLer: row.por_ler as number, avisos: row.avisos as number }
}

/** Por ler, para o número no menu. Se a consulta falhar, o menu mostra 0 em vez de partir a página. */
export async function countUnread(adminId: string): Promise<number> {
  try {
    const result = await pool.query('SELECT count(*)::int AS total FROM admin_notifications WHERE admin_id = $1 AND read_at IS NULL', [adminId])
    return result.rows[0].total as number
  } catch (error) {
    console.error('[NOTIFICAÇÕES] Não foi possível contar os avisos por ler', error)
    return 0
  }
}

export async function markRead(adminId: string, id: string): Promise<void> {
  await pool.query('UPDATE admin_notifications SET read_at = now() WHERE id = $1 AND admin_id = $2 AND read_at IS NULL', [id, adminId])
}

export async function markAllRead(adminId: string): Promise<void> {
  await pool.query('UPDATE admin_notifications SET read_at = now() WHERE admin_id = $1 AND read_at IS NULL', [adminId])
}
