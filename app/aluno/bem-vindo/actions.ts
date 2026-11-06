'use server'

import { notificarAluno } from '@/lib/notificar'
import { DEFAULT_STUDY_HOUR } from '@/lib/lembretes-shared'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { AppError } from '@/lib/action-result'
import { cleanName, checkBirth, isDailyGoal, PRIVACY_VERSION, TERMS_VERSION, toIsoDate, validateName } from '@/lib/identity'
import { getOnboardingState } from '@/lib/onboarding'
import { isTrack } from '@/lib/percurso'
import { getVisibleModules } from '@/lib/exam-modules'
import { startAttempt } from '@/lib/simulator'
import { getCourseCombos, getCourseGate, setStudentOption } from '@/lib/combinacoes'
import { resolveCombo } from '@/lib/combinacoes-pure'
import { listInstitutionCourses } from '@/lib/target-course'

// Onboarding (dois a cinco ecrãs, conforme o percurso). Cada passo guarda-se no servidor ao avançar: se o estudante fechar a aplicação, retoma onde parou.
// As acções devolvem o resultado em vez de lançar (em produção o Next.js esconde as mensagens de erro lançadas).

export type StepResult = { ok: true; gated?: boolean } | { ok: false; message: string; underAge?: boolean }

async function step(fallback: string, task: (user: { id: string; email: string }) => Promise<StepResult | void>): Promise<StepResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { ok: false, message: 'A tua sessão expirou. Inicia sessão outra vez.' }
    return (await task({ id: session.user.id, email: session.user.email })) ?? { ok: true }
  } catch (error) {
    const digest = error && typeof error === 'object' ? (error as { digest?: unknown }).digest : undefined
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw error
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[ONBOARDING]', fallback, error)
    return { ok: false, message: fallback }
  }
}

/** Ecrã 1: nome, data de nascimento (validada aqui, nunca só na interface) e, se ainda não existe, a aceitação dos Termos. */
export async function saveAboutYou(input: { name: string; day: number; month: number; year: number; acceptTerms: boolean }): Promise<StepResult> {
  return step('Não foi possível guardar. Tenta outra vez.', async (user) => {
    const nameError = validateName(input?.name)
    if (nameError) throw new AppError(nameError)
    const birth = checkBirth({ year: input?.year, month: input?.month, day: input?.day })

    if (!birth.ok) {
      if (birth.code === 'under_age') {
        // Menor de 13: nenhuma conta fica activa e nenhum dado é guardado. O apagamento leva consigo sessões e consentimentos (ON DELETE CASCADE).
        await pool.query('DELETE FROM "user" WHERE id = $1', [user.id])
        return { ok: false, message: birth.message, underAge: true }
      }
      throw new AppError(birth.message)
    }

    const state = await getOnboardingState(user.id)
    if (!state.hasConsent) {
      if (input.acceptTerms !== true) throw new AppError('Aceita os Termos e a Privacidade para continuar.')
      const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || null
      await pool.query(`INSERT INTO account_consents (user_id, kind, version, ip) VALUES ($1, 'terms', $2, $4), ($1, 'privacy', $3, $4)`, [user.id, TERMS_VERSION, PRIVACY_VERSION, ip])
    }

    // Menores de 18 recebem as predefinições de privacidade no momento em que a data é guardada pela primeira vez (ranking oculto).
    // Nas vezes seguintes a escolha do estudante mantém-se.
    await pool.query(
      `INSERT INTO student_profiles (user_id, birth_date, show_in_ranking) VALUES ($1, $2::date, $3)
       ON CONFLICT (user_id) DO UPDATE SET birth_date = $2::date, updated_at = now(),
         show_in_ranking = CASE WHEN student_profiles.birth_date IS NULL AND $4 THEN false ELSE student_profiles.show_in_ranking END`,
      [user.id, toIsoDate(birth.birth), !birth.minor, birth.minor],
    )
    await pool.query('UPDATE "user" SET name = $2, "updatedAt" = now() WHERE id = $1', [user.id, cleanName(input.name)])
    revalidatePath('/aluno')
  })
}

