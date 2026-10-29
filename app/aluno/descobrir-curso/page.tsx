import { redirect } from 'next/navigation'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { OrientacaoPlayer } from '@/components/orientacao/orientacao-player'
import { OrientacaoStartButton } from '@/components/orientacao/orientacao-buttons'
import { getVisibleModules } from '@/lib/exam-modules'
import { ORIENTACAO_MODULE_KEY, ORIENTACAO_RESULT_HREF, getLatestResult, getOrientacaoTotal, loadOrientacaoPlay } from '@/lib/orientacao'
import { MINUTES_ESTIMATE } from '@/lib/orientacao-shared'
import { requireSimulatorScope } from '@/lib/simulator-scope'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Descobre o teu curso | Twisisa' }

// Entrada do teste: com um teste a meio, abre-o onde ficou; com resultado, vai ao resultado; senão, apresenta-o e deixa começar.
export default async function DescobrirCursoPage() {
  const { scope, firstName } = await requireSimulatorScope()
  const modules = await getVisibleModules(scope.track)
  const entry = modules.find((item) => item.key === ORIENTACAO_MODULE_KEY)
  if (!entry || entry.status !== 'active') redirect('/aluno')

  const play = await loadOrientacaoPlay(scope.userId)
  if (play && play.questions.length > 0) return <OrientacaoPlayer attemptId={play.attemptId} questions={play.questions} initial={play.answers} />
  if (await getLatestResult(scope.userId)) redirect(ORIENTACAO_RESULT_HREF)

  const total = await getOrientacaoTotal()
  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Orientação" title={entry.label} hideTitle>
      <div className="max-w-[520px]">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#202321]">{entry.label}</h1>
        {total === 0 ? (
          <p className="mt-3 text-[15px] leading-6 text-[#5f6962]">O teste ainda não tem perguntas. Volta mais tarde.</p>
        ) : (
          <>
            <p className="mt-3 text-[15px] leading-6 text-[#5f6962]">Diz do que gostas e vê cursos que combinam contigo.</p>
            <p className="mt-3 text-[13px] text-[#6b756e]">
              {total} perguntas · cerca de {MINUTES_ESTIMATE} minutos
            </p>
            <div className="mt-6">
              <OrientacaoStartButton label="Começar" />
            </div>
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
