import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'
import { getStripe } from '@/lib/stripe'

type Ref = string | { id: string } | null | undefined
const refId = (ref: Ref) => (typeof ref === 'string' ? ref : ref?.id ?? null)

async function saveSubscription(input: { userId: string; productId: string; status: string; customerId: string | null; subscriptionId: string | null }) {
  const values = { productId: input.productId, status: input.status, stripeCustomerId: input.customerId, stripeSubscriptionId: input.subscriptionId, updatedAt: new Date() }
  await db.insert(subscriptions).values({ userId: input.userId, ...values }).onConflictDoUpdate({ target: subscriptions.userId, set: values })
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object
      if (session.mode !== 'subscription' || session.payment_status !== 'paid') return
      const userId = session.client_reference_id ?? session.metadata?.userId
      const productId = session.metadata?.productId
      if (!userId || !productId) {
        console.error('[stripe] sessão sem userId/productId', session.id)
        return
      }
      await saveSubscription({ userId, productId, status: 'active', customerId: refId(session.customer), subscriptionId: refId(session.subscription) })
      return
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const userId = subscription.metadata?.userId
      const productId = subscription.metadata?.productId
      if (!userId || !productId) {
        console.error('[stripe] subscrição sem userId/productId', subscription.id)
        return
      }
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : subscription.status
      await saveSubscription({ userId, productId, status, customerId: refId(subscription.customer), subscriptionId: subscription.id })
      return
    }
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret)
  } catch {
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 })
  }

  try {
    await handleEvent(event)
    return NextResponse.json({ received: true })
  } catch (error) {
    // 500 para o Stripe voltar a tentar; antes, falhas de base de dados eram reportadas como "assinatura inválida".
    console.error('[stripe] falha ao processar evento', event.id, event.type, error)
    return NextResponse.json({ error: 'Falha ao processar evento.' }, { status: 500 })
  }
}
