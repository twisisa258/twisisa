// Regras do jogo do Twisisa para Disciplinas, Variantes e Questões. Puro (sem base de dados): serve ao servidor, ao formulário e aos testes.

/** As 10 disciplinas gerais. Todas as instituições e cursos seguem-nas; o que não se liga a elas não existe. */
export const DISCIPLINAS_GERAIS = [
  { slug: 'matematica', name: 'Matemática', grupo: 1 },
  { slug: 'fisica', name: 'Física', grupo: 1 },
  { slug: 'quimica', name: 'Química', grupo: 1 },
  { slug: 'biologia', name: 'Biologia', grupo: 1 },
  { slug: 'portugues', name: 'Português', grupo: 2 },
  { slug: 'ingles', name: 'Inglês', grupo: 2 },
  { slug: 'frances', name: 'Francês', grupo: 2 },
  { slug: 'filosofia', name: 'Filosofia', grupo: 2 },
  { slug: 'geografia', name: 'Geografia', grupo: 3 },
  { slug: 'historia', name: 'História', grupo: 3 },
] as const

/** Variantes que existem (só na UEM). Guardadas em maiúsculas, como os dados já existentes. */
export const VARIANTES_VALIDAS = ['I', 'II', 'III'] as const
export type VarianteValida = (typeof VARIANTES_VALIDAS)[number]

/** «i», «II», « iii » → 'I' | 'II' | 'III'. Qualquer outra coisa → null. */
export function normalizarVariante(valor: string | null | undefined): VarianteValida | null {
  const limpo = String(valor ?? '').trim().toUpperCase()
  return VARIANTES_VALIDAS.find((item) => item === limpo) ?? null
}

/** Posição da disciplina na lista das 10 (as que não estão vão para o fim). */
export function posicaoDisciplina(nome: string): number {
  const index = DISCIPLINAS_GERAIS.findIndex((item) => item.name === nome)
  return index < 0 ? DISCIPLINAS_GERAIS.length : index
}

export type ConfigQuestao = { track: string; institutionId: string; subjectId: string; topicId: string; variant: string }
export type EtapaConfig = 'onde' | 'disciplina' | 'variante' | 'tema'

/** A variante só se pede na admissão a uma instituição que tem variantes, e numa disciplina que as tem. */
export function precisaVariante(track: string, institutionId: string, idsComVariantes: string[], disciplinaTemVariantes: boolean): boolean {
  return track === 'admissao' && !!institutionId && idsComVariantes.includes(institutionId) && disciplinaTemVariantes
}

/** Primeiro passo obrigatório sem escolha (ou null). Variante e tema são opcionais: ficam marcados na Revisão e o Jonas classifica o tema. */
export function etapaEmFalta(config: ConfigQuestao, idsComVariantes: string[], disciplinaTemVariantes: boolean): EtapaConfig | null {
  const ondeOk = config.track === '10' || config.track === '12' || (config.track === 'admissao' && !!config.institutionId)
  if (!ondeOk) return 'onde'
  if (!config.subjectId) return 'disciplina'
  void idsComVariantes; void disciplinaTemVariantes
  return null
}
