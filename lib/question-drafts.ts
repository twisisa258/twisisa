import { pool } from '@/lib/db'
import { DRAFT_ID, isDraftEmpty, sanitizeDraft, type DraftPayload } from '@/lib/question-draft-shared'

// Questões por concluir (tabela question_drafts, migração 0011). Cada admin vê só as suas.

export type OpenDraft = { id: string; payload: DraftPayload; updatedAt: Date }

/** Guarda (ou actualiza) o que foi escrito. Um rascunho já terminado ou de outro admin nunca é alterado. */
export async function saveDraft(adminId: string, id: string, payload: DraftPayload) {
  if (isDraftEmpty(payload)) {
    // O admin apagou tudo: não fica nada por concluir.
    await pool.query('DELETE FROM question_drafts WHERE id = $1 AND admin_id = $2 AND finished_at IS NULL', [id, adminId])
    return
  }
  await pool.query(
    `INSERT INTO question_drafts (id, admin_id, payload) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
     WHERE question_drafts.admin_id = EXCLUDED.admin_id AND question_drafts.finished_at IS NULL`,
    [id, adminId, JSON.stringify(payload)],
  )
}

/**
 * Marca como terminado (virou questão ou foi descartado). Fica como marca até à limpeza, para um guardamento automático
 * atrasado não o ressuscitar: se a linha ainda não existir, cria-a já terminada.
 */
export async function finishDraft(adminId: string, id: string) {
  if (!DRAFT_ID.test(id)) return
  await pool.query(
    `INSERT INTO question_drafts (id, admin_id, payload, finished_at) VALUES ($1, $2, '{}'::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET finished_at = now()
     WHERE question_drafts.admin_id = EXCLUDED.admin_id AND question_drafts.finished_at IS NULL`,
    [id, adminId],
  )
}

export async function getOpenDraft(adminId: string, id: string): Promise<OpenDraft | null> {
  const result = await pool.query('SELECT id, payload, updated_at FROM question_drafts WHERE id = $1 AND admin_id = $2 AND finished_at IS NULL', [id, adminId])
  const row = result.rows[0]
  return row ? { id: row.id, payload: sanitizeDraft(row.payload), updatedAt: row.updated_at } : null
}

export async function listOpenDrafts(adminId: string): Promise<OpenDraft[]> {
  // Limpeza: terminados há mais de 2 dias e abandonados há mais de 60.
  await pool.query(
    `DELETE FROM question_drafts WHERE (finished_at IS NOT NULL AND finished_at < now() - interval '2 days') OR (finished_at IS NULL AND updated_at < now() - interval '60 days')`,
  )
  const result = await pool.query('SELECT id, payload, updated_at FROM question_drafts WHERE admin_id = $1 AND finished_at IS NULL ORDER BY updated_at DESC LIMIT 20', [adminId])
  return result.rows.map((row) => ({ id: row.id as string, payload: sanitizeDraft(row.payload), updatedAt: row.updated_at as Date }))
}
