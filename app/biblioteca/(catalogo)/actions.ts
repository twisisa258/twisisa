'use server'

import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { AppError, runAction } from '@/lib/action-result'
import { clearSearches, recordSearch } from '@/lib/library'
import { normalizeTerm } from '@/lib/library-shared'

export type ToggleFavoriteResult = { ok: true; saved: boolean } | { ok: false; message: string }

// Alterna o material nos guardados do aluno (library_favorites). Só materiais aprovados podem ser guardados;
// remover funciona sempre, mesmo que o material tenha entretanto saído do catálogo.
export async function toggleFavorite(materialId: string): Promise<ToggleFavoriteResult> {
  let saved = false
  const result = await runAction(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')
    if (typeof materialId !== 'string' || !materialId) throw new AppError('Material inválido.')

    const removed = await pool.query('DELETE FROM library_favorites WHERE user_id = $1 AND material_id = $2', [session.user.id, materialId])
    if ((removed.rowCount ?? 0) > 0) {
      saved = false
      return
    }
    const found = await pool.query(`SELECT 1 FROM academic_materials WHERE id = $1 AND status = 'approved'`, [materialId])
    if ((found.rowCount ?? 0) === 0) throw new AppError('Este material já não está disponível.')
    await pool.query('INSERT INTO library_favorites (user_id, material_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [session.user.id, materialId])
    saved = true
  }, 'Não foi possível guardar o material. Tenta outra vez.')
  return result.ok ? { ok: true, saved } : { ok: false, message: result.message }
}

// Guarda a pesquisa no histórico do aluno. É silenciosa: se falhar, a pesquisa continua a funcionar.
export async function saveSearch(term: string): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const clean = typeof term === 'string' ? normalizeTerm(term) : ''
    if (!session?.user || !clean) return
    await recordSearch(session.user.id, clean)
  } catch (error) {
    console.error('[BIBLIOTECA] Erro ao guardar pesquisa', error)
  }
}

export async function clearSearchHistory(): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return
    await clearSearches(session.user.id)
  } catch (error) {
    console.error('[BIBLIOTECA] Erro ao limpar histórico', error)
  }
}
