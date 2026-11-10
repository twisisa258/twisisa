import { eq } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'
import { STATUS_ATIVOS } from '@/lib/plano'

export async function getSubscription(userId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1)
  return row
}

/** Ativa se o estado for ativo e o período pago ainda não acabou (sem data de fim, vale o estado). */
export function isSubscriptionActive(status: string | undefined, periodEnd?: Date | null) {
  if (!status || !STATUS_ATIVOS.includes(status)) return false
  return !periodEnd || periodEnd.getTime() > Date.now()
}

/** Tem Plus ativo? Uma consulta por pedido (várias partes da mesma página partilham a resposta). Se a base falhar, segue sem selo. */
export const hasPlus = cache(async (userId: string): Promise<boolean> => {
  const row = await getSubscription(userId).catch(() => undefined)
  return isSubscriptionActive(row?.status, row?.currentPeriodEnd)
})
