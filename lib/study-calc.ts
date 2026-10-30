// Cálculo de dias de estudo (puro). Um «dia de estudo» é um dia civil em Maputo com pelo menos uma actividade.
import { toIsoDate, type CalendarDay } from '@/lib/identity'

const MS_DAY = 24 * 60 * 60 * 1000
const asUtc = (value: CalendarDay) => Date.UTC(value.year, value.month - 1, value.day)
const fromUtc = (ms: number): CalendarDay => {
  const date = new Date(ms)
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

export const addDays = (value: CalendarDay, delta: number): CalendarDay => fromUtc(asUtc(value) + delta * MS_DAY)

/** Segunda-feira da semana de `value` (semana de segunda a domingo). */
export function weekStart(value: CalendarDay): CalendarDay {
  const weekday = new Date(asUtc(value)).getUTCDay() // 0 = domingo
  return addDays(value, -((weekday + 6) % 7))
}

/**
 * Sequência de dias seguidos. Conta de hoje para trás; se hoje ainda não houve estudo mas ontem sim, a sequência
 * continua viva (o estudante ainda tem o dia de hoje para a manter).
 */
export function computeStreak(studyDays: string[], today: CalendarDay): number {
  const set = new Set(studyDays)
  let cursor = set.has(toIsoDate(today)) ? today : addDays(today, -1)
  let streak = 0
  while (set.has(toIsoDate(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}
