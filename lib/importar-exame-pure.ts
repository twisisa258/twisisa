// Importação de exames com o Jonas, parte pura (sem base de dados nem rede): ler a resposta da IA, validar e decidir a confiança.

export type Confidence = 'alta' | 'media' | 'baixa'
export type Extracted = {
  numero: number
  enunciado: string
  opcoes: string[]
  correta: number | null
  origem: 'gabarito' | 'resolvida'
  confianca: Confidence
  dificuldade: 'facil' | 'media' | 'dificil'
  tema: string
  explicacao: string
}
export type Skipped = { numero: number | null; motivo: string }
export type ParsedBatch = { meta: { disciplina: string; variante: string; ano: number | null; instituicao: string }; questoes: Extracted[]; ignoradas: Skipped[]; ultima: boolean }

const LETTERS = 'ABCDE'
const plain = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

/** Tira «A)», «b.», «(C)» do início de uma opção. */
export function stripOptionPrefix(text: string) {
  return text.replace(/^\s*\(?[A-Ea-e][).:\-–]\s+/, '').trim()
}

const letterIndex = (value: unknown) => {
  if (typeof value !== 'string') return null
  const index = LETTERS.indexOf(value.trim().toUpperCase().slice(0, 1))
  return index >= 0 && value.trim().length <= 3 ? index : null
}

/**
 * Formato pedido ao Jonas (texto com marcas, não JSON: as barras do LaTeX, como \\frac ou \\theta, estragam-se num JSON):
 *   @@META  (disciplina:, variante:, ano:, instituicao:)
 *   @@Q 12  (dificuldade:, tema:, resposta:, origem:, confianca:, figura:)  @@ENUNCIADO ...  @@OPCOES A) ...  @@EXPLICACAO ...  @@FIM
 *   @@ULTIMA sim|nao
 */
