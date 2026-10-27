'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studentProfiles, user } from '@/lib/db/schema'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { isUniqueViolation } from '@/lib/pg-errors'

// O percurso e a instituição guardam-se em /aluno/percurso; aqui só os dados pessoais e, na admissão, o curso e a meta.
export async function saveProfile(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')

    const displayName = String(formData.get('displayName') ?? '').trim().replace(/\s+/g, ' ')
    if (displayName.length < 2 || displayName.length > 80) throw new AppError('O nome de exibição deve ter entre 2 e 80 caracteres.')

    const phone = String(formData.get('phone') ?? '').trim() || null
    if (phone && phone.length > 30) throw new AppError('O telefone é demasiado longo.')

    const rawNickname = String(formData.get('nickname') ?? '').trim().replace(/^@/, '').toLowerCase()
    if (rawNickname && !/^[a-z0-9_.]{3,20}$/.test(rawNickname)) {
      throw new AppError('O @nickname deve ter 3 a 20 caracteres: letras, números, _ ou ponto, sem espaços.')
    }
    const nickname = rawNickname || null

    // Os campos de candidato só vêm no formulário de quem está na admissão; sem eles, não se mexe nos valores guardados.
    let candidate: { targetCourse: string | null; targetScore: number } | null = null
    if (formData.has('targetCourse')) {
      const parsedScore = Number(formData.get('targetScore'))
      candidate = {
        targetCourse: String(formData.get('targetCourse') ?? '').trim().slice(0, 160) || null,
        targetScore: Number.isInteger(parsedScore) && parsedScore >= 0 && parsedScore <= 20 ? parsedScore : 12,
      }
    }

    try {
      await db
        .insert(studentProfiles)
        .values({ userId: session.user.id, phone, nickname, ...candidate })
        .onConflictDoUpdate({ target: studentProfiles.userId, set: { phone, nickname, ...candidate, updatedAt: new Date() } })
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError('Esse @nickname já está a ser usado. Escolhe outro.')
      throw error
    }

    await db.update(user).set({ name: displayName, updatedAt: new Date() }).where(eq(user.id, session.user.id))

    revalidatePath('/aluno')
    revalidatePath('/aluno/perfil')
    return 'Perfil guardado.'
  }, 'Não foi possível guardar o perfil. Tenta outra vez.')
}
