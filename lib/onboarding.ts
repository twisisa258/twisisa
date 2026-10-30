import { cache } from 'react'
import { pool } from '@/lib/db'
import { TERMS_VERSION } from '@/lib/identity'
import { isTrack } from '@/lib/percurso'

// Estado do onboarding (só servidor). O passo calcula-se pelo que falta; não há tabela de passos.
// 1. Sobre ti: data de nascimento (e aceitação dos Termos se ainda não existe para a versão actual).
// 2. O que preparas: percurso, instituição (admissão) e meta diária.
// 3. Lembretes: escolha registada em notification_prefs.

export type OnboardingStep = 1 | 2 | 3

export type OnboardingState = {
  name: string
  email: string
  birthDate: string | null
  track: string | null
  otherLevel: string | null
  institutionId: string | null
  dailyGoal: number | null
  hasConsent: boolean
  hasPrefs: boolean
  /** Primeiro passo em falta, ou null se o onboarding está completo. */
  step: OnboardingStep | null
}

export function nextStep(input: { birthDate: string | null; hasConsent: boolean; track: string | null; otherLevel?: string | null; institutionId: string | null; dailyGoal: number | null; hasPrefs: boolean }): OnboardingStep | null {
  if (!input.birthDate || !input.hasConsent) return 1
  const hasPath = isTrack(input.track) ? input.track !== 'admissao' || Boolean(input.institutionId) : Boolean(input.otherLevel)
  if (!hasPath || !input.dailyGoal) return 2
  if (!input.hasPrefs) return 3
  return null
}

export const getOnboardingState = cache(async (userId: string): Promise<OnboardingState> => {
  const result = await pool.query(
    `SELECT u.name, u.email,
            to_char(p.birth_date, 'YYYY-MM-DD') AS birth_date, p.track, p.other_level, p.institution_id, p.daily_goal,
            EXISTS (SELECT 1 FROM account_consents c WHERE c.user_id = u.id AND c.kind = 'terms' AND c.version = $2) AS has_consent,
            EXISTS (SELECT 1 FROM notification_prefs n WHERE n.user_id = u.id) AS has_prefs
     FROM "user" u LEFT JOIN student_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId, TERMS_VERSION],
  )
  const row = result.rows[0]
  const state = {
    name: (row?.name as string) ?? '',
    email: (row?.email as string) ?? '',
    birthDate: (row?.birth_date as string | null) ?? null,
    track: (row?.track as string | null) ?? null,
    otherLevel: (row?.other_level as string | null) ?? null,
    institutionId: (row?.institution_id as string | null) ?? null,
    dailyGoal: (row?.daily_goal as number | null) ?? null,
    hasConsent: row?.has_consent === true,
    hasPrefs: row?.has_prefs === true,
  }
  return { ...state, step: nextStep(state) }
})
