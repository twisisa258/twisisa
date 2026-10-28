// Orientação de curso («Descobre o teu curso»). O nome que o aluno vê vem do módulo em lib/exam-modules.ts
// (chave interna 'teste-vocacional', que não muda para não mexer nos dados da administração).

export type OrientacaoCurso = { name: string; institution: string | null; percent: number }

export type OrientacaoEstado =
  | { status: 'nunca' }
  | { status: 'em_curso'; answered: number; total: number }
  | { status: 'concluido'; finishedAt: Date; courses: OrientacaoCurso[] }

export const ORIENTACAO_MODULE_KEY = 'teste-vocacional' as const
// Rotas a criar quando o teste existir. Só são usadas com o módulo «Ativo», e o servidor só deixa ativá-lo com ready: true.
export const ORIENTACAO_HREF = '/aluno/descobrir-curso'
export const ORIENTACAO_RESULT_HREF = '/aluno/descobrir-curso/resultado'

/**
 * PONTO ÚNICO DE LIGAÇÃO. Hoje o teste não existe, por isso ninguém o fez: devolve sempre «nunca».
 * Quando houver dados, é só aqui que muda: devolver 'em_curso' (respondidas e total) ou 'concluido' (cursos já ordenados,
 * com a percentagem calculada no servidor). O Início e o cartão «Continuar» já mostram cada estado.
 */
export async function getOrientacao(userId: string): Promise<OrientacaoEstado> {
  void userId
  return { status: 'nunca' }
}
