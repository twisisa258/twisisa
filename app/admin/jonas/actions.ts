'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { MAX_ADMIN_MODELS, isReasoningEffort, isValidModelName, normalizeModelList, testGroqModel, type ModelTest } from '@/lib/groq'
import { getJonasRuntime, isMissingSettingsTable, saveJonasSettings } from '@/lib/jonas-settings'

async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

// Estado (ligado/em pausa), modelos por ordem e esforço de raciocínio. A chave da Groq não se guarda aqui (fica em GROQ_API_KEY).
export async function saveJonas(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const enabled = text(formData, 'enabled')
    if (enabled !== 'on' && enabled !== 'off') throw new AppError('Estado inválido.')
    const effort = text(formData, 'effort')
    if (!isReasoningEffort(effort)) throw new AppError('Esforço de raciocínio inválido.')

    const raw = Array.from({ length: MAX_ADMIN_MODELS }, (_, index) => text(formData, `model_${index + 1}`))
    for (const name of raw) {
      if (name && !isValidModelName(name)) throw new AppError(`O nome do modelo «${name.slice(0, 40)}» não é válido.`)
    }
    if (!raw[0] && raw.some(Boolean)) throw new AppError('Escolhe o modelo principal, ou deixa todos vazios para o modo automático.')
    const models = normalizeModelList(raw)

    try {
      await saveJonasSettings(admin, { enabled: enabled === 'on', models, reasoningEffort: effort })
    } catch (error) {
      if (isMissingSettingsTable(error)) throw new AppError('Falta aplicar a migração 0020 (npm run migrate).')
      throw error
    }
    await logAdminAction(admin, 'jonas.update', 'jonas', 'default', { enabled: enabled === 'on', models, effort })
    revalidatePath('/admin/jonas')
    revalidatePath('/admin/jonas/modelo')
    return 'Definições do Jonas guardadas.'
  }, 'Não foi possível guardar as definições. Tenta outra vez.')
}

export type TestResult = { ok: boolean; message?: string; results: ModelTest[] }

// Testa a chave e cada modelo em uso (no máximo 4 pedidos pequenos, um de cada vez).
export async function testJonasConnection(): Promise<TestResult> {
  try {
    await requireAdmin()
    const runtime = await getJonasRuntime()
    const results: ModelTest[] = []
    for (const model of runtime.models.slice(0, MAX_ADMIN_MODELS + 1)) results.push(await testGroqModel(model))
    return { ok: results.length > 0 && results.some((item) => item.ok), results }
  } catch (error) {
    if (error instanceof AppError) return { ok: false, message: error.message, results: [] }
    console.error('[ADMIN JONAS] teste', error)
    return { ok: false, message: 'Não foi possível testar a ligação. Tenta outra vez.', results: [] }
  }
}
