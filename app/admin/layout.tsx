import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { pageMetadata } from '@/lib/seo'
import { getStaffAccess } from '@/lib/staff'
import { AdminShell } from '@/components/admin/admin-shell'
import { countUnread } from '@/lib/admin-notify'
import { contarRevisao } from '@/lib/revisao-db'

export const metadata: Metadata = pageMetadata({
  title: 'Administração | Twisisa',
  description: 'Gestão de conteúdos do Twisisa.',
  path: '/admin',
  index: false,
})

export default async function Layout({ children }: { children: React.ReactNode }) {
  const access = await getStaffAccess()
  // Sem sessão, /aluno reencaminha para o início de sessão; sem permissão, fica na área do estudante.
  if (!access) redirect('/aluno')
  const admin = access.user
  const home = access.role === 'admin' ? '/admin' : '/admin/questoes'
  const roleLabel = access.role === 'admin' ? 'Administração' : 'Revisão'
  const [porLer, emRevisao] = await Promise.all([countUnread(admin.id), contarRevisao()])

  return (
    <AdminShell home={home} role={access.role} roleLabel={roleLabel} firstName={admin.name.split(' ')[0]} badges={{ '/admin/notificacoes': porLer, '/admin/revisao': emRevisao }}>
      {children}
    </AdminShell>
  )
}
