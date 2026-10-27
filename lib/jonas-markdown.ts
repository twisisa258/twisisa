// Formatação das respostas do Jonas: um subconjunto de Markdown (negrito, itálico, listas, títulos, tabelas, citações, código)
// mais fórmulas KaTeX ($x^2$ na linha, $$…$$ em bloco). Código puro (sem React): serve a página, o simulador e os testes.
// Nunca produz HTML: devolve uma árvore que o componente desenha como elementos React.
// Durante o fluxo, marcas ainda por fechar (**, $, ```) ficam como texto até fecharem: nada «pisca» nem parte a página.

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; c: Inline[] }
  | { t: 'italic'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'math'; v: string; display: boolean }
  | { t: 'br' }

export type ListItem = { c: Inline[]; children: Block[] }
export type Block =
  | { t: 'p'; c: Inline[] }
  | { t: 'h'; level: 1 | 2 | 3; c: Inline[] }
  | { t: 'ul'; items: ListItem[] }
  | { t: 'ol'; start: number; items: ListItem[] }
  | { t: 'quote'; c: Block[] }
  | { t: 'code'; lang: string; v: string }
  | { t: 'math'; v: string }
  | { t: 'hr' }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }

const ESCAPABLE = '$*_`'

/** Os modelos escrevem fórmulas como \( … \) e \[ … \]: passam para $ … $ e $$ … $$ (fora de blocos de código). */
export function normalizeMath(src: string): string {
  return src
    .split(/(```[\s\S]*?(?:```|$))/g)
    .map((part, index) => {
      if (index % 2 === 1) return part // bloco de código
      return part
        .replace(/\\\[([\s\S]+?)\\\]/g, (_, body: string) => `\n$$${body.trim()}$$\n`)
        .replace(/\\\(([\s\S]+?)\\\)/g, (_, body: string) => `$${body.trim()}$`)
    })
    .join('')
}

// ───────────── Em linha ─────────────

const isSpace = (ch: string | undefined) => ch === undefined || /\s/.test(ch)
const isAlnum = (ch: string | undefined) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch)
const isDigit = (ch: string | undefined) => ch !== undefined && /\d/.test(ch)

/** Fórmula que começa em `i` (se começar), seguindo as regras do Pandoc para o cifrão simples (não confunde «$5 e $10» com uma fórmula). */
function tryMath(src: string, i: number): { end: number; v: string; display: boolean } | null {
  if (src[i] !== '$') return null
  if (src.startsWith('$$', i)) {
    const close = src.indexOf('$$', i + 2)
    if (close > i + 2) {
      const v = src.slice(i + 2, close).trim()
      if (v) return { end: close + 2, v, display: true }
    }
    return null
  }
  if (isSpace(src[i + 1])) return null
  for (let j = i + 1; j < src.length; j += 1) {
    const ch = src[j]
    if (ch === '\n') return null
    if (ch === '\\') {
      j += 1
      continue
    }
    if (ch === '$') {
      if (isSpace(src[j - 1]) || isDigit(src[j + 1])) return null
      return { end: j + 1, v: src.slice(i + 1, j), display: false }
    }
  }
  return null
}

