import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Copy, Gift, Users } from 'lucide-react'
import { auth } from '@/lib/auth'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { InvitePanel } from '@/components/invite-panel'

export default async function ConvitesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  return <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="Aprender acompanhado" title="Convida a tua turma." description="Partilha Twisisa com colegas e acompanha quem começa esta jornada contigo."><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-[#e3e5dc] bg-white p-5"><Gift className="text-[#1d4d41]" size={20} /><p className="mt-4 text-lg font-medium">Benefício</p><p className="mt-1 text-sm text-[#7d857e]">Cada convite ajuda a comunidade a crescer.</p></div><div className="rounded-2xl border border-[#e3e5dc] bg-white p-5"><Users className="text-[#1d4d41]" size={20} /><p className="mt-4 text-lg font-medium">A tua turma</p><p className="mt-1 text-sm text-[#7d857e]">Vê quem aceitou o teu convite.</p></div><div className="rounded-2xl border border-[#e3e5dc] bg-white p-5"><Copy className="text-[#1d4d41]" size={20} /><p className="mt-4 text-lg font-medium">Partilha fácil</p><p className="mt-1 text-sm text-[#7d857e]">Usa o link ou copia a mensagem.</p></div></div><InvitePanel /></StudentFeatureShell>
}