/** Percurso e, na admissão, a instituição. Ao mudar de instituição, o curso e a combinação ficam por escolher outra vez. */
export async function saveTrack(input: { track: string; institutionId: string | null }): Promise<StepResult> {
  return step('Não foi possível guardar. Tenta outra vez.', async (user) => {
    const state = await getOnboardingState(user.id)
    if (!state.birthDate) throw new AppError('Falta o primeiro passo. Volta atrás e preenche a tua data de nascimento.')
    if (!isTrack(input?.track)) throw new AppError('Escolhe o que estás a preparar.')

    let institutionId: string | null = null
    if (input.track === 'admissao') {
      institutionId = typeof input.institutionId === 'string' && input.institutionId.length <= 100 ? input.institutionId : null
      if (!institutionId) throw new AppError('Escolhe a instituição a que te candidatas.')
      const found = await pool.query('SELECT 1 FROM institutions WHERE id = $1 AND active = true', [institutionId])
      if (!found.rowCount) throw new AppError('Essa instituição já não está disponível. Escolhe outra.')
    }
    const keepCourse = input.track === 'admissao' && state.institutionId === institutionId
    await pool.query(
      `INSERT INTO student_profiles (user_id, track, institution_id) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET track = $2, institution_id = $3, updated_at = now(),
         target_course_id = CASE WHEN $4 THEN student_profiles.target_course_id ELSE NULL END,
         target_course = CASE WHEN $4 THEN student_profiles.target_course ELSE NULL END`,
      [user.id, input.track, institutionId, keepCourse],
    )
    if (!keepCourse) await setStudentOption(user.id, null)
    revalidatePath('/aluno')
  })
}

/** Cursos da instituição que o aluno escolheu (lista vinda da base de dados). */
export async function listCoursesOfMyInstitution(): Promise<{ ok: true; courses: { id: string; name: string; unit: string | null }[] } | { ok: false; message: string }> {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  if (!session?.user) return { ok: false, message: 'A tua sessão expirou. Inicia sessão outra vez.' }
  try {
    const state = await getOnboardingState(session.user.id)
    if (!state.institutionId) return { ok: true, courses: [] }
    return { ok: true, courses: await listInstitutionCourses(state.institutionId) }
  } catch (error) {
    console.error('[ONBOARDING] cursos', error)
    return { ok: false, message: 'Não foi possível carregar os cursos. Tenta outra vez.' }
  }
}

/** Combinações de provas do curso. Se houver mais de uma, o aluno escolhe; se houver uma, fica escolhida sozinha. */
export async function listCourseCombos(courseId: string): Promise<{ ok: true; combos: { optionId: string; label: string }[] } | { ok: false; message: string }> {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  if (!session?.user) return { ok: false, message: 'A tua sessão expirou. Inicia sessão outra vez.' }
  try {
    if (typeof courseId !== 'string' || courseId.length > 100) return { ok: true, combos: [] }
    const combos = await getCourseCombos(courseId)
    return { ok: true, combos: combos.map((combo) => ({ optionId: combo.optionId, label: combo.label })) }
  } catch (error) {
    console.error('[ONBOARDING] combinações', error)
    return { ok: false, message: 'Não foi possível carregar as provas do curso. Tenta outra vez.' }
  }
}

