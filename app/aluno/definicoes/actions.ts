'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { getStaffRole } from '@/lib/staff'
import { apagarUtilizador } from '@/lib/eliminar-conta'
import { fraseConfere } from '@/lib/plano'
import { definirSugestoesPlus } from '@/lib/plano-sugestoes'

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new AppError('A tua sessão expirou. Inicia sessão outra vez.')
  return session.user
}

/** Mostrar ou não as sugestões do Plus (cartão ao entrar e faixa). */
export async function setSugestoesPlus(ligado: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser()
    await definirSugestoesPlus(user.id, ligado === true)
    revalidatePath('/aluno')
    revalidatePath('/aluno/definicoes')
  }, 'Não foi possível guardar. Tenta outra vez.')
}

/**
 * Elimina a conta e todos os dados da pessoa. Só avança se a frase escrita for exatamente a pedida (confere-se aqui, no servidor,
 * não só no botão). As contas da equipa (administração e revisão) não se eliminam por aqui.
 */
export async function eliminarConta(frase: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser()
    if (!fraseConfere(String(frase ?? ''))) throw new AppError('Escreve a frase exatamente como está indicada.')
    const papel = await getStaffRole(user).catch(() => null)
    if (papel) throw new AppError('As contas da equipa não se eliminam aqui. Fala com a administração.')
    await apagarUtilizador(user.id, user.email)
    return 'Conta eliminada.'
  }, 'Não foi possível eliminar a conta. Nada foi apagado. Tenta outra vez.')
}
