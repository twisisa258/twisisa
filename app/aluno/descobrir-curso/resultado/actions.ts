'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { getCourse } from '@/lib/target-course'
import { getCourseCombos, setStudentOption } from '@/lib/combinacoes'
import { resolveCombo } from '@/lib/combinacoes-pure'

// O aluno escolhe, entre os cursos sugeridos pelo teste, o curso a que se candidata.
// Escolher um curso é preparar a admissão nessa instituição: o percurso passa a «Admissão» e a instituição é a do curso.
export async function chooseCourse(courseId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')
    const course = await getCourse(String(courseId))
    if (!course) throw new AppError('Este curso já não está disponível. Escolhe outro.')

    const set = { track: 'admissao', institutionId: course.institutionId, targetCourseId: course.id, targetCourse: course.name, updatedAt: new Date() }
    await db
      .insert(studentProfiles)
      .values({ userId: session.user.id, ...set })
      .onConflictDoUpdate({ target: studentProfiles.userId, set })

    // Uma só combinação fica escolhida sozinha; várias: o aluno escolhe a seguir (página «Escolhe o teu curso»).
    await setStudentOption(session.user.id, resolveCombo(await getCourseCombos(course.id), null).optionId)

    for (const path of ['/aluno', '/aluno/perfil', '/aluno/desafios', '/aluno/simulador']) revalidatePath(path)
    return 'Curso escolhido.'
  }, 'Não foi possível guardar o curso. Tenta outra vez.')
}
