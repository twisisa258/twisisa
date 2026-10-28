'use server'

import { cookies, headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { AppError } from '@/lib/action-result'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { isTrack } from '@/lib/percurso'
import { finishAttempt, startAttempt, submitAnswer, TimeUpError, type StudentScope } from '@/lib/simulator'
import { isAttemptMode, ROUND_SIZE, type PlayFeedback } from '@/lib/simulator-shared'
import { PREFS_COOKIE, parsePrefs, sessionSize, type SimPrefs } from '@/lib/simulator-prefs'
import { getSimPrefs } from '@/lib/simulator-prefs-server'

// As ações devolvem o resultado em vez de lançar (em produção o Next.js esconde as mensagens de erro lançadas).
type Result<T> = { ok: true; data: T } | { ok: false; message: string; timeUp?: boolean }

async function run<T>(fallback: string, task: (scope: StudentScope) => Promise<T>): Promise<Result<T>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { ok: false, message: 'Entra na tua conta para continuar.' }
    const [profile] = await db.select({ track: studentProfiles.track, institutionId: studentProfiles.institutionId }).from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)).limit(1)
    if (!isTrack(profile?.track)) return { ok: false, message: 'Escolhe primeiro o teu percurso.' }
    return { ok: true, data: await task({ userId: session.user.id, track: profile.track, institutionId: profile.institutionId ?? null }) }
  } catch (error) {
    const digest = error && typeof error === 'object' ? (error as { digest?: unknown }).digest : undefined
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw error
    if (error instanceof TimeUpError) return { ok: false, message: error.message, timeUp: true }
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[SIMULADOR]', fallback, error)
    return { ok: false, message: fallback }
  }
}

export async function startSession(input: { mode: string; subjectId: string | null; variant?: string | null; topicId?: string | null }) {
  return run('Não foi possível começar. Tenta de novo.', async (scope) => {
    if (!isAttemptMode(input.mode)) throw new AppError('Modo inválido.')
    const subjectId = typeof input.subjectId === 'string' && input.subjectId.length > 0 && input.subjectId.length <= 100 ? input.subjectId : null
    const variant = typeof input.variant === 'string' && input.variant.length > 0 && input.variant.length <= 60 ? input.variant : null
    const topicId = typeof input.topicId === 'string' && input.topicId.length > 0 && input.topicId.length <= 120 ? input.topicId : null
    const prefs = await getSimPrefs()
    return { id: await startAttempt(scope, input.mode, subjectId, variant, topicId, { size: sessionSize(input.mode, prefs, ROUND_SIZE), quickSeconds: prefs.quickSeconds }) }
  })
}

export async function saveAnswer(input: { attemptId: string; position: number; optionId: string }): Promise<Result<{ feedback: PlayFeedback | null }>> {
  return run('Não foi possível guardar a resposta.', async (scope) => {
    if (typeof input.attemptId !== 'string' || typeof input.optionId !== 'string' || !Number.isInteger(input.position) || input.position < 0 || input.position > 100) throw new AppError('Resposta inválida.')
    return submitAnswer(scope.userId, input.attemptId, input.position, input.optionId)
  })
}

export async function finishSession(input: { attemptId: string }) {
  return run('Não foi possível entregar. Tenta de novo.', async (scope) => {
    if (typeof input.attemptId !== 'string') throw new AppError('Sessão inválida.')
    await finishAttempt(scope.userId, input.attemptId)
    return { done: true }
  })
}

export async function savePrefs(input: SimPrefs): Promise<Result<SimPrefs>> {
  return run('Não foi possível guardar.', async () => {
    const prefs = parsePrefs(input)
    ;(await cookies()).set(PREFS_COOKIE, JSON.stringify(prefs), { path: '/aluno', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true, secure: process.env.NODE_ENV === 'production' })
    return prefs
  })
}
