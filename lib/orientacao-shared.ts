// Parte do teste de orientação segura para o browser (sem base de dados): dimensões, respostas e cálculo.
// O cálculo corre SEMPRE no servidor (lib/orientacao.ts). O browser só envia a resposta a cada pergunta, nunca pontuações.
// Modelo RIASEC (Holland): R prático, I investigação, A criatividade, S ajudar pessoas, E liderar, C organização.

export const DIMENSIONS = ['R', 'I', 'A', 'S', 'E', 'C'] as const
export type Dimension = (typeof DIMENSIONS)[number]

export const DIMENSION_LABEL: Record<Dimension, string> = {
  R: 'trabalho prático',
  I: 'investigação',
  A: 'criatividade',
  S: 'ajudar pessoas',
  E: 'liderar',
  C: 'organização',
}

export const ANSWER_OPTIONS = [
  { value: 2, label: 'Gosto' },
  { value: 1, label: 'Mais ou menos' },
  { value: 0, label: 'Não gosto' },
] as const

export const MINUTES_ESTIMATE = 4

export type CourseProfile = { courseId: string; name: string; unit: string | null; institution: string; weights: Record<Dimension, number> }
export type ScoredCourse = { courseId: string; name: string; unit: string | null; institution: string; percent: number; reasons: Dimension[] }
export type OrientacaoResult = { version: 1; scores: Record<Dimension, number>; flat: boolean; courses: ScoredCourse[] }

const MAX_PER_UNIT = 2 // no máximo 2 cursos da mesma faculdade/unidade nos primeiros lugares, para haver variedade
const FLAT_SPREAD = 20 // diferença mínima (em pontos) entre a dimensão mais e menos forte
const MIN_PERCENT = 30 // abaixo disto o curso não é sugerido: melhor mostrar menos de 5 do que encher a lista com cursos que não combinam

const zero = (): Record<Dimension, number> => ({ R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 })

/**
 * Cada pergunta vale 0, 1 ou 2. O nível de cada dimensão é a média das suas respostas (0 a 1).
 * A afinidade com um curso é a média dos níveis do aluno, pesada pelo que o curso pede: se o curso pede só «investigação»,
 * a afinidade é o nível de investigação do aluno. Nunca passa de 100 e não depende dos outros cursos.
 */
export function computeOrientacao(answers: { dimension: Dimension; value: number }[], profiles: CourseProfile[], top = 5): OrientacaoResult {
  const sums = zero()
  const counts = zero()
  for (const answer of answers) {
    sums[answer.dimension] += answer.value
    counts[answer.dimension] += 1
  }
  const level = zero()
  const scores = zero()
  for (const d of DIMENSIONS) {
    level[d] = counts[d] > 0 ? sums[d] / (2 * counts[d]) : 0
    scores[d] = Math.round(level[d] * 100)
  }
  const values = DIMENSIONS.map((d) => scores[d])
  const flat = Math.max(...values) - Math.min(...values) < FLAT_SPREAD

  type Scored = CourseProfile & { affinity: number; reasons: Dimension[] }
  const scored: Scored[] = []
  for (const profile of profiles) {
    const total = DIMENSIONS.reduce((sum, d) => sum + Math.max(0, profile.weights[d]), 0)
    if (total <= 0) continue
    let affinity = 0
    const parts: { d: Dimension; v: number }[] = []
    for (const d of DIMENSIONS) {
      const share = Math.max(0, profile.weights[d]) / total
      affinity += share * level[d]
      // «Porque gostas de»: só dimensões que o curso pede e em que o aluno disse gostar (nível de 50% ou mais).
      if (share > 0 && level[d] >= 0.5) parts.push({ d, v: share * level[d] })
    }
    parts.sort((a, b) => b.v - a.v)
    scored.push({ ...profile, affinity, reasons: parts.slice(0, 2).map((part) => part.d) })
  }
  scored.sort((a, b) => b.affinity - a.affinity || a.name.localeCompare(b.name, 'pt'))
  const eligible = scored.filter((c) => Math.round(c.affinity * 100) >= MIN_PERCENT)

  const picked: Scored[] = []
  const perUnit = new Map<string, number>()
  const unitKey = (c: Scored) => `${c.institution}|${c.unit ?? c.name}`
  for (const course of eligible) {
    if (picked.length >= top) break
    const key = unitKey(course)
    if ((perUnit.get(key) ?? 0) >= MAX_PER_UNIT) continue
    picked.push(course)
    perUnit.set(key, (perUnit.get(key) ?? 0) + 1)
  }
  for (const course of eligible) {
    if (picked.length >= top) break
    if (!picked.includes(course)) picked.push(course)
  }
  picked.sort((a, b) => b.affinity - a.affinity || a.name.localeCompare(b.name, 'pt'))

  return {
    version: 1,
    scores,
    flat,
    courses: picked.map((c) => ({ courseId: c.courseId, name: c.name, unit: c.unit, institution: c.institution, percent: Math.round(c.affinity * 100), reasons: c.reasons })),
  }
}
