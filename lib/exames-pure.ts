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

// ───────────── Endereços, pesquisa e perguntas frequentes (SEO) ─────────────

export type Faq = { q: string; a: string }

export type ExamRef = { id: string; institutionSlug: string; subjectSlug: string }

/** /exames/uem/matematica/<id> */
export const examPath = (exam: ExamRef) => `/exames/${exam.institutionSlug}/${exam.subjectSlug}/${exam.id}`
/** /exames/uem/ano/2023 */
export const yearPath = (institutionSlug: string, year: number) => `/exames/${institutionSlug}/ano/${year}`
export const isYear = (value: string) => /^(19|20)\d{2}$/.test(value)

/** Palavras da pesquisa: até 5, de 2 a 40 caracteres, em minúsculas e sem repetidas. */
const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'um', 'uma', 'ao'])

export function searchTokens(raw: string): string[] {
  const seen = new Set<string>()
  for (const word of raw.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/)) {
    const token = word.trim().slice(0, 40)
    if (token.length >= 2 && !STOPWORDS.has(token)) seen.add(token)
    if (seen.size >= 5) break
  }
  return [...seen]
}

/** Padrão para ILIKE: o utilizador nunca controla os caracteres especiais. */
export const likePattern = (token: string) => `%${token.replace(/[\\%_]/g, '\\$&')}%`

const list = (items: string[], max: number) => {
  const shown = items.slice(0, max)
  if (shown.length <= 1) return shown.join('')
  return `${shown.slice(0, -1).join(', ')} e ${shown[shown.length - 1]}`
}

/** Anos distintos, do mais recente para o mais antigo: «2024, 2023 e 2021». */
export function yearsText(years: (number | null)[]) {
  const distinct = [...new Set(years.filter((year): year is number => year !== null))].sort((a, b) => b - a)
  return list(distinct.map(String), 8)
}

const DOWNLOAD_ANSWER = 'Sim. Podes ler cada exame no site sem criar conta. Para o descarregar em PDF é preciso uma conta gratuita, que se cria em menos de um minuto.'
const PRACTICE_ANSWER = 'No Simulador do Twisisa praticas com questões de exames anteriores, vês a correção a cada resposta e recebes uma nota de 0 a 20. Precisas de uma conta gratuita.'

export function faqHub(institutions: string[]): Faq[] {
  return [
    { q: 'Onde posso ver exames de admissão de anos anteriores?', a: `No Twisisa podes ler, sem criar conta, os exames de admissão anteriores${institutions.length ? ` de ${list(institutions, 6)}` : ' das universidades moçambicanas'}. Escolhe a universidade, depois a disciplina e depois o ano.` },
    { q: 'Posso baixar os exames de admissão em PDF?', a: DOWNLOAD_ANSWER },
    { q: 'Como me posso testar para o exame de admissão?', a: PRACTICE_ANSWER },
    { q: 'O que devo estudar para o exame de admissão?', a: 'Em cada disciplina mostramos os temas principais a estudar, tirados dos exames anteriores. Começa por aí e depois pratica com questões reais.' },
  ]
}

export function faqInstitution(inst: { shortName: string; name: string }, subjects: string[], years: (number | null)[]): Faq[] {
  const when = yearsText(years)
  return [
    { q: `Que disciplinas fazem parte do exame de admissão da ${inst.shortName}?`, a: subjects.length ? `No Twisisa tens exames e temas de ${list(subjects, 10)}. As provas que cada curso exige estão no edital da ${inst.name}.` : `Estamos a preparar as disciplinas da ${inst.shortName}. Volta em breve.` },
    { q: `Onde encontro exames de admissão anteriores da ${inst.shortName}?`, a: when ? `Aqui mesmo: temos exames da ${inst.shortName} dos anos ${when}. Lê-os sem conta e descarrega o PDF com uma conta gratuita.` : `Aqui mesmo, assim que forem publicados. Lê-os sem conta e descarrega o PDF com uma conta gratuita.` },
    { q: `Como treino para o exame de admissão da ${inst.shortName}?`, a: PRACTICE_ANSWER },
  ]
}