export function parseExtraction(raw: string): ParsedBatch | null {
  const lines = raw.replace(/\r\n?/g, '\n').replace(/^```[a-z]*\s*$/gim, '').split('\n')
  const metaFields: Record<string, string> = {}
  type Draft = { numero: number; head: Record<string, string>; enunciado: string[]; opcoes: string[]; explicacao: string[] }
  const drafts: Draft[] = []
  let current: Draft | null = null
  let section: 'meta' | 'head' | 'enunciado' | 'opcoes' | 'explicacao' | null = null
  let ultima = false
  let sawMarker = false

  for (const line of lines) {
    const marker = /^\s*@@(\w+)\s*(.*)$/.exec(line)
    if (marker) {
      sawMarker = true
      const name = marker[1].toUpperCase()
      const rest = marker[2].trim()
      if (name === 'META') { section = 'meta'; current = null }
      else if (name === 'Q') {
        current = { numero: Number.parseInt(rest, 10), head: {}, enunciado: [], opcoes: [], explicacao: [] }
        drafts.push(current)
        section = 'head'
      } else if (name === 'ENUNCIADO' && current) section = 'enunciado'
      else if (name === 'OPCOES' && current) section = 'opcoes'
      else if (name === 'EXPLICACAO' && current) section = 'explicacao'
      else if (name === 'FIM') { section = null; current = null }
      else if (name === 'ULTIMA') ultima = /^s/i.test(rest)
      continue
    }
    if (section === 'meta' || section === 'head') {
      const field = /^\s*([a-zA-Zçã_]+)\s*:\s*(.*)$/.exec(line)
      if (field) (section === 'meta' ? metaFields : current!.head)[field[1].toLowerCase()] = field[2].trim()
    } else if (current && section === 'enunciado') current.enunciado.push(line)
    else if (current && section === 'explicacao') current.explicacao.push(line)
    else if (current && section === 'opcoes') {
      if (!line.trim()) continue
      if (/^\s*\(?[A-Ea-e][).:\-–]\s+/.test(line) || current.opcoes.length === 0) current.opcoes.push(line.trim())
      else current.opcoes[current.opcoes.length - 1] += ` ${line.trim()}`
    }
  }
  if (!sawMarker) return null

  const year = Number(metaFields.ano)
  const meta = { disciplina: str(metaFields.disciplina, 80), variante: str(metaFields.variante, 20), ano: Number.isInteger(year) && year >= 1990 && year <= 2100 ? year : null, instituicao: str(metaFields.instituicao, 80) }

  const questoes: Extracted[] = []
  const ignoradas: Skipped[] = []
  const seen = new Set<number>()
  for (const draft of drafts) {
    const id = Number.isInteger(draft.numero) && draft.numero > 0 ? draft.numero : null
    if (id === null) { ignoradas.push({ numero: null, motivo: 'sem número' }); continue }
    if (seen.has(id)) continue
    seen.add(id)
    if (/^(s|sim|true|yes)/i.test(draft.head.figura ?? '')) { ignoradas.push({ numero: id, motivo: 'depende de uma figura ou gráfico' }); continue }
    const enunciado = draft.enunciado.join('\n').trim().slice(0, 4000)
    if (enunciado.length < 3) { ignoradas.push({ numero: id, motivo: 'enunciado vazio' }); continue }
    const opcoes = draft.opcoes.map((option) => stripOptionPrefix(option.slice(0, 800))).filter(Boolean)
    if (opcoes.length < 2 || opcoes.length > 5) { ignoradas.push({ numero: id, motivo: `${opcoes.length} opções` }); continue }
    if (new Set(opcoes.map((option) => option.toLowerCase())).size !== opcoes.length) { ignoradas.push({ numero: id, motivo: 'opções repetidas' }); continue }
    const correta = letterIndex(draft.head.resposta)
    const dificuldade = (['facil', 'media', 'dificil'] as const).find((item) => item === plain(draft.head.dificuldade ?? '')) ?? 'media'
    const confianca = plain(draft.head.confianca ?? '')
    questoes.push({
      numero: id,
      enunciado,
      opcoes,
      correta: correta !== null && correta < opcoes.length ? correta : null,
      origem: /^gabarito/i.test(draft.head.origem ?? '') ? 'gabarito' : 'resolvida',
      confianca: confianca === 'alta' || confianca === 'baixa' ? confianca : 'media',
      dificuldade,
      tema: str(draft.head.tema, 120),
      explicacao: draft.explicacao.join('\n').trim().slice(0, 900),
    })
  }
  questoes.sort((a, b) => a.numero - b.numero)
  return { meta, questoes, ignoradas, ultima }
}

/** Respostas da verificação independente, uma por linha: «12: B». Devolve número → índice da opção. */
export function parseSolutions(raw: string): Map<number, number> {
  const out = new Map<number, number>()
  for (const line of raw.split('\n')) {
    const found = /^\s*(?:@@\w+\s*)?(\d{1,3})\s*[:.\-)]\s*\(?([A-Ea-e])\b/.exec(line)
    if (found) out.set(Number(found[1]), 'ABCDE'.indexOf(found[2].toUpperCase()))
  }
  return out
}

/**
 * A opção certa e a confiança. O gabarito do documento manda; sem ele, só há confiança «alta» quando duas resoluções
 * independentes coincidem e a primeira também se declarou segura. Divergência: fica a primeira, marcada «baixa».
 */
export function decideAnswer(first: Extracted, second: number | null): { correct: number | null; confidence: Confidence; note: string | null } {
  if (first.origem === 'gabarito' && first.correta !== null) {
    const note = second !== null && second !== first.correta ? 'A resolução independente deu outra opção; fica a do gabarito do documento.' : null
    return { correct: first.correta, confidence: note ? 'media' : 'alta', note }
  }
  if (first.correta === null) {
    return second === null ? { correct: null, confidence: 'baixa', note: 'Sem resposta.' } : { correct: second, confidence: 'baixa', note: 'Só a verificação deu resposta.' }
  }
  if (second === null) return { correct: first.correta, confidence: 'baixa', note: 'Não foi possível verificar a resposta.' }
  if (second === first.correta) return { correct: first.correta, confidence: first.confianca === 'alta' ? 'alta' : 'media', note: null }
  return { correct: first.correta, confidence: 'baixa', note: 'As duas resoluções divergem: confirma a resposta com cuidado.' }
}

/** Parte do texto à volta da questão `from`, para não mandar o exame inteiro em cada lote. */
export function windowFor(text: string, from: number, maxChars = 26000) {
  if (text.length <= maxChars || from <= 1) return text.slice(0, maxChars)
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:quest[ãa]o\\s*)?${from}\\s*[.)\\-–]`, 'i')
  const found = pattern.exec(text)
  const start = found ? Math.max(0, found.index - 300) : 0
  return text.slice(start, start + maxChars)
}

/** Encontra, numa lista de nomes, o que corresponde ao nome pedido (igual ou contido). */
export function matchByName<T extends { name: string }>(items: T[], wanted: string): T | null {
  const target = plain(wanted)
  if (!target) return null
  return items.find((item) => plain(item.name) === target) ?? items.find((item) => plain(item.name).includes(target) || target.includes(plain(item.name))) ?? null
}

/** Variante («I», «II»…): igual, ou o nome acaba na palavra pedida (ex.: «Matemática I»). Nunca por «conter», para «I» não apanhar «II». */
export function matchVariant<T extends { name: string }>(items: T[], wanted: string): T | null {
  const target = plain(wanted)
  if (!target) return null
  return items.find((item) => plain(item.name) === target) ?? items.find((item) => plain(item.name).endsWith(` ${target}`)) ?? null
}
