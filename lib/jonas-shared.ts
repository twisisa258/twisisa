// Utilitários do Jonas partilhados entre servidor e navegador. Sem base de dados nem React.

export type ConversationLike = { id: string; title: string; updatedAt: string }

export const GROUP_LABELS = ['Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias', 'Mais antigas'] as const

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

/** Agrupa as conversas (já ordenadas da mais recente) por «Hoje», «Ontem», etc., na hora local do aparelho. Grupos vazios não aparecem. */
export function groupConversations<T extends ConversationLike>(items: T[], now: Date = new Date()): { label: string; items: T[] }[] {
  const today = startOfDay(now)
  const day = 24 * 60 * 60 * 1000
  const buckets: T[][] = GROUP_LABELS.map(() => [])
  for (const item of items) {
    const age = today - startOfDay(new Date(item.updatedAt))
    const index = age < day ? 0 : age < 2 * day ? 1 : age < 7 * day ? 2 : age < 30 * day ? 3 : 4
    buckets[index].push(item)
  }
  return GROUP_LABELS.flatMap((label, index) => (buckets[index].length ? [{ label, items: buckets[index] }] : []))
}

/** Minúsculas e sem acentos, para a pesquisa («equacao» encontra «Equação»). */
export const normalizeText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function filterConversations<T extends ConversationLike>(items: T[], term: string): T[] {
  const needle = normalizeText(term.trim())
  return needle ? items.filter((item) => normalizeText(item.title).includes(needle)) : items
}
