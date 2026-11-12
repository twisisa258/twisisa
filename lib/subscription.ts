import { eq } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'
import { STATUS_ATIVOS, dataLonga, varianteDoBloco, type BlocoMenu } from '@/lib/plano'

export async function getSubscription(userId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1)
  return row
}

/** Ativa se o estado for ativo e o período pago ainda não acabou (sem data de fim, vale o estado). */
export function isSubscriptionActive(status: string | undefined, periodEnd?: Date | null) {
  if (!status || !STATUS_ATIVOS.includes(status)) return false
  return !periodEnd || periodEnd.getTime() > Date.now()
}

// Uma consulta por pedido: o selo, o bloco do menu e as páginas partilham a resposta. Se a base falhar, segue sem Plus.
const subscricaoDoPedido = cache((userId: string) => getSubscription(userId).catch(() => undefined))

/** Tem Plus ativo? */
export const hasPlus = cache(async (userId: string): Promise<boolean> => {
  const row = await subscricaoDoPedido(userId)
  return isSubscriptionActive(row?.status, row?.currentPeriodEnd)
})

/** O bloco do topo do menu (variante e, com Plus, a data de fim) ou null se não há nada a mostrar. */
export const getBlocoPlus = cache(async (userId: string, criadaEmMs: number): Promise<BlocoMenu | null> => {
  const row = await subscricaoDoPedido(userId)
  const plus = isSubscriptionActive(row?.status, row?.currentPeriodEnd)
  const variante = varianteDoBloco({ plus, criadaEm: criadaEmMs })
  if (!variante) return null
  return variante === 'ativo' && row?.currentPeriodEnd ? { variante, ate: dataLonga(row.currentPeriodEnd) } : { variante }
})
