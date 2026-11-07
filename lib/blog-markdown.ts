// Markdown do blog: um subconjunto pequeno e seguro. Código puro (sem React): serve a página, a pré-visualização e os testes.
// Nunca produz HTML: devolve uma árvore que o componente desenha como elementos React, por isso HTML escrito no texto
// aparece como texto. Ligações e imagens passam por uma lista de endereços permitidos.
// Suporta: títulos (# e ## viram h2, ### e seguintes h3: o h1 é o título do artigo), parágrafos, **negrito**, *itálico*,
// `código`, listas, citações, tabelas, ligações, imagens sozinhas numa linha e fórmulas ($...$ e $$...$$).
import { slugify } from './slug'

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; c: Inline[] }
  | { t: 'italic'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'math'; v: string }
  | { t: 'link'; href: string; c: Inline[] }

export type Block =
  | { t: 'h'; level: 2 | 3; id: string; c: Inline[] }
  | { t: 'p'; c: Inline[] }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; start: number; items: Inline[][] }
  | { t: 'quote'; c: Block[] }
  | { t: 'code'; lang: string; v: string }
  | { t: 'math'; v: string }
  | { t: 'image'; src: string; alt: string }
  | { t: 'hr' }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][]; align: ('left' | 'center' | 'right' | null)[] }

const MAX_INLINE = 20_000
const MAX_QUOTE_DEPTH = 3
const ESCAPABLE = '\\`*_$[]()#!>|-+.'

/** Endereço de ligação permitido (https, http, mailto, caminho do site ou âncora). Qualquer outro (javascript:, data:…) é recusado. */
export function safeHref(raw: string): string | null {
  const url = raw.trim()
  if (!url || url.length > 2000) return null
  const probe = url.replace(/[\u0000-\u001f\u007f\s]/g, '')
  if (probe !== url) return null
  if (/^https?:\/\/[^/\s]+/i.test(url)) {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : null
    } catch {
      return null
    }
  }
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(url)) return url
  if (/^\/(?!\/)/.test(url)) return url
  if (/^#[\w-]+$/.test(url)) return url
  return null
}

/** Imagens: só https ou caminhos do próprio site. */
export function safeImageSrc(raw: string): string | null {
  const url = raw.trim()
  if (!url || url.length > 2000 || /[\u0000-\u001f\u007f\s]/.test(url)) return null
  if (/^https:\/\/[^/]+/i.test(url)) return url
  if (/^\/(?!\/)/.test(url)) return url
  return null
}

const MATH = /\$([^$\n]+?)\$/y
const CODE = /`([^`\n]+?)`/y
const BOLD = /\*\*(?!\s)([^\n]+?)(?<!\s)\*\*/y
const ITALIC_STAR = /\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?!\*)/y
const ITALIC_UNDER = /_(?![\s_])([^_\n]+?)(?<![\s_])_(?![\p{L}\p{N}_])/uy
const LINK = /\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"\n]*")?\)/y

function at(re: RegExp, src: string, index: number) {
  re.lastIndex = index
  return re.exec(src)
}

export function parseInline(src: string): Inline[] {
  if (src.length > MAX_INLINE) return [{ t: 'text', v: src }]
  const out: Inline[] = []
  let buf = ''
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf })
    buf = ''
  }
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\' && i + 1 < src.length && ESCAPABLE.includes(src[i + 1])) {
      buf += src[i + 1]
      i += 2
      continue
    }
    if (ch === '`') {
      const m = at(CODE, src, i)
      if (m) { flush(); out.push({ t: 'code', v: m[1] }); i += m[0].length; continue }
    } else if (ch === '$') {
      const m = at(MATH, src, i)
      if (m && !/^\s|\s$/.test(m[1])) { flush(); out.push({ t: 'math', v: m[1] }); i += m[0].length; continue }
    } else if (ch === '*') {
      const bold = at(BOLD, src, i)
      if (bold) { flush(); out.push({ t: 'bold', c: parseInline(bold[1]) }); i += bold[0].length; continue }
      const italic = at(ITALIC_STAR, src, i)
      if (italic) { flush(); out.push({ t: 'italic', c: parseInline(italic[1]) }); i += italic[0].length; continue }
    } else if (ch === '_' && (i === 0 || !/[\p{L}\p{N}_]/u.test(src[i - 1]))) {
      const italic = at(ITALIC_UNDER, src, i)
      if (italic) { flush(); out.push({ t: 'italic', c: parseInline(italic[1]) }); i += italic[0].length; continue }
    } else if (ch === '[') {
      const m = at(LINK, src, i)
      if (m) {
        const href = safeHref(m[2])
        flush()
        const inner = parseInline(m[1])
        // Ligação não permitida: fica só o texto.
        if (href) out.push({ t: 'link', href, c: inner })
        else out.push(...inner)
        i += m[0].length
        continue
      }
    }
    buf += ch
    i += 1
  }
  flush()
  return out
}

export function plainText(inlines: Inline[]): string {
  return inlines.map((item) => (item.t === 'text' || item.t === 'code' || item.t === 'math' ? item.v : plainText(item.c))).join('')
}

/** Divide uma linha de tabela em células sem partir `|` dentro de fórmulas ($|x|$) nem `\|`. */
export function splitCells(line: string): string[] {
  let text = line.trim()
  if (text.startsWith('|')) text = text.slice(1)
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  let inMath = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\\' && text[i + 1] === '|') { cell += '|'; i += 1; continue }
    if (ch === '\\' && text[i + 1] === '$') { cell += '\\$'; i += 1; continue }
    if (ch === '$') inMath = !inMath
    if (ch === '|' && !inMath) { cells.push(cell.trim()); cell = ''; continue }
    cell += ch
  }
  cells.push(cell.trim())
  return cells
}

