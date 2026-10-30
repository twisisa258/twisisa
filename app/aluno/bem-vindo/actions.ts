'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomBytes, randomUUID } from 'node:crypto'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { AppError } from '@/lib/action-result'
import { cleanName, checkBirth, isDailyGoal, PRIVACY_VERSION, TERMS_VERSION, toIsoDate, validateName } from '@/lib/identity'
import { getOnboardingState } from '@/lib/onboarding'
import { isTrack } from '@/lib/percurso'
import { getVisibleModules } from '@/lib/exam-modules'
import { startAttempt } from '@/lib/simulator'

// Onboarding (3 ecrãs). Cada passo guarda-se no servidor ao avançar: se o estudante fechar a aplicação, retoma onde parou.
// As acções devolvem o resultado em vez de lançar (em produção o Next.js esconde as mensagens de erro lançadas).

export type StepResult = { ok: true } | { ok: false; message: string; underAge?: boolean }

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

/** Ecrã 2: percurso, instituição (só admissão) e meta diária. */
export async function saveTrackAndGoal(input: { track: string; institutionId: string | null; dailyGoal: number }): Promise<StepResult> {
  return step('Não foi possível guardar. Tenta outra vez.', async (user) => {
    const state = await getOnboardingState(user.id)
    if (!state.birthDate) throw new AppError('Falta o primeiro passo. Volta atrás e preenche a tua data de nascimento.')
    if (!isTrack(input?.track)) throw new AppError('Escolhe o que estás a preparar.')
    if (!isDailyGoal(input.dailyGoal)) throw new AppError('Escolhe a tua meta diária.')

    let institutionId: string | null = null
    if (input.track === 'admissao') {
      institutionId = typeof input.institutionId === 'string' && input.institutionId.length <= 100 ? input.institutionId : null
      if (!institutionId) throw new AppError('Escolhe a instituição a que te candidatas.')
      const found = await pool.query('SELECT 1 FROM institutions WHERE id = $1 AND active = true', [institutionId])
      if (!found.rowCount) throw new AppError('Essa instituição já não está disponível. Escolhe outra.')
    }

    await pool.query(
      `INSERT INTO student_profiles (user_id, track, institution_id, daily_goal) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET track = $2, institution_id = $3, daily_goal = $4, updated_at = now()`,
      [user.id, input.track, institutionId, input.dailyGoal],
    )
    revalidatePath('/aluno')
  })
}

/** Ecrã 3: lembretes. Fecha o onboarding. «push» fica registado como indisponível até o Web Push existir (fase G). */
export async function saveReminders(input: { choice: 'email' | 'none' }): Promise<StepResult> {
  return step('Não foi possível guardar. Tenta outra vez.', async (user) => {
    if (input?.choice !== 'email' && input?.choice !== 'none') throw new AppError('Escolhe uma opção.')
    const state = await getOnboardingState(user.id)
    if (!state.birthDate || !state.track || !state.dailyGoal) throw new AppError('Faltam passos anteriores. Volta atrás.')

    // Só lembretes de estudo e resumo: nunca promoção (menores de 18 não recebem promoção; hoje ninguém recebe).
    await pool.query(
      `INSERT INTO notification_prefs (user_id, email_enabled, push_enabled, categories, unsubscribe_token)
       VALUES ($1, $2, false, $3::jsonb, $4)
       ON CONFLICT (user_id) DO UPDATE SET email_enabled = $2, categories = $3::jsonb, updated_at = now()`,
      [user.id, input.choice === 'email', JSON.stringify({ study: true, summary: true, promo: false }), randomBytes(24).toString('hex')],
    )
    await pool.query(`UPDATE student_profiles SET onboarded_at = coalesce(onboarded_at, now()), updated_at = now() WHERE user_id = $1`, [user.id])

    // Boas-vindas na plataforma, uma só vez.
    const firstName = state.name.split(' ')[0] || 'estudante'
    await pool
      .query(
        `INSERT INTO notifications (id, user_id, title, body, kind)
         SELECT $1, $2, $3, $4, 'boas-vindas' WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = $2 AND kind = 'boas-vindas')`,
        [randomUUID(), user.id, `Boas-vindas, ${firstName}`, 'Responde a algumas questões hoje e começa a tua sequência de dias de estudo.'],
      )
      .catch((error) => console.error('[ONBOARDING] notificação de boas-vindas', error))

    revalidatePath('/aluno')
    revalidatePath('/aluno/notificacoes')
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
