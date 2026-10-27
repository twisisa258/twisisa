// Modelo de importação de questões (CSV). Sem imports: puro e testável.
// As linhas de exemplo começam por «[EXEMPLO]»: a importação recusa-as, por isso nunca entram no banco por engano.

export const CSV_EXAMPLE_MARK = '[EXEMPLO]'

export const CSV_COLUMNS = ['statement', 'subject_name', 'track', 'institution', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct', 'variant', 'topic_name', 'difficulty', 'year', 'origin_label', 'explanation'] as const

export type TemplatePick = { subject: string; topic?: string }
/** Nomes reais da base de dados, para os exemplos serem válidos neste projecto. Em falta, usam-se nomes de substituição. */
export type TemplateHints = { classe10?: TemplatePick; classe12?: TemplatePick; admissao?: TemplatePick & { institution: string } }

const quote = (value: string) => (/[",\r\n]/.test(value) || value !== value.trim() ? `"${value.replace(/"/g, '""')}"` : value)
const line = (record: Record<(typeof CSV_COLUMNS)[number], string>) => CSV_COLUMNS.map((column) => quote(record[column])).join(',')
const blank = Object.fromEntries(CSV_COLUMNS.map((column) => [column, ''])) as Record<(typeof CSV_COLUMNS)[number], string>

/** Cabeçalho + 3 exemplos: completo (10ª), admissão com instituição, e o mínimo obrigatório (12ª). */
export function buildQuestionTemplate(hints: TemplateHints = {}): string {
  const classe10 = hints.classe10 ?? { subject: 'Matemática' }
  const classe12 = hints.classe12 ?? { subject: 'Matemática' }
  const admissao = hints.admissao ?? { subject: 'Matemática', institution: 'UEM' }
  const rows = [
    {
      ...blank,
      statement: `${CSV_EXAMPLE_MARK} Resolve a equação $2x + 6 = 14$.`,
      subject_name: classe10.subject,
      track: '10',
      option_a: '$x = 3$',
      option_b: '$x = 4$',
      option_c: '$x = 5$',
      option_d: '$x = 8$',
      correct: 'B',
      topic_name: classe10.topic ?? '',
      difficulty: 'facil',
      year: '2024',
      origin_label: 'Exame de exemplo',
      explanation: '$2x = 14 - 6 = 8$, logo $x = 4$.',
    },
    {
      ...blank,
      statement: `${CSV_EXAMPLE_MARK} Qual é o valor de $\\sqrt{49}$?`,
      subject_name: admissao.subject,
      track: 'admissao',
      institution: admissao.institution,
      option_a: '5',
      option_b: '6',
      option_c: '7',
      option_d: '8',
      correct: 'C',
      topic_name: admissao.topic ?? '',
      difficulty: 'media',
      year: '2023',
      origin_label: 'Exame de admissão 2023',
    },
    {
      ...blank,
      statement: `${CSV_EXAMPLE_MARK} Quanto é $3 + 4$?`,
      subject_name: classe12.subject,
      track: '12',
      option_a: '6',
      option_b: '7',
      correct: 'B',
    },
  ]
  return `${CSV_COLUMNS.join(',')}\n${rows.map(line).join('\n')}\n`
}
