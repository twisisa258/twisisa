'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { runImportBatch, undoLastBatch } from '@/lib/importar-exame'
import { notifyAdmin } from '@/lib/admin-notify'
import { motivosDaRevisao } from '@/lib/revisao'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

function refresh(materialId: string) {
  revalidatePath('/admin/importar')
  revalidatePath(`/admin/importar/${materialId}`)
  revalidatePath('/admin/questoes')
  revalidatePath('/admin/revisao')
  revalidatePath('/admin')
}

const idOf = (formData: FormData) => String(formData.get('materialId') ?? '').trim().slice(0, 100)

// Lê as próximas 10 questões do documento. Entram como rascunho, com a resposta por confirmar.
export async function importBatch(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const materialId = idOf(formData)
    if (!materialId) throw new AppError('Documento inválido.')
    const result = await runImportBatch(materialId, admin.id)
    await logAdminAction(admin, 'question.ai_import', 'material', materialId, { saved: result.saved, low: result.low, skipped: result.skipped.length })
    refresh(materialId)

    if (result.saved === 0 && result.done) return 'Não há mais questões neste documento. Leitura concluída.'
    if (result.saved === 0) throw new AppError(`Nenhuma questão deste lote ficou guardada.${result.skipped.length ? ` Ignoradas: ${describeSkipped(result.skipped)}.` : ''} Tenta outra vez.`)
    const parts = [`${result.saved} ${result.saved === 1 ? 'questão guardada' : 'questões guardadas'} como rascunho${result.low ? ` (${result.low} com resposta incerta)` : ''}.`]
    if (result.review > 0) {
      const motivos = motivosDaRevisao(result.porRazao)
      parts.push(`${result.review} ${result.review === 1 ? 'foi direta para a Revisão' : 'foram diretas para a Revisão'}${motivos ? ` (${motivos})` : ''}.`)
      await notifyAdmin(admin.id, {
        kind: 'question.ai_import',
        level: 'aviso',
        title: `${result.review} ${result.review === 1 ? 'questão precisa' : 'questões precisam'} de revisão`,
        body: `Importação do Jonas${motivos ? `: ${motivos}` : ''}. As restantes ficaram como rascunho normal.`,
        link: '/admin/revisao',
        data: { review: result.review, porRazao: result.porRazao },
      })
    }
    if (result.skipped.length) parts.push(`Ignoradas: ${describeSkipped(result.skipped)}.`)
    if (result.notes.length) parts.push(...result.notes)
    parts.push(result.done ? 'Leitura concluída.' : `Próxima: questão ${result.nextNumber}.`)
    return parts.join(' ')
  }, 'Não foi possível ler este lote. Tenta outra vez.')
}

export async function undoBatch(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const materialId = idOf(formData)
    if (!materialId) throw new AppError('Documento inválido.')
    const removed = await undoLastBatch(materialId)
    await logAdminAction(admin, 'question.ai_import_undo', 'material', materialId, { removed })
    refresh(materialId)
    return `${removed} ${removed === 1 ? 'rascunho apagado' : 'rascunhos apagados'}. Podes ler este lote outra vez.`
  }, 'Não foi possível desfazer o lote.')
}

function describeSkipped(items: { numero: number | null; motivo: string }[]) {
  const shown = items.slice(0, 5).map((item) => `${item.numero ?? '?'} (${item.motivo})`).join(', ')
  return items.length > 5 ? `${shown} e mais ${items.length - 5}` : shown
}
