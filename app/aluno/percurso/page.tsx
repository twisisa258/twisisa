import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { listStudentInstitutions } from '@/lib/institutions'
import { isTrack } from '@/lib/percurso'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { PercursoPicker } from '@/components/percurso-picker'
import { requireStudent } from '@/lib/require-student'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'O teu percurso | Twisisa', description: 'Escolhe o que estás a preparar: 10ª classe, 12ª classe ou admissão ao ensino superior.' }

export default async function PercursoPage() {
  const session = await requireStudent('/aluno/percurso')

  const [[profile], institutions] = await Promise.all([
    db.select({ track: studentProfiles.track, institutionId: studentProfiles.institutionId }).from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)).limit(1),
    listStudentInstitutions(),
  ])
  const firstName = session.user.name.split(' ')[0]
  const savedTrack = profile?.track

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Percurso" title="O teu percurso" hideBackLink>
      <PercursoPicker
        initialTrack={isTrack(savedTrack) ? savedTrack : null}
        initialInstitutionId={profile?.institutionId ?? null}
        institutions={institutions.map((item) => ({ id: item.id, shortName: item.shortName, name: item.name, description: item.description, logoUrl: item.logoUrl, soon: item.contentCount === 0 }))}
      />
    </StudentFeatureShell>
  )
}
