import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { requireStudent } from '@/lib/require-student'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { isTrack } from '@/lib/percurso'
import { getCourseGate } from '@/lib/combinacoes'
import type { StudentScope } from '@/lib/simulator'

/** Sessão + percurso do aluno para as páginas do Simulador (só servidor). Sem sessão ou percurso, redireciona. */
/**
 * `gate`: quem se candidata e ainda não escolheu o curso (ou a combinação de provas) vai escolher antes de começar. As páginas do
 * teste vocacional passam `gate: false`, porque é por lá que se pode escolher.
 */
export async function requireSimulatorScope(options: { gate?: boolean; next?: string } = {}) {
  const session = await requireStudent()
  const [profile] = await db.select({ track: studentProfiles.track, otherLevel: studentProfiles.otherLevel, institutionId: studentProfiles.institutionId }).from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)).limit(1)
  // Sem questões para «outra classe»: o painel explica, em vez de pedir de novo o percurso.
  if (!isTrack(profile?.track)) redirect(profile?.otherLevel ? '/aluno' : '/aluno/percurso')
  const scope: StudentScope = { userId: session.user.id, track: profile.track, institutionId: profile.institutionId ?? null }
  if (options.gate !== false && scope.track === 'admissao') {
    const gate = await getCourseGate(scope.userId)
    if (gate.need) redirect(`/aluno?curso=1&next=${encodeURIComponent(options.next ?? '/aluno/simulador')}`)
  }
  return { scope, firstName: session.user.name.split(' ')[0] }
}