/** Procura o fecho de `marker`, saltando fórmulas e código para não fechar dentro deles. */
function findClosing(src: string, from: number, marker: string): number {
  for (let j = from; j < src.length; j += 1) {
    const ch = src[j]
    if (ch === '\\') {
      j += 1
      continue
    }
    if (ch === '`') {
      const close = src.indexOf('`', j + 1)
      if (close === -1) return -1
      j = close
      continue
    }
    if (ch === '$') {
      const math = tryMath(src, j)
      if (math) {
        j = math.end - 1
        continue
      }
    }
    if (src.startsWith(marker, j)) {
      const before = src[j - 1]
      const after = src[j + marker.length]
      if (isSpace(before)) continue
      if (marker === '*' && (after === '*' || before === '*')) continue
      if (marker === '_' && isAlnum(after)) continue
      return j
    }
  }
  return -1
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  let text = ''
  const flush = () => {
    if (text) out.push({ t: 'text', v: text })
    text = ''
  }
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\' && i + 1 < src.length && ESCAPABLE.includes(src[i + 1])) {
      text += src[i + 1]
      i += 2
      continue
    }
    if (ch === '\n') {
      flush()
      out.push({ t: 'br' })
      i += 1
      continue
    }
    if (ch === '`') {
      const close = src.indexOf('`', i + 1)
      if (close > i + 1) {
        flush()
        out.push({ t: 'code', v: src.slice(i + 1, close) })
        i = close + 1
        continue
      }
    }
    if (ch === '$') {
      const math = tryMath(src, i)
      if (math) {
        flush()
        out.push({ t: 'math', v: math.v, display: math.display })
        i = math.end
        continue
      }
    }
    if (ch === '*' && src[i + 1] === '*' && !isSpace(src[i + 2])) {
      const close = findClosing(src, i + 2, '**')
      if (close > i + 2) {
        flush()
        out.push({ t: 'bold', c: parseInline(src.slice(i + 2, close)) })
        i = close + 2
        continue
      }
    }
    if (ch === '*' && src[i + 1] !== '*' && !isSpace(src[i + 1])) {
      const close = findClosing(src, i + 1, '*')
      if (close > i + 1) {
        flush()
        out.push({ t: 'italic', c: parseInline(src.slice(i + 1, close)) })
        i = close + 1
        continue
      }
    }
    if (ch === '_' && !isAlnum(src[i - 1]) && !isSpace(src[i + 1]) && src[i + 1] !== '_') {
      const close = findClosing(src, i + 1, '_')
      if (close > i + 1) {
        flush()
        out.push({ t: 'italic', c: parseInline(src.slice(i + 1, close)) })
        i = close + 1
        continue
      }
    }
    text += ch
    i += 1
  }
  flush()
  return out
}

// ───────────── Em bloco ─────────────

