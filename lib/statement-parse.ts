export type StatementBlock =
  | { kind: 'text'; text: string }
  | { kind: 'formula'; text: string }
  | { kind: 'given'; items: { text: string; formula: boolean }[] }
  | { kind: 'question'; text: string }

const MATH = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
const ESCAPED = '\u0000'
const ASKS = /^(qual|quais|quanto|quantos|quantas|indique|assinale|determine|calcule|escolha|selecione|seleccione|identifique|em qual|em quais|que |o que|como|porque|por que|encontre|resolva)\b/i

export function normalizeStatement(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n+[ \t]*([.,;:!?])(?=\s|$)/g, '$1')
    .trim()
}

export function isFormulaLine(line: string) {
  const flat = line.replace(/\\\$/g, ESCAPED)
  if (!flat.match(MATH)) return false
  return flat.replace(MATH, '').replace(/[\s;,.:]/g, '').length === 0
}

function cleanItem(line: string) {
  const formula = isFormulaLine(line)
  const text = line.replace(formula ? /[\s;,.]+$/ : /[\s;,]+$/, '')
  return { text, formula }
}

export function parseStatement(raw: string): StatementBlock[] {
  const lines = normalizeStatement(raw).split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return []
  if (lines.length === 1) return [isFormulaLine(lines[0]) ? { kind: 'formula', text: cleanItem(lines[0]).text } : { kind: 'question', text: lines[0] }]

  const blocks: StatementBlock[] = []
  let rest = lines
  const last = lines[lines.length - 1]
  let question: string | null = null
  if (!isFormulaLine(last) && (/\?$/.test(last) || ASKS.test(last))) {
    question = last
    rest = lines.slice(0, -1)
  }

  const colon = rest.findIndex((l, i) => i < rest.length - 1 && /:$/.test(l) && !isFormulaLine(l))
  if (colon >= 0) {
    for (const l of rest.slice(0, colon + 1)) blocks.push({ kind: 'text', text: l })
    blocks.push({ kind: 'given', items: rest.slice(colon + 1).map(cleanItem) })
  } else {
    for (const l of rest) blocks.push(isFormulaLine(l) ? { kind: 'formula', text: cleanItem(l).text } : { kind: 'text', text: l })
  }
  if (question) blocks.push({ kind: 'question', text: question })
  return blocks
}
