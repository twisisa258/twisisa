// Constantes da equipa partilhadas entre servidor e cliente (sem acesso à base de dados).
export type StaffRole = 'admin' | 'revisor'
export type InviteRole = 'revisor'
export type InviteStep = 'carta' | 'tarefa' | 'conta' | 'aguardar'

export const ROLE_LABEL: Record<InviteRole, string> = { revisor: 'Revisor de questões' }
export const ROLE_BLURB: Record<InviteRole, string> = {
  revisor: 'Vais rever exercícios: confirmar enunciados, opções e explicações antes de chegarem aos alunos.',
}

export const MAX_CODE_ATTEMPTS = 5
export const INVITE_VALID_DAYS = 7

export const maskEmail = (email: string) => {
  const [local, domain = ''] = email.split('@')
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(6, local.length - 1)))}@${domain}`
}
