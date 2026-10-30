import { redirect } from 'next/navigation'
import { requireSession, ONBOARDING_PATH } from '@/lib/require-student'
import { getOnboardingState } from '@/lib/onboarding'
import { listStudentInstitutions } from '@/lib/institutions'
import { provisionalName } from '@/lib/identity'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Bem-vindo | Twisisa', description: 'Três passos rápidos para começares a estudar.', robots: { index: false, follow: false } }

// Onboarding: 3 ecrãs (docs/IDENTIDADE-ONBOARDING-RETENCAO.md, secção 3). Só há uma página; o passo vem do que falta no servidor.
export default async function BemVindoPage() {
  const session = await requireSession(ONBOARDING_PATH)
  const state = await getOnboardingState(session.user.id)
  if (state.step === null) redirect('/aluno')

  const institutions = await listStudentInstitutions().catch((error) => {
    console.error('[ONBOARDING] instituições', error)
    return []
  })
  // Quem criou conta só com e-mail tem um nome provisório (a parte antes do «@»): o campo começa vazio para escrever o verdadeiro.
  const provisional = state.name.trim().toLowerCase() === provisionalName(state.email).toLowerCase() || state.name === 'Estudante'

  return (
    <OnboardingFlow
      initialStep={state.step}
      initialName={provisional ? '' : state.name}
      initialBirth={state.birthDate}
      needsConsent={!state.hasConsent}
      initialTrack={state.track}
      initialInstitutionId={state.institutionId}
      initialGoal={state.dailyGoal}
      institutions={institutions.map((item) => ({ id: item.id, shortName: item.shortName, name: item.name, soon: item.contentCount === 0 }))}
    />
  )
}
