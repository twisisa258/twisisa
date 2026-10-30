import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { getOnboardingState } from '@/lib/onboarding'
import { safeNext } from '@/lib/identity'

export const ONBOARDING_PATH = '/aluno/bem-vindo'

const loadSession = cache(async () => auth.api.getSession({ headers: await headers() }))

export type StudentSession = NonNullable<Awaited<ReturnType<typeof loadSession>>>

function signInPath(next?: string) {
  const target = next ? safeNext(next, '') : ''
  return target ? `/sign-in?next=${encodeURIComponent(target)}` : '/sign-in'
}

/** Só exige sessão (sem onboarding). Usada pelo próprio onboarding. Sem sessão, vai para entrar e volta a `next`. */
export async function requireSession(next?: string): Promise<StudentSession> {
  const session = await loadSession()
  if (!session?.user) redirect(signInPath(next))
  return session
}

/**
 * Guarda única das páginas do estudante: sem sessão vai entrar (e volta ao sítio de onde veio);
 * com onboarding por concluir vai para o primeiro passo em falta. A administração fica de fora do onboarding
 * para poder criar instituições e conteúdo antes de escolher um percurso (como já acontecia no painel).
 */
export async function requireStudent(next?: string): Promise<StudentSession> {
  const session = await requireSession(next)
  if (isAdminEmail(session.user.email)) return session
  const state = await getOnboardingState(session.user.id)
  if (state.step !== null) redirect(ONBOARDING_PATH)
  return session
}
