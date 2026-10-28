'use client'

import { useState } from 'react'
import { useFeedback } from '@/components/feedback-provider'
import { track } from '@/lib/analytics'
import { Spinner } from '@/components/ui/spinner'

export function CheckoutButton({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(false)
  const feedback = useFeedback()

  async function startCheckout() {
    setLoading(true)
    track('begin_checkout', { items: [{ item_id: productId }] })
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId }),
      })
      if (response.status === 401) {
        window.location.assign('/sign-in')
        return
      }
      const result = await response.json()
      if (!response.ok || !result.url) throw new Error(result.error ?? 'Falha ao iniciar checkout.')
      window.location.assign(result.url)
    } catch (checkoutError) {
      feedback.error(checkoutError instanceof Error ? checkoutError.message : 'Falha ao iniciar checkout.', 'Não foi possível abrir o pagamento')
      setLoading(false)
    }
  }

  return <div>
    <button type="button" onClick={startCheckout} disabled={loading} aria-busy={loading} className="inline-flex items-center gap-2 rounded-full bg-[#1d4d41] px-6 py-3 font-semibold text-white disabled:opacity-60">
      {loading ? <><Spinner />A abrir pagamento…</> : 'Assinar Twisisa Plus'}
    </button>
  </div>
}
