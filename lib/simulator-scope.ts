import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { requireStudent } from '@/lib/require-student'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { isTrack } from '@/lib/percurso'
import type { StudentScope } from '@/lib/simulator'

/** Sessão + percurso do aluno para as páginas do Simulador (só servidor). Sem sessão ou percurso, redireciona. */
export async function requireSimulatorScope() {
  const session = await requireStudent()
  const [profile] = await db.select({ track: studentProfiles.track, institutionId: studentProfiles.institutionId }).from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)).limit(1)
  if (!isTrack(profile?.track)) redirect('/aluno/percurso')
  const scope: StudentScope = { userId: session.user.id, track: profile.track, institutionId: profile.institutionId ?? null }
  return { scope, firstName: session.user.name.split(' ')[0] }
}
