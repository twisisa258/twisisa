'use server'

import { headers } from 'next/headers'
import { AppError } from '@/lib/action-result'
import { auth } from '@/lib/auth'
import { answerSimilar, finishMark, getHints, makeSimilar, relatedMaterials, removeMark, reportQuestion, requestHint, setMark, type Hint, type RelatedItem, type RemindChoice, type SimilarQuestion, type SimilarResult } from '@/lib/kit'

// As ferramentas devolvem o resultado em vez de lançar (em produção o Next.js esconde as mensagens de erro lançadas).
type Result<T> = { ok: true; data: T } | { ok: false; message: string }

async function run<T>(fallback: string, task: (userId: string) => Promise<T>): Promise<Result<T>> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return { ok: false, message: 'Entra na tua conta para continuar.' }
    return { ok: true, data: await task(session.user.id) }
  } catch (error) {
    const digest = error && typeof error === 'object' ? (error as { digest?: unknown }).digest : undefined
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw error
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[KIT]', fallback, error)
    return { ok: false, message: fallback }
  }
}

const idOk = (value: unknown, max = 120): value is string => typeof value === 'string' && value.length > 0 && value.length <= max
const posOk = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 200

export async function loadHints(input: { attemptId: string; position: number }): Promise<Result<Hint[]>> {
  return run('Não foi possível carregar as dicas.', async (userId) => {
    if (!idOk(input.attemptId, 100) || !posOk(input.position)) throw new AppError('Pedido inválido.')
    return getHints(userId, input.attemptId, input.position)
  })
}

export async function askHint(input: { attemptId: string; position: number; level: number }): Promise<Result<Hint>> {
  return run('Não foi possível pedir a dica. Tenta de novo.', async (userId) => {
    if (!idOk(input.attemptId, 100) || !posOk(input.position)) throw new AppError('Pedido inválido.')
    return requestHint(userId, input.attemptId, input.position, input.level)
  })
}

export async function createSimilar(input: { attemptId: string; position: number }): Promise<Result<SimilarQuestion>> {
  return run('Não foi possível criar a questão. Tenta de novo.', async (userId) => {
    if (!idOk(input.attemptId, 100) || !posOk(input.position)) throw new AppError('Pedido inválido.')
    return makeSimilar(userId, input.attemptId, input.position)
  })
}

export async function submitSimilar(input: { id: string; choice: number }): Promise<Result<SimilarResult>> {
  return run('Não foi possível guardar a resposta.', async (userId) => {
    if (!idOk(input.id, 100)) throw new AppError('Pedido inválido.')
    return answerSimilar(userId, input.id, input.choice)
  })
}

export async function loadRelated(input: { questionId: string }): Promise<Result<{ topic: string | null; subject: string; items: RelatedItem[] }>> {
  return run('Não foi possível carregar a matéria relacionada.', async (userId) => {
    if (!idOk(input.questionId)) throw new AppError('Pedido inválido.')
    return relatedMaterials(userId, input.questionId)
  })
}

export async function markForLater(input: { questionId: string; remind: RemindChoice }): Promise<Result<true>> {
  return run('Não foi possível guardar. Tenta de novo.', async (userId) => {
    if (!idOk(input.questionId)) throw new AppError('Pedido inválido.')
    await setMark(userId, input.questionId, input.remind)
    return true as const
  })
}

export async function unmarkForLater(input: { questionId: string }): Promise<Result<true>> {
  return run('Não foi possível remover. Tenta de novo.', async (userId) => {
    if (!idOk(input.questionId)) throw new AppError('Pedido inválido.')
    await removeMark(userId, input.questionId)
    return true as const
  })
}

export async function completeMark(input: { id: string }): Promise<Result<true>> {
  return run('Não foi possível atualizar. Tenta de novo.', async (userId) => {
    if (!idOk(input.id)) throw new AppError('Pedido inválido.')
    await finishMark(userId, input.id)
    return true as const
  })
}

export async function sendReport(input: { questionId: string; reason: string; note: string }): Promise<Result<true>> {
  return run('Não foi possível enviar o reporte. Tenta de novo.', async (userId) => {
    if (!idOk(input.questionId) || typeof input.note !== 'string') throw new AppError('Pedido inválido.')
    await reportQuestion(userId, input.questionId, input.reason, input.note)
    return true as const
  })
}
