import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { getInviteView } from '@/lib/staff-invites'
import { InviteFlow } from '@/components/convite/invite-flow'

export const dynamic = 'force-dynamic'
// A carta é pessoal: fora dos motores de busca e sem enviar o link a outros sites.
export const metadata: Metadata = { title: 'Uma carta para ti', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  const signedIn = session?.user ? { id: session.user.id, email: session.user.email, verified: session.user.emailVerified } : null
  const view = await getInviteView(token, signedIn)
  return <InviteFlow token={token} view={view} />
}
