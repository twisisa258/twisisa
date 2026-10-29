import { pool } from '@/lib/db'
import { TRACKS, type Track } from '@/lib/percurso'

export type ModuleStatus = 'active' | 'soon' | 'hidden'

export const MODULE_STATUSES: { value: ModuleStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'soon', label: 'Em breve' },
  { value: 'hidden', label: 'Oculto' },
]

// Catálogo fixo dos módulos da página Exames. `ready` passa a true quando a funcionalidade existe e foi testada
// (fase indicada): até lá o servidor recusa o estado "Ativo", para nada aparecer simulado.
export const EXAM_MODULES = [
  { key: 'pratica', label: 'Prática', description: 'Questões com correção imediata, por disciplina e tema.', phase: 4, ready: true },
  { key: 'modo-rapido', label: 'Modo rápido', description: 'Sessões curtas e cronometradas.', phase: 4, ready: true },
  { key: 'simulados', label: 'Simulados', description: 'Prova completa, com tempo e nota final.', phase: 5, ready: false },
  { key: 'revisar-erros', label: 'Revisar erros', description: 'Refazer as questões erradas.', phase: 5, ready: true },
  { key: 'estudo-tematico', label: 'Estudo temático', description: 'Estudar pelos temas mais fracos.', phase: 7, ready: false },
  { key: 'modo-duelo', label: 'Modo duelo', description: 'Desafio entre dois estudantes em tempo real.', phase: 9, ready: false },
  { key: 'teste-vocacional', label: 'Descobre o teu curso', description: 'Responde a perguntas curtas e vê cursos que combinam contigo.', phase: 9, ready: true },
  { key: 'historico', label: 'Histórico', description: 'Resultados e progresso do aluno.', phase: 4, ready: true },
] as const

export type ModuleKey = (typeof EXAM_MODULES)[number]['key']

export function isModuleKey(value: unknown): value is ModuleKey {
  return EXAM_MODULES.some((item) => item.key === value)
}

export function isModuleStatus(value: unknown): value is ModuleStatus {
  return MODULE_STATUSES.some((item) => item.value === value)
}

export type ModuleSetting = { status: ModuleStatus; noveltyUntil: Date | null }
export type ModuleSettings = Record<ModuleKey, Record<Track, ModuleSetting>>

export async function getModuleSettings(): Promise<ModuleSettings> {
  const result = await pool.query('SELECT module_key, track, status, novelty_until FROM exam_modules')
  const settings = {} as ModuleSettings
  for (const item of EXAM_MODULES) {
    settings[item.key] = {} as Record<Track, ModuleSetting>
    for (const track of TRACKS) settings[item.key][track.value] = { status: 'hidden', noveltyUntil: null }
  }
  for (const row of result.rows) {
    const key: unknown = row.module_key
    const track = row.track as Track
    if (isModuleKey(key) && settings[key][track]) {
      settings[key][track] = { status: row.status as ModuleStatus, noveltyUntil: row.novelty_until as Date | null }
    }
  }
  return settings
}

// Para a página Exames (Fase 2): módulos visíveis ao percurso, com a etiqueta "Novidade" só enquanto válida.
export async function getVisibleModules(track: Track) {
  const settings = await getModuleSettings()
  const now = Date.now()
  return EXAM_MODULES.flatMap((item) => {
    const setting = settings[item.key][track]
    if (setting.status === 'hidden') return []
    const status = setting.status === 'active' && !item.ready ? 'soon' : setting.status
    return [{ ...item, status, isNew: !!setting.noveltyUntil && setting.noveltyUntil.getTime() > now }]
  })
}
