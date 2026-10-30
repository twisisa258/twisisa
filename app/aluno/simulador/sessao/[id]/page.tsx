import { notFound, redirect } from 'next/navigation'
import { getResult, loadPlay } from '@/lib/simulator'
import { getSimPrefs } from '@/lib/simulator-prefs-server'
import { SessionPlayer } from '@/components/simulador/session-player'
import { ResultView } from '@/components/simulador/result-view'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { requireStudent } from '@/lib/require-student'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Simulador | Twisisa' }

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireStudent()

  const play = await loadPlay(session.user.id, id)
  if (play.state === 'missing') notFound()
  if (play.state === 'abandoned') redirect('/aluno/simulador')
  if (play.state === 'play') {
    const { sound, haptics } = await getSimPrefs()
    return <SessionPlayer data={play.data} cues={{ sound, haptics }} />
  }

  const result = await getResult(session.user.id, id)
  if (!result) notFound()
  return (
    <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="Simulador" title="Resultado" hideBackLink>
      <ResultView result={result} />
    </StudentFeatureShell>
  )
}
