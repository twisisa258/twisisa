// Regras puras do Kit (sem base de dados nem rede): validação do que a IA devolve e padrões de pesquisa. Testadas em tests/kit-lembretes.test.ts.

export type Generated = { statement: string; options: string[]; correctIndex: number; explanation: string }

export function parseGenerated(raw: unknown): Generated | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const statement = typeof o.statement === 'string' ? o.statement.trim() : ''
  const explanation = typeof o.explanation === 'string' ? o.explanation.trim() : ''
  const options = Array.isArray(o.options) ? o.options.map((x) => (typeof x === 'string' ? x.trim() : '')) : []
  const correctIndex = typeof o.correctIndex === 'number' ? o.correctIndex : -1
  if (statement.length < 10 || statement.length > 900) return null
  if (options.length !== 4 || options.some((x) => x.length === 0 || x.length > 240)) return null
  if (new Set(options.map((x) => x.toLowerCase())).size !== 4) return null
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null
  return { statement, options, correctIndex, explanation: explanation.slice(0, 600) }
}

const STOP = new Set(['para', 'com', 'dos', 'das', 'uma', 'sobre', 'entre', 'como', 'que', 'nos', 'nas'])

/** Palavras do tema (3+ letras, sem as vulgares) como padrões para ILIKE; escapa % e _. */
export function topicPatterns(topic: string | null): string[] {
  if (!topic) return []
  const words = topic.toLowerCase().split(/[^a-zà-ÿ0-9]+/i).filter((w) => w.length >= 4 && !STOP.has(w))
  return [...new Set(words)].slice(0, 5).map((w) => `%${w.replace(/[\\%_]/g, '\\$&')}%`)
}

/** O modelo às vezes embrulha o JSON em ```; isto tira o embrulho e devolve o primeiro objeto. */
export function extractJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}
