// Páginas públicas de exames e temas principais: parte pura (sem base de dados nem rede).

export const slugify = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export type KeyTopicDraft = { position: number; title: string; summary: string; tips: string }

/**
 * Lê a resposta do Jonas:  @@T 1 / titulo: ... / @@RESUMO ... / @@DICAS ... / @@FIM
 * Devolve até 10 temas, renumerados pela ordem em que vieram.
 */
export function parseKeyTopics(raw: string): KeyTopicDraft[] {
  const lines = raw.replace(/\r\n?/g, '\n').replace(/^```[a-z]*\s*$/gim, '').split('\n')
  type Draft = { title: string; summary: string[]; tips: string[] }
  const drafts: Draft[] = []
  let current: Draft | null = null
  let section: 'head' | 'resumo' | 'dicas' | null = null
  for (const line of lines) {
    const marker = /^\s*@@(\w+)/.exec(line)
    if (marker) {
      const name = marker[1].toUpperCase()
      if (name === 'T') { current = { title: '', summary: [], tips: [] }; drafts.push(current); section = 'head' }
      else if (name === 'RESUMO' && current) section = 'resumo'
      else if (name === 'DICAS' && current) section = 'dicas'
      else if (name === 'FIM') { section = null; current = null }
      continue
    }
    if (!current) continue
    if (section === 'head') {
      const field = /^\s*t[ií]tulo\s*:\s*(.*)$/i.exec(line)
      if (field) current.title = field[1].trim()
    } else if (section === 'resumo') current.summary.push(line)
    else if (section === 'dicas') current.tips.push(line)
  }
  const clean = (parts: string[], max: number) => parts.join('\n').replace(/\$/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
  return drafts
    .map((draft) => ({ title: draft.title.replace(/\$/g, '').slice(0, 120), summary: clean(draft.summary, 2500), tips: clean(draft.tips, 600) }))
    .filter((draft) => draft.title.length >= 3 && draft.summary.length >= 20)
    .slice(0, 10)
    .map((draft, index) => ({ position: index + 1, ...draft }))
}

const PDF_MAP: Record<string, string> = { '–': '-', '—': '-', '‘': "'", '’': "'", '“': '"', '”': '"', '…': '...', '•': '-', '→': '->', '≤': '<=', '≥': '>=', '×': 'x', '²': '2', '³': '3' }

/** Texto que as fontes padrão do PDF aceitam (acentos do português ficam; o resto é trocado ou retirado). */
export function pdfSafe(text: string) {
  return Array.from(text)
    .map((char) => (PDF_MAP[char] !== undefined ? PDF_MAP[char] : char.charCodeAt(0) <= 255 || char === '\n' ? char : ''))
    .join('')
}

/** Parte o texto em linhas que cabem na largura, sem partir palavras. `measure` mede o texto na fonte usada. */
export function wrapLines(text: string, maxWidth: number, measure: (value: string) => number): string[] {
  const out: string[] = []
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) { out.push(''); continue }
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word
      if (line && measure(test) > maxWidth) { out.push(line); line = word } else line = test
    }
    if (line) out.push(line)
  }
  return out
}

/** Título de página para o Google: «Exame de admissão de Matemática UEM 2023 (I)». */
export function examHeading(parts: { subject: string | null; institution: string | null; year: number | null; title: string }) {
  if (!parts.subject || !parts.institution) return parts.title
  const variant = [...parts.title.matchAll(/\b(IV|III|II|I)\b/g)].pop()?.[1]
  return `Exame de admissão de ${parts.subject} ${parts.institution}${parts.year ? ` ${parts.year}` : ''}${variant ? ` (${variant})` : ''}`
}
