'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { deleteKeyTopic, generateKeyTopics, saveKeyTopic, setKeyTopicsStatus } from '@/lib/exames'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

const text = (formData: FormData, key: string, max: number) => String(formData.get(key) ?? '').slice(0, max)
const ids = (formData: FormData) => {
  const institutionId = text(formData, 'institutionId', 100).trim()
  const subjectId = text(formData, 'subjectId', 100).trim()
  if (!institutionId || !subjectId) throw new AppError('Escolhe a instituição e a disciplina.')
  return { institutionId, subjectId }
}

function refresh() {
  revalidatePath('/admin/temas-principais')
  revalidatePath('/exames', 'layout')
  revalidatePath('/sitemap.xml')
}

export async function saveTopic(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const { institutionId, subjectId } = ids(formData)
    const position = Number(formData.get('position'))
    await saveKeyTopic({ institutionId, subjectId, position, title: text(formData, 'title', 200), summary: text(formData, 'summary', 3000), tips: text(formData, 'tips', 800), adminId: admin.id })
    await logAdminAction(admin, 'key_topic.save', 'key_topic', `${institutionId}:${subjectId}:${position}`, {})
    refresh()
    return 'Tema guardado.'
  }, 'Não foi possível guardar o tema.')
}

export async function removeTopic(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const { institutionId, subjectId } = ids(formData)
    const position = Number(formData.get('position'))
    await deleteKeyTopic(institutionId, subjectId, position)
    await logAdminAction(admin, 'key_topic.delete', 'key_topic', `${institutionId}:${subjectId}:${position}`, {})
    refresh()
    return 'Tema removido.'
  }, 'Não foi possível remover o tema.')
}

export async function generateTopics(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const { institutionId, subjectId } = ids(formData)
    const count = await generateKeyTopics(institutionId, subjectId, admin.id)
    await logAdminAction(admin, 'key_topic.generate', 'key_topic', `${institutionId}:${subjectId}`, { count })
    refresh()
    return `${count} temas propostos pelo Jonas, como rascunho. Revê-os e publica.`
  }, 'Não foi possível gerar os temas.')
}

export async function setTopicsStatus(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const { institutionId, subjectId } = ids(formData)
    const status = formData.get('status') === 'publicado' ? 'publicado' : 'rascunho'
    await setKeyTopicsStatus(institutionId, subjectId, status, admin.id)
    await logAdminAction(admin, `key_topic.${status}`, 'key_topic', `${institutionId}:${subjectId}`, {})
    refresh()
    return status === 'publicado' ? 'Publicado. A página pública já mostra estes temas.' : 'Passou a rascunho: deixou de aparecer ao público.'
  }, 'Não foi possível alterar o estado.')
}
