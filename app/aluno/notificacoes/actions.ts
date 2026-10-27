'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'

export async function getNotifications() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return db.select().from(notifications).where(eq(notifications.userId, session.user.id)).orderBy(notifications.createdAt)
}
export async function markNotificationRead(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id), isNull(notifications.readAt)))
    revalidatePath('/aluno/notificacoes')
  }, 'Não foi possível marcar como lida. Tenta outra vez.')
}
