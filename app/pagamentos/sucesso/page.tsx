import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { getSubscription, isSubscriptionActive } from '@/lib/subscription'
import { TrackPurchase } from '@/components/track-purchase'

export const metadata = { title: 'Pagamento | Twisisa' }

async function paidCheckoutOf(sessionId: string, userId: string) {
  try {
    const checkout = await getStripe().checkout.sessions.retrieve(sessionId)
    return checkout.client_reference_id === userId && checkout.payment_status === 'paid' ? checkout : null
  } catch (error) {
    console.error('[pagamentos] sessão de checkout inválida', error)
    return null
  }
}

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { session_id: sessionId } = await searchParams
  const checkout = sessionId ? await paidCheckoutOf(sessionId, session.user.id) : null
  if (!sessionId || !checkout) redirect('/planos')

  const active = isSubscriptionActive((await getSubscription(session.user.id))?.status)

  return <main className="min-h-screen bg-[#f8f8f5] px-5 py-16 text-[#202321]"><TrackPurchase transactionId={checkout.id} value={checkout.amount_total != null ? checkout.amount_total / 100 : undefined} currency={checkout.currency?.toUpperCase()} productId={checkout.metadata?.productId} /><div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center shadow-sm"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1d4d41]">Pagamento recebido</p><h1 className="mt-4 text-4xl font-semibold">{active ? 'O teu Plus está activo.' : 'A confirmar o teu acesso.'}</h1>{active ? null : <p className="mt-4 text-[#68716b]">Pode demorar alguns instantes. Actualiza esta página para ver o estado.</p>}<Link href="/aluno" className="mt-8 inline-flex rounded-full bg-[#1d4d41] px-6 py-3 font-semibold text-white">Ir para a área de estudante</Link></div></main>
}
