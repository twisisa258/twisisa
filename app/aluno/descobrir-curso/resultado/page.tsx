import { redirect } from 'next/navigation'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { OrientacaoStartButton } from '@/components/orientacao/orientacao-buttons'
import { getVisibleModules } from '@/lib/exam-modules'
import { ORIENTACAO_HREF, ORIENTACAO_MODULE_KEY, getLatestResult } from '@/lib/orientacao'
import { DIMENSION_LABEL } from '@/lib/orientacao-shared'
import { requireSimulatorScope } from '@/lib/simulator-scope'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Os teus cursos | Twisisa' }

const card = 'rounded-2xl bg-gradient-to-br from-white to-[#f4f6f1] shadow-[0_1px_2px_rgba(20,50,40,0.05)]'

const joinLabels = (list: string[]) => (list.length <= 1 ? (list[0] ?? '') : `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`)

export default async function ResultadoPage() {
  const { scope, firstName } = await requireSimulatorScope()
  const modules = await getVisibleModules(scope.track)
  const entry = modules.find((item) => item.key === ORIENTACAO_MODULE_KEY)
  if (!entry || entry.status !== 'active') redirect('/aluno')

  const latest = await getLatestResult(scope.userId)
  if (!latest) redirect(ORIENTACAO_HREF)
  const { courses, flat } = latest.result

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Orientação" title="Os teus cursos" hideTitle>
      <div className="max-w-[560px]">
        <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-[#202321]">Os teus cursos</h1>

        {courses.length === 0 ? (
          <p className="mt-3 text-[15px] leading-6 text-[#5f6962]">As tuas respostas não apontam para nenhum curso com clareza. Tenta de novo quando quiseres.</p>
        ) : (
          <>
            <p className="mt-3 text-[13px] leading-5 text-[#6b756e]">A afinidade mostra o quanto o curso combina com o que disseste que gostas. Não garante a entrada.</p>
            {flat && <p className="mt-2 text-[13px] leading-5 text-[#6b756e]">As tuas respostas foram muito parecidas, por isso as diferenças entre os cursos são pequenas.</p>}
            <ol className="mt-5 space-y-3">
              {courses.map((course) => (
                <li key={course.courseId} className={`${card} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold leading-5 text-[#202321]">{course.name}</p>
                      <p className="mt-1 text-[12.5px] leading-4 text-[#6b756e]">{[course.unit, course.institution].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="flex-none text-right">
                      <p className="text-[20px] font-semibold leading-6 text-[#1d4d41]">{course.percent}%</p>
                      <p className="text-[11px] text-[#6b756e]">afinidade</p>
                    </div>
                  </div>
                  {course.reasons.length > 0 && <p className="mt-3 text-[13px] text-[#39433e]">Porque gostas de {joinLabels(course.reasons.map((d) => DIMENSION_LABEL[d]))}.</p>}
                </li>
              ))}
            </ol>
          </>
        )}

        <div className="mt-6">
          <OrientacaoStartButton label="Refazer o teste" variant="secondary" />
        </div>
      </div>
    </StudentFeatureShell>
  )
}
