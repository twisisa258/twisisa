import { StudentFeatureShell } from '@/components/student-feature-shell'
import { NotificationsFeed } from '@/components/notifications-feed'
import { getNotifications } from './actions'
import { requireStudent } from '@/lib/require-student'

export default async function NotificacoesPage() {
  const session = await requireStudent('/aluno/notificacoes')
  const firstName = session.user.name.split(' ')[0]
  const items = await getNotifications()
  return <StudentFeatureShell firstName={firstName} eyebrow="Atualizações" title="As tuas notificações." description="Avisos sobre materiais, atividade e resultados guardados na tua conta."><NotificationsFeed initial={items} /></StudentFeatureShell>
}
