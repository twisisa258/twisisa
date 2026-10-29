'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studentProfiles, user } from '@/lib/db/schema'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { isUniqueViolation } from '@/lib/pg-errors'
import { AVATAR_FOLDER, isProvince } from '@/lib/perfil'

// Cada secção do perfil guarda-se sozinha: um erro numa não perde o que está nas outras.
// O percurso e a instituição guardam-se em /aluno/percurso.

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')
  return session.user
}

function refresh() {
  revalidatePath('/aluno')
  revalidatePath('/aluno/perfil')
}

export async function savePersonal(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const current = await requireUser()

    const displayName = String(formData.get('displayName') ?? '').trim().replace(/\s+/g, ' ')
    if (displayName.length < 2 || displayName.length > 80) throw new AppError('O nome de exibição deve ter entre 2 e 80 caracteres.')

    const phone = String(formData.get('phone') ?? '').trim() || null
    if (phone && phone.length > 30) throw new AppError('O telefone é demasiado longo.')

    const rawNickname = String(formData.get('nickname') ?? '').trim().replace(/^@/, '').toLowerCase()
    if (rawNickname && !/^[a-z0-9_.]{3,20}$/.test(rawNickname)) {
      throw new AppError('O @nickname deve ter 3 a 20 caracteres: letras, números, _ ou ponto, sem espaços.')
    }
    const nickname = rawNickname || null

    try {
      await db
        .insert(studentProfiles)
        .values({ userId: current.id, phone, nickname })
        .onConflictDoUpdate({ target: studentProfiles.userId, set: { phone, nickname, updatedAt: new Date() } })
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError('Esse @nickname já está a ser usado. Escolhe outro.')
      throw error
    }
    await db.update(user).set({ name: displayName, updatedAt: new Date() }).where(eq(user.id, current.id))

    refresh()
    return 'Guardado.'
  }, 'Não foi possível guardar. Tenta outra vez.')
}

export async function saveSchool(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const current = await requireUser()

    const rawProvince = String(formData.get('province') ?? '').trim()
    if (rawProvince && !isProvince(rawProvince)) throw new AppError('Escolhe uma província da lista.')
    const province = rawProvince || null
    const school = String(formData.get('school') ?? '').trim().replace(/\s+/g, ' ').slice(0, 120) || null

    await db
      .insert(studentProfiles)
      .values({ userId: current.id, province, school })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { province, school, updatedAt: new Date() } })

    refresh()
    return 'Guardado.'
  }, 'Não foi possível guardar. Tenta outra vez.')
}

export async function saveCandidate(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const current = await requireUser()

    const targetCourse = String(formData.get('targetCourse') ?? '').trim().replace(/\s+/g, ' ').slice(0, 160) || null
    const parsedScore = Number(formData.get('targetScore'))
    const targetScore = Number.isInteger(parsedScore) && parsedScore >= 0 && parsedScore <= 20 ? parsedScore : 12

    await db
      .insert(studentProfiles)
      .values({ userId: current.id, targetCourse, targetScore })
      .onConflictDoUpdate({ target: studentProfiles.userId, set: { targetCourse, targetScore, updatedAt: new Date() } })

    refresh()
    return 'Guardado.'
  }, 'Não foi possível guardar. Tenta outra vez.')
}

// Guarda (ou remove, com texto vazio) o URL da foto. Só aceita ficheiros do Cloudinary da conta, na pasta e com o nome do próprio aluno.
export async function saveAvatar(url: string): Promise<ActionResult> {
  return runAction(async () => {
    const current = await requireUser()
    let image: string | null = null

    if (url) {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME
      const prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`
      const valid = !!cloudName && url.length < 500 && url.startsWith(prefix) && url.includes(`/${AVATAR_FOLDER}/${current.id}`)
      if (!valid) throw new AppError('Esta foto não é válida. Tenta outra vez.')
      image = url
    }

    await db.update(user).set({ image, updatedAt: new Date() }).where(eq(user.id, current.id))
    refresh()
    return image ? 'Foto atualizada.' : 'Foto removida.'
  }, 'Não foi possível guardar a foto. Tenta outra vez.')
}
