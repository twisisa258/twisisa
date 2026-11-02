import { StudentFeatureShell } from '@/components/student-feature-shell'
import { StudyLaterList } from '@/components/aluno/study-later-list'
import { listMarks } from '@/lib/kit'
import { requireStudent } from '@/lib/require-student'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Estudar depois' }

export default async function EstudarDepoisPage() {
  const session = await requireStudent('/aluno/estudar-depois')
  const marks = await listMarks(session.user.id).catch((error: unknown) => {
    console.error('[ESTUDAR DEPOIS]', error)
    return null
  })
  return (
    <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="Revisão" title="Estudar depois." description="As questões que guardaste, por ordem de data.">
      {marks === null ? (
        <div className="rounded-2xl border border-linha bg-white p-6"><p className="text-[15px] font-medium">Não foi possível carregar a tua lista</p><p className="mt-1 text-sm text-texto-2">Tenta outra vez daqui a pouco.</p></div>
      ) : (
        <StudyLaterList initial={marks} />
      )}
    </StudentFeatureShell>
  )
}
