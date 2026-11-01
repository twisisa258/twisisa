'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db, pool } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { cleanOtherLevel, isTrack } from '@/lib/percurso'

// Guarda o percurso. Só a admissão tem instituição; ao mudar para uma classe, a instituição é retirada.
// O histórico e os pontos não são tocados: só muda o conteúdo mostrado.
export async function savePercurso(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')

    const track = String(formData.get('track') ?? '')
    // «Outra classe»: sem percurso com conteúdo. A classe fica em other_level (a base exige track, instituição e curso vazios).
    if (!track) {
      const otherLevel = cleanOtherLevel(formData.get('otherLevel'))
      if (!otherLevel) throw new AppError('Escolhe ou escreve a classe que estás a preparar.')
      const empty = { track: null, institutionId: null, targetCourseId: null, targetCourse: null, otherLevel }
      await db
        .insert(studentProfiles)
        .values({ userId: session.user.id, ...empty })
        .onConflictDoUpdate({ target: studentProfiles.userId, set: { ...empty, updatedAt: new Date() } })
      revalidatePath('/aluno')
      revalidatePath('/aluno/perfil')
      revalidatePath('/aluno/percurso')
      return 'Percurso guardado.'
    }
    if (!isTrack(track)) throw new AppError('Escolhe o que estás a preparar.')

    let institutionId: string | null = null
    if (track === 'admissao') {
      institutionId = String(formData.get('institutionId') ?? '').trim() || null
      if (!institutionId) throw new AppError('Escolhe a instituição a que te candidatas.')
      const found = await pool.query('SELECT 1 FROM institutions WHERE id = $1 AND active = true', [institutionId])
      if (!found.rowCount) throw new AppError('Essa instituição já não está disponível. Escolhe outra.')
    }

    // O curso só se mantém se a instituição for a mesma: cada curso pertence a uma instituição.
    const previous = await pool.query('SELECT institution_id FROM student_profiles WHERE user_id = $1', [session.user.id])
    const keepCourse = track === 'admissao' && previous.rows[0]?.institution_id === institutionId
    const course = keepCourse ? { otherLevel: null } : { targetCourseId: null, targetCourse: null, otherLevel: null }

    await db
      .insert(studentProfiles)
      .values({ userId: session.user.id, track, institutionId, ...course })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { track, institutionId, ...course, updatedAt: new Date() } })

    revalidatePath('/aluno')
    revalidatePath('/aluno/perfil')
    revalidatePath('/aluno/percurso')
    return 'Percurso guardado.'
  }, 'Não foi possível guardar o percurso. Tenta outra vez.')
}
