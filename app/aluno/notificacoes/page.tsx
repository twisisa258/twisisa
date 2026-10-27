import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { NotificationsFeed } from '@/components/notifications-feed'
import { getNotifications } from './actions'

export default async function NotificacoesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const firstName = session.user.name.split(' ')[0]
  const items = await getNotifications()
  return <StudentFeatureShell firstName={firstName} eyebrow="Atualizações" title="As tuas notificações." description="Avisos sobre materiais, atividade e resultados guardados na tua conta."><NotificationsFeed initial={items} /></StudentFeatureShell>
}
