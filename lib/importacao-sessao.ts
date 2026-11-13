// Importação de questões por sessão (instituição, disciplina, variante e nível já escolhidos).
// Puro (sem base de dados): analisa uma linha do CSV e diz se entra, e o que fica a precisar de revisão.
import { CSV_EXAMPLE_MARK } from './question-csv-template'
import type { Razao } from './revisao'

const LETRAS = ['a', 'b', 'c', 'd', 'e']

export const COLUNAS_SESSAO = ['statement', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct', 'topic_name', 'year', 'variant', 'explanation', 'origin_label'] as const
export const COLUNAS_OBRIGATORIAS_SESSAO = ['statement', 'option_a', 'option_b', 'correct']

export const semAcentos = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export type ContextoImportacao = {
  /** nome do tema (sem acentos, minúsculas) → id */
  temas: Map<string, string>
  /** variante (sem acentos, minúsculas) → nome certo (I, II, III) */
  variantes: Map<string, string>
  instituicaoTemVariantes: boolean
  disciplinaTemVariantes: boolean
  varianteSessao: string | null
}

export type LinhaAnalisada =
  | { ok: false; motivo: string }
  | {
      ok: true
      enunciado: string
      explicacao: string | null
      opcoes: { body: string; isCorrect: boolean }[]
      topicId: string | null
      variant: string | null
      year: number | null
      originLabel: string | null
      razoes: Razao[]
      notas: string[]
      temaDesconhecido: boolean
      varianteDesconhecida: boolean
    }

/** Uma linha rejeitada não entra. Uma linha com falhas «corrigíveis» (ano, tema, variante) entra e vai para revisão. */
export function analisarLinha(registo: Record<string, string>, ctx: ContextoImportacao): LinhaAnalisada {
  const enunciado = (registo.statement ?? '').trim()
  if (enunciado.toUpperCase().startsWith(CSV_EXAMPLE_MARK)) return { ok: false, motivo: `linha de exemplo do modelo (${CSV_EXAMPLE_MARK})` }
  if (enunciado.length < 3) return { ok: false, motivo: 'enunciado vazio ou demasiado curto' }
  if (enunciado.length > 12000) return { ok: false, motivo: 'enunciado demasiado longo' }

  const certa = (registo.correct ?? '').trim().toLowerCase()
  if (!LETRAS.includes(certa)) return { ok: false, motivo: 'a coluna correct deve ser uma letra de A a E' }
  const opcoes = LETRAS.map((letra) => ({ body: (registo[`option_${letra}`] ?? '').trim().slice(0, 2000), isCorrect: letra === certa })).filter((opcao) => opcao.body)
  if (opcoes.length < 2) return { ok: false, motivo: 'precisa de pelo menos duas opções' }
  if (!opcoes.some((opcao) => opcao.isCorrect)) return { ok: false, motivo: 'a opção marcada como correta está vazia' }

  const razoes: Razao[] = []
  const notas: string[] = []

  const textoAno = (registo.year ?? '').trim()
  let year: number | null = null
  if (textoAno) {
    const valor = Number(textoAno)
    if (Number.isInteger(valor) && valor >= 1990 && valor <= 2100) year = valor
    else notas.push(`ano inválido: ${textoAno}`)
  }
  if (year === null) razoes.push('sem_ano')

  const textoTema = (registo.topic_name ?? '').trim()
  let topicId: string | null = null
  let temaDesconhecido = false
  if (textoTema) {
    topicId = ctx.temas.get(semAcentos(textoTema)) ?? null
    if (!topicId) {
      temaDesconhecido = true
      notas.push(`tema desconhecido: ${textoTema}`)
    }
  }
  if (!topicId) razoes.push('sem_tema')

  const textoVariante = (registo.variant ?? '').trim()
  let variant: string | null = ctx.varianteSessao
  let varianteDesconhecida = false
  if (textoVariante && ctx.instituicaoTemVariantes) {
    variant = ctx.variantes.get(semAcentos(textoVariante)) ?? null
    if (!variant) {
      varianteDesconhecida = true
      notas.push(`variante desconhecida: ${textoVariante}`)
    }
  }
  if (!ctx.instituicaoTemVariantes) variant = null
  if (!variant && ctx.instituicaoTemVariantes && ctx.disciplinaTemVariantes) razoes.push('sem_variante')

  return {
    ok: true,
    enunciado,
    explicacao: (registo.explanation ?? '').trim().slice(0, 4000) || null,
    opcoes,
    topicId,
    variant,
    year,
    originLabel: (registo.origin_label ?? '').trim().slice(0, 160) || null,
    razoes,
    notas,
    temaDesconhecido,
    varianteDesconhecida,
  }
}

const aspas = (valor: string) => (/[",\r\n]/.test(valor) || valor !== valor.trim() ? `"${valor.replace(/"/g, '""')}"` : valor)

/** Modelo do CSV de uma sessão: só o que muda de questão para questão (a instituição, a disciplina e o nível já estão escolhidos). */
export function modeloSessao(): string {
  const linha = (valores: Partial<Record<(typeof COLUNAS_SESSAO)[number], string>>) => COLUNAS_SESSAO.map((coluna) => aspas(valores[coluna] ?? '')).join(',')
  return [
    COLUNAS_SESSAO.join(','),
    linha({ statement: `${CSV_EXAMPLE_MARK} Resolve a equação $2x + 6 = 14$.`, option_a: '$x = 3$', option_b: '$x = 4$', option_c: '$x = 5$', option_d: '$x = 8$', correct: 'B', topic_name: 'Equações', year: '2024', variant: 'I', explanation: 'Passa o 6 para o outro lado: $2x = 8$.' }),
    linha({ statement: `${CSV_EXAMPLE_MARK} Quanto é $3 + 4$?`, option_a: '6', option_b: '7', correct: 'B' }),
  ].join('\r\n') + '\r\n'
}
