import { StudentFeatureShell } from '@/components/student-feature-shell'
import { ReminderSettings } from '@/components/aluno/reminder-settings'
import { PushToggle } from '@/components/aluno/push-toggle'
import { pool } from '@/lib/db'
import { DEFAULT_STUDY_HOUR } from '@/lib/lembretes-shared'
import { requireStudent } from '@/lib/require-student'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Lembretes' }

export default async function LembretesPage() {
  const session = await requireStudent('/aluno/lembretes')
  const row = (await pool.query(`SELECT email_enabled, study_hour FROM notification_prefs WHERE user_id = $1`, [session.user.id]).catch(() => ({ rows: [] }))).rows[0]
  return (
    <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="A minha conta" title="Lembretes." description="Um aviso curto, na hora que escolheres.">
      <div className="space-y-4">
        <PushToggle publicKey={process.env.VAPID_PUBLIC_KEY ?? ''} />
        <ReminderSettings email={session.user.email} initialEnabled={row?.email_enabled === true} initialHour={(row?.study_hour as number | null) ?? DEFAULT_STUDY_HOUR} />
      </div>
    </StudentFeatureShell>
  )
}
