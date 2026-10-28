'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics'

// Regista a compra uma única vez por sessão de pagamento (recarregar a página não duplica).
export function TrackPurchase({
  transactionId,
  value,
  currency,
  productId,
}: {
  transactionId: string
  value?: number
  currency?: string
  productId?: string
}) {
  useEffect(() => {
    const key = `ga-purchase-${transactionId}`
    try {
      if (window.sessionStorage.getItem(key)) return
      window.sessionStorage.setItem(key, '1')
    } catch {
      // Sem sessionStorage: segue e regista na mesma. O GA4 ignora transaction_id repetido.
    }
    track('purchase', {
      transaction_id: transactionId,
      value,
      currency,
      items: productId ? [{ item_id: productId }] : undefined,
    })
  }, [transactionId, value, currency, productId])

  return null
}
