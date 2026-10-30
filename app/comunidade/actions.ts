'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { follows, posts } from '@/lib/db/schema'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')
  return session.user.id
}

export async function createPost(body: string): Promise<ActionResult> {
  return runAction(async () => {
    const userId = await getUserId()
    const cleanBody = body.trim()
    if (!cleanBody) throw new AppError('Escreve alguma coisa antes de publicar.')
    if (cleanBody.length > 1000) throw new AppError('A publicação tem mais de 1000 caracteres.')
    await db.insert(posts).values({ id: crypto.randomUUID(), userId, body: cleanBody })
    revalidatePath('/comunidade')
  }, 'Não foi possível publicar. Tenta outra vez.')
}

export async function toggleFollow(targetUserId: string): Promise<ActionResult> {
  return runAction(async () => {
    const userId = await getUserId()
    if (userId === targetUserId) throw new AppError('Não podes seguir-te a ti próprio.')
    const existing = await db.select().from(follows).where(and(eq(follows.followerId, userId), eq(follows.followingId, targetUserId))).limit(1)
    if (existing.length) await db.delete(follows).where(and(eq(follows.followerId, userId), eq(follows.followingId, targetUserId)))
    else await db.insert(follows).values({ followerId: userId, followingId: targetUserId })
    revalidatePath('/comunidade')
  }, 'Não foi possível actualizar. Tenta outra vez.')
}
