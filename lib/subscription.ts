import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'

const ACTIVE_STATUSES = ['active', 'trialing']

export async function getSubscription(userId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1)
  return row
}

/** Ativa se o estado for ativo e o período pago ainda não acabou (sem data de fim, vale o estado). */
export function isSubscriptionActive(status: string | undefined, periodEnd?: Date | null) {
  if (!status || !ACTIVE_STATUSES.includes(status)) return false
  return !periodEnd || periodEnd.getTime() > Date.now()
}