const FENCE = /^\s*```(\S*)\s*$/
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/
const HR = /^\s*([-*_])(\s*\1){2,}\s*$/
const UL = /^\s*[-*+]\s+(.*)$/
const OL = /^\s*(\d{1,4})[.)]\s+(.*)$/
const IMAGE = /^\s*!\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"\n]*")?\)\s*$/
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

const startsBlock = (line: string, next: string | undefined) =>
  FENCE.test(line) || HEADING.test(line) || HR.test(line) || UL.test(line) || OL.test(line) || IMAGE.test(line) || /^\s*>/.test(line) || /^\s*\$\$/.test(line) ||
  (line.includes('|') && next !== undefined && TABLE_SEP.test(next) && next.includes('|'))

function parseBlocks(lines: string[], depth: number, used: Map<string, number>): Block[] {
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i += 1; continue }

    if (FENCE.test(line)) {
      const lang = FENCE.exec(line)![1].slice(0, 20)
      const code: string[] = []
      i += 1
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { code.push(lines[i]); i += 1 }
      i += 1
      blocks.push({ t: 'code', lang, v: code.join('\n') })
      continue
    }

    if (/^\s*\$\$/.test(line)) {
      const first = line.trim().slice(2)
      if (first.endsWith('$$') && first.length > 2) { blocks.push({ t: 'math', v: first.slice(0, -2).trim() }); i += 1; continue }
      const parts = [first]
      i += 1
      while (i < lines.length && !lines[i].trim().endsWith('$$')) { parts.push(lines[i]); i += 1 }
      if (i < lines.length) parts.push(lines[i].trim().slice(0, -2))
      i += 1
      const v = parts.join('\n').trim()
      if (v) blocks.push({ t: 'math', v })
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const c = parseInline(heading[2])
      const base = slugify(plainText(c)) || 'secao'
      const count = used.get(base) ?? 0
      used.set(base, count + 1)
      blocks.push({ t: 'h', level: heading[1].length <= 2 ? 2 : 3, id: count === 0 ? base : `${base}-${count + 1}`, c })
      i += 1
      continue
    }

    if (HR.test(line)) { blocks.push({ t: 'hr' }); i += 1; continue }

    const image = IMAGE.exec(line)
    if (image) {
      const src = safeImageSrc(image[2])
      if (src) blocks.push({ t: 'image', src, alt: image[1].trim() })
      else if (image[1].trim()) blocks.push({ t: 'p', c: [{ t: 'text', v: image[1].trim() }] })
      i += 1
      continue
    }

    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('|')) {
      const head = splitCells(line)
      const align = splitCells(lines[i + 1]).map((cell) => (cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : cell.startsWith(':') ? 'left' : null)) as ('left' | 'center' | 'right' | null)[]
      const rows: Inline[][][] = []
      i += 2
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        const cells = splitCells(lines[i])
        rows.push(head.map((_, index) => parseInline(cells[index] ?? '')))
        i += 1
      }
      blocks.push({ t: 'table', head: head.map((cell) => parseInline(cell)), rows, align })
      continue
    }

    if (/^\s*>/.test(line)) {
      const inner: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) { inner.push(lines[i].replace(/^\s*> ?/, '')); i += 1 }
      if (depth >= MAX_QUOTE_DEPTH) blocks.push({ t: 'p', c: parseInline(inner.join(' ').trim()) })
      else blocks.push({ t: 'quote', c: parseBlocks(inner, depth + 1, used) })
      continue
    }

    const ordered = OL.exec(line)
    if (UL.test(line) || ordered) {
      const isOrdered = Boolean(ordered)
      const start = ordered ? Number(ordered[1]) : 1
      const items: string[] = []
      while (i < lines.length && lines[i].trim()) {
        const ul = UL.exec(lines[i])
        const ol = OL.exec(lines[i])
        if (isOrdered ? ol : ul) { items.push(((isOrdered ? ol : ul)![isOrdered ? 2 : 1]) ?? ''); i += 1 }
        else if (ul || ol) break
        else if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1] += ` ${lines[i].trim()}`; i += 1 }
        else break
      }
      const parsed = items.map((item) => parseInline(item.trim()))
      blocks.push(isOrdered ? { t: 'ol', start, items: parsed } : { t: 'ul', items: parsed })
      continue
    }

    const para: string[] = [line.trim()]
    i += 1
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i], lines[i + 1])) { para.push(lines[i].trim()); i += 1 }
    blocks.push({ t: 'p', c: parseInline(para.join(' ')) })
  }
  return blocks
}

export function parseBlogMarkdown(src: string): Block[] {
  return parseBlocks(src.replace(/\r\n?/g, '\n').split('\n'), 0, new Map())
}

export type TocItem = { id: string; text: string; level: 2 | 3 }
/** Títulos para o índice. */
export function tableOfContents(blocks: Block[]): TocItem[] {
  return blocks.flatMap((block) => (block.t === 'h' ? [{ id: block.id, text: plainText(block.c), level: block.level }] : []))
}
/** O índice só aparece em artigos com 3 ou mais h2. */
export const showToc = (items: TocItem[]) => items.filter((item) => item.level === 2).length >= 3
