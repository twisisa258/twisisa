import type { Aviso } from '@/lib/avisos'

// Parte pura dos lembretes (sem base de dados nem e-mail): pode ser importada por componentes de cliente.

export const DEFAULT_STUDY_HOUR = 18
export const MIN_STUDY_HOUR = 5
export const MAX_STUDY_HOUR = 23
export const STUDY_HOURS = [
  { value: 7, label: 'De manhã', detail: '7h' },
  { value: 14, label: 'À tarde', detail: '14h' },
  { value: 18, label: 'Ao fim da tarde', detail: '18h' },
  { value: 20, label: 'À noite', detail: '20h' },
] as const
export const isStudyHour = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= MIN_STUDY_HOUR && (value as number) <= MAX_STUDY_HOUR

export type Reminder = { title: string; text: string; href: string; cta: string; key: string }

/**
 * Escolhe a mensagem do dia ou nenhuma. Se a meta de hoje já está cumprida e não há nada para rever, o aluno não recebe nada:
 * um lembrete sem motivo ensina a ignorar os lembretes.
 */
export function chooseReminder(input: { avisos: Aviso[]; todayMet: boolean; marksDue: number }): Reminder | null {
  const { avisos, todayMet, marksDue } = input
  const urgent = avisos.find((a) => a.id === 'streak-risk')
  if (urgent) return { title: urgent.title, text: marksDue > 0 ? `${urgent.text} Tens também ${marksDue === 1 ? '1 questão guardada' : `${marksDue} questões guardadas`} para rever.` : urgent.text, href: urgent.href, cta: urgent.cta, key: 'streak' }
  if (marksDue > 0) return { title: marksDue === 1 ? 'Tens 1 questão para rever hoje' : `Tens ${marksDue} questões para rever hoje`, text: 'Guardaste-as para hoje. Rever com calma é o que fixa a matéria.', href: '/aluno/estudar-depois', cta: 'Rever agora', key: 'revisao' }
  if (todayMet) return null
  const pick = avisos.find((a) => ['errors', 'weak', 'daily', 'first', 'inactive', 'streak-lost'].includes(a.id)) ?? avisos.find((a) => a.tone !== 'success')
  return pick ? { title: pick.title, text: pick.text, href: pick.href, cta: pick.cta, key: pick.id } : null
}
