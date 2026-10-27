'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { createInvite, removeStaffMember, reissueInvite, revokeInvite } from '@/lib/staff-invites'

// Só o administrador gere a equipa. Os revisores nunca chegam aqui.
async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}
const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim()
const refresh = () => revalidatePath('/admin/equipa')

// O link e o código só existem no momento em que a carta é criada (no servidor guarda-se apenas a impressão digital),
// por isso estas duas ações devolvem-nos ao painel para o admin os entregar (WhatsApp, cópia ou e-mail).
export type CardResult = { ok: true; data: { name: string; email: string; link: string; code: string; emailed: boolean } } | { ok: false; message: string }

async function card(fallback: string, task: (admin: { id: string; email: string }) => Promise<{ name: string; email: string; link: string; code: string; emailed: boolean }>): Promise<CardResult> {
  try {
    const admin = await requireAdmin()
    return { ok: true, data: await task(admin) }
  } catch (error) {
    const digest = error && typeof error === 'object' ? (error as { digest?: unknown }).digest : undefined
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw error
    if (error instanceof AppError) return { ok: false, message: error.message }
    console.error('[ADMIN EQUIPA]', fallback, error)
    return { ok: false, message: fallback }
  }
}

export async function createCard(input: { name: string; email: string; sendEmail: boolean; codeInEmail: boolean }): Promise<CardResult> {
  return card('Não foi possível criar a carta. Tenta novamente.', async (admin) => {
    const result = await createInvite(admin, { name: String(input.name ?? ''), email: String(input.email ?? ''), sendEmail: input.sendEmail === true, codeInEmail: input.codeInEmail === true })
    await logAdminAction(admin, 'staff.invite', 'staff_invite', result.id, { email: result.email, emailed: result.emailed })
    refresh()
    return result
  })
}

export async function renewCard(input: { id: string; sendEmail: boolean }): Promise<CardResult> {
  return card('Não foi possível gerar a nova carta.', async (admin) => {
    const result = await reissueInvite(admin, String(input.id ?? ''), input.sendEmail === true)
    await logAdminAction(admin, 'staff.reissue', 'staff_invite', String(input.id), { email: result.email, emailed: result.emailed })
    refresh()
    return result
  })
}

export async function cancelInvite(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const email = await revokeInvite(text(formData, 'id'))
    await logAdminAction(admin, 'staff.revoke', 'staff_invite', text(formData, 'id'), { email })
    refresh()
    return 'Convite revogado. O link deixou de funcionar.'
  }, 'Não foi possível revogar o convite.')
}

export async function removeMember(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    await removeStaffMember(text(formData, 'userId'))
    await logAdminAction(admin, 'staff.remove', 'staff_role', text(formData, 'userId'))
    refresh()
    return 'Acesso removido. A pessoa mantém a conta de estudante.'
  }, 'Não foi possível remover o acesso.')
}