export function faqSubject(input: { subject: string; institution: string; topics: string[]; examYears: (number | null)[]; examCount: number }): Faq[] {
  const { subject, institution, topics, examYears, examCount } = input
  const when = yearsText(examYears)
  const out: Faq[] = [
    {
      q: `O que estudar para o exame de admissão de ${subject} da ${institution}?`,
      a: topics.length > 0 ? `Os temas principais são: ${list(topics, 5)}${topics.length > 5 ? ' e outros' : ''}. Cada tema tem um resumo e uma dica mais abaixo nesta página.` : `Começa pelos exames anteriores de ${subject}: mostram o tipo de questões e os temas que mais saem.`,
    },
  ]
  if (examCount > 0) out.push({ q: `Onde encontro exames anteriores de ${subject} da ${institution}?`, a: `Nesta página tens ${examCount} ${examCount === 1 ? 'exame' : 'exames'}${when ? ` (${when})` : ''}. Podes lê-los sem conta.` })
  out.push({ q: `Posso baixar o exame de ${subject} da ${institution} em PDF?`, a: DOWNLOAD_ANSWER })
  out.push({ q: `Como me testo em ${subject}?`, a: PRACTICE_ANSWER })
  return out
}

export function faqExam(input: { heading: string; subject: string; institution: string }): Faq[] {
  return [
    { q: `Posso ler o ${input.heading} sem conta?`, a: 'Sim. O exame abre nesta página, sem criar conta. Para o descarregar em PDF é preciso uma conta gratuita.' },
    { q: `Como me preparo com este exame de ${input.subject}?`, a: `Resolve-o primeiro sem consultar nada, depois confere os temas principais de ${input.subject} da ${input.institution} e treina no Simulador com questões da mesma disciplina.` },
  ]
}

export function faqSimulado(): Faq[] {
  return [
    { q: 'O que é um simulado de exame de admissão?', a: 'É um treino com questões como as do exame, feito no teu ritmo, com correção e nota no fim. No Twisisa usas questões de exames anteriores.' },
    { q: 'Como é calculada a nota?', a: 'A nota vai de 0 a 20 e é igual a 20 × (pontos ganhos ÷ pontos possíveis). Cada questão vale entre 2 e 4 pontos, conforme a dificuldade, e pedir dicas reduz os pontos dessa questão.' },
    { q: 'Posso treinar só os meus erros?', a: 'Sim. O modo «Revisar erros» repete só as questões que erraste, até as dominares.' },
    { q: 'Preciso de conta para praticar?', a: 'Sim, uma conta gratuita, para guardares o teu histórico, a tua nota e o teu lugar no ranking. Os exames podem ser lidos sem conta.' },
  ]
}

/**
 * Texto de um exame lido do PDF, em parágrafos, para o HTML da página (o Google não lê o PDF desenhado no ecrã).
 * Une as linhas partidas pelo PDF e abre novo parágrafo em «1.», «a)», «Questão», «Grupo»… Devolve [] se o texto for curto demais.
 */
export function examTextParagraphs(raw: string, maxChars = 14000, minChars = 400): string[] {
  const text = raw.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFD]/g, ' ')
  const startsItem = /^(\d{1,3}\s*[.)]|\(?[a-e]\)|quest[ãa]o\b|grupo\b|parte\b|problema\b|exerc[ií]cio\b|pergunta\b)/i
  const paragraphs: string[] = []
  let current = ''
  const flush = () => {
    const clean = current.replace(/\s+/g, ' ').trim()
    if (clean.length >= 3) paragraphs.push(clean)
    current = ''
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      flush()
      continue
    }
    if (startsItem.test(trimmed)) flush()
    current += `${current ? ' ' : ''}${trimmed}`
  }
  flush()
  const out: string[] = []
  let total = 0
  for (const paragraph of paragraphs) {
    if (total + paragraph.length > maxChars) break
    out.push(paragraph)
    total += paragraph.length
  }
  return total >= minChars ? out : []
}

/** Dados estruturados FAQPage: o texto tem de ser o mesmo que aparece na página. */
export function faqJsonLd(items: Faq[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  }
}
