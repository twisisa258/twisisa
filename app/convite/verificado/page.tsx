import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getStaffAccess } from '@/lib/staff'
import { InviteFlow } from '@/components/convite/invite-flow'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'E-mail confirmado', robots: { index: false, follow: false }, referrer: 'no-referrer' }

// Destino do link de verificação. Se a conta tinha uma carta à espera, conclui-se aqui (getStaffAccess trata disso) e a carta é destruída.
export default async function VerifiedPage() {
  const access = await getStaffAccess()
  if (!access) redirect('/aluno')
  return <InviteFlow token="" view={{ state: 'done' }} />
}
