// Anos disponíveis ao criar exames, materiais, etc. Lista fixa (não se gere no admin):
// de 2020 até 2026, ou até ao ano corrente se for posterior. Do mais recente para o mais antigo.
export const FIRST_EXAM_YEAR = 2020
const MIN_LAST_YEAR = 2026

export function examYears(now: Date = new Date()): number[] {
  const last = Math.max(MIN_LAST_YEAR, now.getFullYear())
  return Array.from({ length: last - FIRST_EXAM_YEAR + 1 }, (_, index) => last - index)
}

export function examYearOptions(emptyLabel = 'Não especificado') {
  return [{ value: '', label: emptyLabel }, ...examYears().map((year) => ({ value: String(year), label: String(year) }))]
}
