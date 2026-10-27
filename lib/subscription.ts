import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'

const ACTIVE_STATUSES = ['active', 'trialing']

export async function getSubscription(userId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1)
  return row
}

export function isSubscriptionActive(status: string | undefined) {
  return !!status && ACTIVE_STATUSES.includes(status)
}
