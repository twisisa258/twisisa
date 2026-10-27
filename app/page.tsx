import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import HomePage from '@/components/home-page'
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...pageMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: '/' }),
  title: { absolute: SITE_TITLE },
}

export default async function Page() {
  // A página inicial mostra «Painel» a quem já iniciou sessão. Se a verificação falhar, mostra-se como a um visitante.
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  return <HomePage signedIn={Boolean(session?.user)} />
}
