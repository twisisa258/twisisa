'use server'

import { AppError } from '@/lib/action-result'
import { advanceInvite, createInviteAccount, pollInvite, resendVerification, unlockInvite } from '@/lib/staff-invites'

// Sem sessão de utilizador: quem prova ser a pessoa certa é o link + o código. Devolvem o resultado em vez de lançar.
type Result<T> = { ok: true; data: T } | { ok: false; message: string }

async function run<T>(fallback: string, task: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await task() }
  } catch (error) {
    const digest = error && typeof error === 'object' ? (error as { digest?: unknown }).digest : undefined
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw error
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[CONVITE]', fallback, error)
    return { ok: false, message: fallback }
  }
}

const str = (value: unknown, max: number) => (typeof value === 'string' && value.length <= max ? value : '')

export async function openInvite(input: { token: string; code: string }) {
  return run('Não foi possível abrir a carta. Tenta de novo.', () => unlockInvite(str(input.token, 60), str(input.code, 20)))
}
export async function nextStep(input: { token: string; to: string }) {
  return run('Não foi possível continuar. Tenta de novo.', async () => {
    if (input.to !== 'tarefa' && input.to !== 'conta') throw new AppError('Passo inválido.')
    await advanceInvite(str(input.token, 60), input.to)
    return { to: input.to }
  })
}
export async function makeAccount(input: { token: string; password: string }) {
  return run('Não foi possível criar a conta. Tenta de novo.', () => createInviteAccount(str(input.token, 60), str(input.password, 200)))
}
export async function checkInvite(input: { token: string }) {
  return run('Sem ligação.', () => pollInvite(str(input.token, 60)))
}
export async function resendEmail(input: { token: string }) {
  return run('Não foi possível reenviar agora.', async () => {
    await resendVerification(str(input.token, 60))
    return { sent: true }
  })
}