const LIST = /^(\s*)([-*+•]|\d{1,3}[.)])(?:\s+(.*))?$/
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const HR = /^\s*([-*_])(\s*\1){2,}\s*$/
const FENCE = /^\s*```([\w+-]*)\s*$/
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

const indentOf = (line: string) => line.length - line.trimStart().length
const blank = (line: string | undefined) => line === undefined || line.trim() === ''

/** Divide uma linha de tabela em células, sem partir as barras que estão dentro de fórmulas ($|x|$). */
export function splitCells(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inMath = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '\\' && i + 1 < line.length) {
      current += ch + line[i + 1]
      i += 1
      continue
    }
    if (ch === '$') inMath = !inMath
    if (ch === '|' && !inMath) {
      cells.push(current)
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current)
  const trimmed = cells.map((cell) => cell.trim())
  if (line.trim().startsWith('|')) trimmed.shift()
  if (line.trim().endsWith('|') && !line.trim().endsWith('\\|')) trimmed.pop()
  return trimmed
}

function startsBlock(line: string, next: string | undefined): boolean {
  return FENCE.test(line) || HEADING.test(line) || HR.test(line) || LIST.test(line) || /^\s*>/.test(line) || line.trim().startsWith('$$') || (line.includes('|') && next !== undefined && TABLE_SEPARATOR.test(next) && !blank(next))
}

function parseList(lines: string[], start: number): { block: Block; next: number } {
  const first = LIST.exec(lines[start]) as RegExpExecArray
  const base = first[1].length
  const ordered = /\d/.test(first[2])
  const startNumber = ordered ? Number.parseInt(first[2], 10) : 1
  const raw: { text: string; nested: string[] }[] = []
  let i = start
  while (i < lines.length) {
    const line = lines[i]
    if (blank(line)) {
      let j = i + 1
      while (j < lines.length && blank(lines[j])) j += 1
      const upcoming = lines[j]
      if (j < lines.length && (indentOf(upcoming) >= base + 2 || (LIST.test(upcoming) && indentOf(upcoming) >= base && indentOf(upcoming) < base + 2 && /\d/.test((LIST.exec(upcoming) as RegExpExecArray)[2]) === ordered))) {
        if (indentOf(upcoming) >= base + 2 && raw.length) raw[raw.length - 1].nested.push('')
        i = j
        continue
      }
      break
    }
    const m = LIST.exec(line)
    const ind = indentOf(line)
    if (m && ind < base + 2 && ind >= base) {
      if (/\d/.test(m[2]) !== ordered) break
      raw.push({ text: m[3] ?? '', nested: [] })
      i += 1
      continue
    }
    if (ind >= base + 2 && raw.length) {
      raw[raw.length - 1].nested.push(line)
      i += 1
      continue
    }
    break
  }
  const items: ListItem[] = raw.map((entry) => {
    const nested = entry.nested
    const minIndent = Math.min(...nested.filter((l) => !blank(l)).map(indentOf), Number.POSITIVE_INFINITY)
    const dedented = Number.isFinite(minIndent) ? nested.map((l) => l.slice(Math.min(minIndent, indentOf(l)))) : []
    return { c: parseInline(entry.text), children: dedented.length ? parseLines(dedented) : [] }
  })
  return { block: ordered ? { t: 'ol', start: startNumber, items } : { t: 'ul', items }, next: i }
}

function parseLines(lines: string[]): Block[] {
  const out: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (blank(line)) {
      i += 1
      continue
    }

    const fence = FENCE.exec(line)
    if (fence) {
      const body: string[] = []
      let j = i + 1
      while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) {
        body.push(lines[j])
        j += 1
      }
      out.push({ t: 'code', lang: fence[1], v: body.join('\n') })
      i = j + 1
      continue
    }

    const trimmed = line.trim()
    if (trimmed.startsWith('$$')) {
      if (trimmed.length > 4 && trimmed.endsWith('$$')) {
        out.push({ t: 'math', v: trimmed.slice(2, -2).trim() })
        i += 1
        continue
      }
      const body = [trimmed.slice(2)]
      let j = i + 1
      let closed = false
      while (j < lines.length) {
        const idx = lines[j].indexOf('$$')
        if (idx !== -1) {
          body.push(lines[j].slice(0, idx))
          closed = true
          j += 1
          break
        }
        body.push(lines[j])
        j += 1
      }
      const v = body.join('\n').trim()
      if (closed && v) {
        out.push({ t: 'math', v })
        i = j
        continue
      }
      // Ainda por fechar (resposta em curso): fica como texto.
    }

    const heading = HEADING.exec(line)
    if (heading) {
      out.push({ t: 'h', level: Math.min(heading[1].length, 3) as 1 | 2 | 3, c: parseInline(heading[2]) })
      i += 1
      continue
    }

    if (HR.test(line)) {
      out.push({ t: 'hr' })
      i += 1
      continue
    }

    if (/^\s*>/.test(line)) {
      const inner: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        inner.push(lines[i].replace(/^\s*> ?/, ''))
        i += 1
      }
      out.push({ t: 'quote', c: parseLines(inner) })
      continue
    }

    if (line.includes('|') && !blank(lines[i + 1]) && TABLE_SEPARATOR.test(lines[i + 1] ?? '')) {
      const head = splitCells(line).map(parseInline)
      const rows: Inline[][][] = []
      let j = i + 2
      while (j < lines.length && !blank(lines[j]) && lines[j].includes('|')) {
        rows.push(splitCells(lines[j]).map(parseInline))
        j += 1
      }
      out.push({ t: 'table', head, rows })
      i = j
      continue
    }

    if (LIST.test(line) && !HR.test(line)) {
      const { block, next } = parseList(lines, i)
      out.push(block)
      i = next
      continue
    }

    const para: string[] = [line]
    i += 1
    while (i < lines.length && !blank(lines[i]) && !startsBlock(lines[i], lines[i + 1])) {
      para.push(lines[i])
      i += 1
    }
    out.push({ t: 'p', c: parseInline(para.join('\n').trim()) })
  }
  return out
}

export function parseMarkdown(src: string): Block[] {
  return parseLines(normalizeMath(src).replace(/\r\n?/g, '\n').split('\n'))
}

/** Texto simples (sem marcas) para títulos e pré-visualizações: «**Passo 1** com $x^2$» → «Passo 1 com x^2». */
export function plainFromMarkdown(src: string, max = 60): string {
  const flat = normalizeMath(src)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$?([^$]+)\$\$?/g, '$1')
    .replace(/\\([$*_`])/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
