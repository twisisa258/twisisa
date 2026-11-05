import { RotateCcw, Swords, Target, Zap, Layers, FileCheck2, type LucideIcon } from 'lucide-react'
import type { AttemptMode } from '@/lib/simulator-shared'
import type { ModuleKey } from '@/lib/exam-modules'

// Cada modo do Simulador tem sempre o mesmo ícone e a mesma cor, no Simulador e no painel do aluno.
// Prática = verde (a marca), Modo rápido = âmbar (tempo), Revisar erros = índigo (rever).
export type Tom = 'marca' | 'aviso' | 'assistente' | 'conquista' | 'ajuda' | 'neutro'
export const MODO_UI: Record<AttemptMode, { icon: LucideIcon; tom: Tom }> = {
  pratica: { icon: Target, tom: 'marca' },
  rapido: { icon: Zap, tom: 'aviso' },
  revisao: { icon: RotateCcw, tom: 'assistente' },
}

// Módulos que o Simulador vai ter e que ainda não abriram: aparecem como «Em breve», sem ligação.
export const EM_BREVE_UI: Partial<Record<ModuleKey, { icon: LucideIcon }>> = {
  simulados: { icon: FileCheck2 },
  'estudo-tematico': { icon: Layers },
  'modo-duelo': { icon: Swords },
}
