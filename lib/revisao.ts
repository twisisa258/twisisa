// Revisão de questões: razões e texto do resumo de uma importação. Puro (sem base de dados).

export const RAZOES = {
  sem_ano: 'Sem ano',
  sem_tema: 'Sem tema',
  sem_variante: 'Sem variante',
  possivel_duplicada: 'Possível duplicada',
} as const
export type Razao = keyof typeof RAZOES
export const ORDEM_RAZOES: Razao[] = ['sem_ano', 'sem_tema', 'sem_variante', 'possivel_duplicada']
export const razaoLabel = (razao: string) => (RAZOES as Record<string, string>)[razao] ?? razao

export type TotaisImportacao = {
  lidas: number
  importadas: number
  rejeitadas: number
  emRevisao: number
  porRazao: Partial<Record<Razao, number>>
  temaDesconhecido: number
  varianteDesconhecida: number
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Texto do aviso depois de importar: «das 40 questões importadas, 10 precisam de revisão (…)». */
export function resumoImportacao(t: TotaisImportacao): { titulo: string; corpo: string; nivel: 'sucesso' | 'aviso' | 'erro' } {
  if (t.importadas === 0) {
    return { titulo: 'Importação sem questões', corpo: `Nenhuma linha foi aceite (${t.lidas} lidas).`, nivel: 'erro' }
  }
  const partes: string[] = []
  const prontas = t.importadas - t.emRevisao
  if (prontas > 0) partes.push(`${prontas} ${prontas === 1 ? 'está pronta' : 'estão prontas'}.`)
  if (t.emRevisao > 0) {
    const motivos: string[] = []
    const ano = t.porRazao.sem_ano ?? 0
    if (ano) motivos.push(`${ano} sem ano`)
    const tema = t.porRazao.sem_tema ?? 0
    if (t.temaDesconhecido) motivos.push(`${t.temaDesconhecido} com tema desconhecido`)
    if (tema - t.temaDesconhecido > 0) motivos.push(`${tema - t.temaDesconhecido} sem tema`)
    const variante = t.porRazao.sem_variante ?? 0
    if (t.varianteDesconhecida) motivos.push(`${t.varianteDesconhecida} com variante desconhecida`)
    if (variante - t.varianteDesconhecida > 0) motivos.push(`${variante - t.varianteDesconhecida} sem variante`)
    const duplicadas = t.porRazao.possivel_duplicada ?? 0
    if (duplicadas) motivos.push(`${plural(duplicadas, 'possível duplicada', 'possíveis duplicadas')}`)
    partes.push(`${t.emRevisao} ${t.emRevisao === 1 ? 'precisa' : 'precisam'} de revisão${motivos.length ? ` (${motivos.join(', ')})` : ''}.`)
  }
  if (t.rejeitadas > 0) partes.push(`${t.rejeitadas} ${t.rejeitadas === 1 ? 'linha foi rejeitada e não entrou' : 'linhas foram rejeitadas e não entraram'}.`)
  return {
    titulo: `${t.importadas} de ${t.lidas} ${t.lidas === 1 ? 'questão importada' : 'questões importadas'}`,
    corpo: partes.join(' '),
    nivel: t.emRevisao > 0 || t.rejeitadas > 0 ? 'aviso' : 'sucesso',
  }
}

/** «2 sem ano, 1 sem tema»: o que levou questões para a Revisão, pela ordem de sempre. Vazio se nenhuma. */
export function motivosDaRevisao(porRazao: Partial<Record<Razao, number>>): string {
  return ORDEM_RAZOES.filter((razao) => (porRazao[razao] ?? 0) > 0)
    .map((razao) => `${porRazao[razao]} ${razaoLabel(razao).toLowerCase()}`)
    .join(', ')
}