/** Curso e combinação de provas. courseId nulo = «ainda não sei» (o teste vocacional fica à espera no painel). */
export async function saveCourse(input: { courseId: string | null; optionId: string | null }): Promise<StepResult> {
  return step('Não foi possível guardar. Tenta outra vez.', async (user) => {
    const state = await getOnboardingState(user.id)
    if (state.track !== 'admissao' || !state.institutionId) throw new AppError('Escolhe primeiro a instituição.')
    if (!input?.courseId) {
      await pool.query(`UPDATE student_profiles SET target_course_id = NULL, target_course = NULL, updated_at = now() WHERE user_id = $1`, [user.id])
      await setStudentOption(user.id, null)
      revalidatePath('/aluno')
      return
    }
    const course = await pool.query('SELECT name FROM courses WHERE id = $1 AND institution_id = $2 AND active', [input.courseId, state.institutionId])
    if (!course.rows[0]) throw new AppError('Escolhe um curso da lista da tua instituição.')
    const resolved = resolveCombo(await getCourseCombos(input.courseId), typeof input.optionId === 'string' ? input.optionId : null)
    if (resolved.needsChoice) throw new AppError('Escolhe a tua combinação de provas.')
    await pool.query(`UPDATE student_profiles SET target_course_id = $2, target_course = $3, updated_at = now() WHERE user_id = $1`, [user.id, input.courseId, course.rows[0].name])
    await setStudentOption(user.id, resolved.optionId)
    revalidatePath('/aluno')
    revalidatePath('/aluno/perfil')
  })
}

/**
 * Último passo: meta diária. Fecha o onboarding. Os lembretes vêm ligados por defeito (e-mail); o push depende da permissão
 * do aluno e pede-se num modal no painel. Desliga-se no perfil.
 */
export async function saveGoal(input: { dailyGoal: number }): Promise<StepResult> {
  return step('Não foi possível guardar. Tenta outra vez.', async (user) => {
    const state = await getOnboardingState(user.id)
    if (!state.birthDate || !state.track) throw new AppError('Faltam passos anteriores. Volta atrás.')
    if (!isDailyGoal(input?.dailyGoal)) throw new AppError('Escolhe a tua meta diária.')
    await pool.query(`UPDATE student_profiles SET daily_goal = $2, onboarded_at = coalesce(onboarded_at, now()), updated_at = now() WHERE user_id = $1`, [user.id, input.dailyGoal])

    // Só lembretes de estudo e resumo: nunca promoção. Se já existia uma escolha, mantém-se.
    await pool.query(
      `INSERT INTO notification_prefs (user_id, email_enabled, push_enabled, categories, unsubscribe_token, study_hour)
       VALUES ($1, true, false, $2::jsonb, $3, $4) ON CONFLICT (user_id) DO NOTHING`,
      [user.id, JSON.stringify({ study: true, summary: true, promo: false }), randomBytes(24).toString('hex'), DEFAULT_STUDY_HOUR],
    )

    // Boas-vindas na plataforma, uma só vez. Também vai por e-mail e push (ver lib/notificar.ts).
    const firstName = state.name.split(' ')[0] || 'estudante'
    await notificarAluno({
      userId: user.id,
      kind: 'boas-vindas',
      title: `Boas-vindas, ${firstName}`,
      body: 'Responde a algumas questões hoje e começa a tua sequência de dias de estudo.',
      dedupeKey: 'boas-vindas',
      unica: true,
    }).catch((error) => console.error('[ONBOARDING] notificação de boas-vindas', error))

    revalidatePath('/aluno')
    revalidatePath('/aluno/notificacoes')
    // Sem curso (ou combinação) escolhido não se começa nada: o cliente leva-o a escolher.
    return { ok: true, gated: (await getCourseGate(user.id)).need !== null }
  })
}

/**
 * Primeiro simulado curto: Prática com o tamanho da meta diária. Se o simulador ainda não tem questões ou módulos
 * activos para este percurso, devolve null e o estudante entra no painel.
 */
export async function startFirstSession(): Promise<{ href: string | null }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { href: null }
    const state = await getOnboardingState(session.user.id)
    if (state.step !== null || !isTrack(state.track) || !state.dailyGoal) return { href: null }
    const modules = await getVisibleModules(state.track)
    if (!modules.some((item) => item.key === 'pratica' && item.status === 'active')) return { href: null }
    const id = await startAttempt({ userId: session.user.id, track: state.track, institutionId: state.institutionId }, 'pratica', null, null, null, { size: state.dailyGoal })
    return { href: `/aluno/simulador/sessao/${id}` }
  } catch (error) {
    // Sem questões para este percurso (AppError) ou erro inesperado: o painel serve.
    if (!(error instanceof AppError)) console.error('[ONBOARDING] primeiro simulado', error)
    return { href: null }
  }
}
