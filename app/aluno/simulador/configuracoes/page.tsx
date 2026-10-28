import { requireSimulatorScope } from '@/lib/simulator-scope'
import { getSimPrefs } from '@/lib/simulator-prefs-server'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { SimHeader } from '@/components/simulador/sim-header'
import { SimTabs } from '@/components/simulador/sim-tabs'
import { SettingsForm } from '@/components/simulador/settings-form'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Configurações do Simulador | Twisisa' }

export default async function SimuladorSettingsPage() {
  const [{ firstName }, prefs] = await Promise.all([requireSimulatorScope(), getSimPrefs()])
  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Simulador" title="Configurações" hideTitle hideBackLink>
      <div className="max-w-[640px] space-y-6">
        <SimHeader />
        <SimTabs active="configuracoes" />
        <SettingsForm initial={prefs} />
      </div>
    </StudentFeatureShell>
  )
}
