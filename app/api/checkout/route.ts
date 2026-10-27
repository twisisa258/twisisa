import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getProduct } from '@/lib/products'
import { getSiteUrl } from '@/lib/site-url'
import { getStripe } from '@/lib/stripe'
import { getSubscription, isSubscriptionActive } from '@/lib/subscription'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return NextResponse.json({ error: 'Inicia sessão para subscrever.' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const productId = typeof body?.productId === 'string' ? body.productId : ''
    const product = getProduct(productId)
    if (!product) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })

    const current = await getSubscription(session.user.id)
    if (isSubscriptionActive(current?.status)) {
      return NextResponse.json({ error: 'Já tens uma subscrição activa.' }, { status: 409 })
    }

    const siteUrl = getSiteUrl(request)
    const metadata = { productId: product.id, userId: session.user.id }
    const checkout = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      ui_mode: 'hosted_page',
      client_reference_id: session.user.id,
      customer_email: session.user.email,
      line_items: [{
        price_data: {
          currency: product.currency,
          product_data: { name: product.name, description: product.description },
          unit_amount: product.priceInCents,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata,
      subscription_data: { metadata },
      success_url: `${siteUrl}/pagamentos/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/planos?cancelled=1`,
      integration_identifier: `estuda_checkout_${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`,
    })

    return NextResponse.json({ url: checkout.url })
  } catch (error) {
    console.error('[checkout] falha ao criar sessão', error)
    return NextResponse.json({ error: 'Não foi possível iniciar o pagamento.' }, { status: 500 })
  }
}
