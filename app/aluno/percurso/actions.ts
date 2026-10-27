'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db, pool } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { isTrack } from '@/lib/percurso'

// Guarda o percurso. Só a admissão tem instituição; ao mudar para uma classe, a instituição é retirada.
// O histórico e os pontos não são tocados: só muda o conteúdo mostrado.
export async function savePercurso(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')

    const track = String(formData.get('track') ?? '')
    if (!isTrack(track)) throw new AppError('Escolhe o que estás a preparar.')

    let institutionId: string | null = null
    if (track === 'admissao') {
      institutionId = String(formData.get('institutionId') ?? '').trim() || null
      if (!institutionId) throw new AppError('Escolhe a instituição a que te candidatas.')
      const found = await pool.query('SELECT 1 FROM institutions WHERE id = $1 AND active = true', [institutionId])
      if (!found.rowCount) throw new AppError('Essa instituição já não está disponível. Escolhe outra.')
    }

    await db
      .insert(studentProfiles)
      .values({ userId: session.user.id, track, institutionId })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { track, institutionId, updatedAt: new Date() } })

    revalidatePath('/aluno')
    revalidatePath('/aluno/perfil')
    revalidatePath('/aluno/percurso')
    return 'Percurso guardado.'
  }, 'Não foi possível guardar o percurso. Tenta outra vez.')
}
