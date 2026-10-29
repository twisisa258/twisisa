'use server'

import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { AppError } from '@/lib/action-result'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { getVisibleModules } from '@/lib/exam-modules'
import { ORIENTACAO_MODULE_KEY, finishOrientacao, saveOrientacaoAnswer, startOrientacaoAttempt } from '@/lib/orientacao'
import { isTrack } from '@/lib/percurso'
import type { StudentScope } from '@/lib/simulator'

// As ações devolvem o resultado em vez de lançar (em produção o Next.js esconde as mensagens de erro lançadas).
type Result<T> = { ok: true; data: T } | { ok: false; message: string }

async function run<T>(fallback: string, task: (scope: StudentScope) => Promise<T>): Promise<Result<T>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { ok: false, message: 'Entra na tua conta para continuar.' }
    const [profile] = await db.select({ track: studentProfiles.track, institutionId: studentProfiles.institutionId }).from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)).limit(1)
    if (!isTrack(profile?.track)) return { ok: false, message: 'Escolhe primeiro o teu percurso.' }
    const modules = await getVisibleModules(profile.track)
    if (!modules.some((item) => item.key === ORIENTACAO_MODULE_KEY && item.status === 'active')) return { ok: false, message: 'Este teste ainda não está disponível.' }
    return { ok: true, data: await task({ userId: session.user.id, track: profile.track, institutionId: profile.institutionId ?? null }) }
  } catch (error) {
    const digest = error && typeof error === 'object' ? (error as { digest?: unknown }).digest : undefined
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw error
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[ORIENTAÇÃO]', fallback, error)
    return { ok: false, message: fallback }
  }
}

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 100

export async function iniciarOrientacao() {
  return run('Não foi possível começar. Tenta de novo.', async (scope) => ({ id: await startOrientacaoAttempt(scope.userId) }))
}

export async function guardarResposta(input: { attemptId: string; questionId: string; value: number }) {
  return run('Não foi possível guardar a resposta. Tenta de novo.', async (scope) => {
    if (!isId(input?.attemptId) || !isId(input?.questionId)) throw new AppError('Resposta inválida.')
    await saveOrientacaoAnswer(scope.userId, input.attemptId, input.questionId, input.value)
    return { saved: true }
  })
}

export async function terminarOrientacao(input: { attemptId: string }) {
  return run('Não foi possível ver o resultado. Tenta de novo.', async (scope) => {
    if (!isId(input?.attemptId)) throw new AppError('Teste inválido.')
    await finishOrientacao(scope, input.attemptId)
    return { done: true }
  })
}
