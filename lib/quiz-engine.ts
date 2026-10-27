// Lógica única de montagem e nota dos quizzes. Código puro (sem base de dados, sem React): serve o servidor e os testes.
//
// Regras (ver SIMULADOR.md, secção «Lógica única»):
//  • Cada questão tem um peso de 2 a 4 (dificuldade da questão + dificuldade da variante). Pontos = peso, só se acertar.
//  • O que já foi mostrado perde peso (fator de repetição) e perde prioridade na escolha.
//  • A nota é de 0 a 20 e pesa as questões: 20 × (peso das certas ÷ peso de todas).
//  • A escolha dá prioridade ao que o aluno nunca viu; o que errou pode voltar (limitado); o que acertou só volta no fim.
//  • O baralhamento das opções usa aleatoriedade criptográfica e evita padrões (mesma letra certa várias vezes seguidas,
//    ordem igual à escrita pelo admin).

export type Difficulty = 'facil' | 'media' | 'dificil'

export const MIN_WEIGHT = 2
export const MAX_WEIGHT = 4

const INDEX: Record<Difficulty, number> = { facil: 0, media: 1, dificil: 2 }
const toDifficulty = (value: string | null | undefined): Difficulty => (value === 'facil' || value === 'dificil' ? value : 'media')

const round1 = (value: number) => Math.round(value * 10) / 10

/** Peso base (2 a 4). Sem variante, conta só a dificuldade da questão; com variante, a média das duas. */
export function questionWeight(questionDifficulty: string | null | undefined, variantDifficulty?: string | null): number {
  const q = INDEX[toDifficulty(questionDifficulty)]
  const v = variantDifficulty ? INDEX[toDifficulty(variantDifficulty)] : q
  return MIN_WEIGHT + (q + v) / 2
}

/** Quanto vale uma questão que o aluno já viu `timesShown` vezes: 100 %, 50 %, 25 %, e no mínimo 10 %. */
export function repeatFactor(timesShown: number): number {
  if (!Number.isFinite(timesShown) || timesShown <= 0) return 1
  return Math.max(0.1, 0.5 ** Math.floor(timesShown))
}

/** Peso final guardado na sessão (uma casa decimal, nunca zero). */
export function itemWeight(questionDifficulty: string | null | undefined, variantDifficulty: string | null | undefined, timesShown: number): number {
  return Math.max(0.1, round1(questionWeight(questionDifficulty, variantDifficulty) * repeatFactor(timesShown)))
}

/** Nota de 0 a 20 com uma casa decimal. Em branco conta como errada. Sem pesos, cai para a proporção simples. */
export function gradeOutOf20(items: { weight: number; correct: boolean }[]): number {
  if (items.length === 0) return 0
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  if (total <= 0) return round1((items.filter((item) => item.correct).length / items.length) * 20)
  const earned = items.reduce((sum, item) => sum + (item.correct ? item.weight : 0), 0)
  return round1((earned / total) * 20)
}

// ───────────── Aleatoriedade ─────────────

/** Inteiro uniforme em [0, max), com rejeição para não ter viés. */
export function randomInt(max: number): number {
  if (max <= 1) return 0
  const limit = Math.floor(0x100000000 / max) * max
  const buffer = new Uint32Array(1)
  for (;;) {
    globalThis.crypto.getRandomValues(buffer)
    if (buffer[0] < limit) return buffer[0] % max
  }
}

/** Fisher–Yates (cópia). */
export function secureShuffle<T>(list: readonly T[]): T[] {
  const copy = list.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ───────────── Baralhar as opções ─────────────

export type OptionForShuffle = { id: string; isFixed: boolean; isCorrect: boolean }

/** Acompanha as posições da resposta certa ao longo de um quiz, para espalhar as letras. */
export class OptionShuffler {
  private readonly used = new Map<number, number>()
  private readonly recent: number[] = []

  /** Devolve os ids das opções na ordem a mostrar. As opções «fixas» ficam no sítio onde estão escritas. */
  order(options: readonly OptionForShuffle[]): string[] {
    const free = options.filter((option) => !option.isFixed)
    const original = options.map((option) => option.id)
    let best: { order: string[]; score: number } | null = null

    for (let attempt = 0; attempt < 16; attempt++) {
      const shuffled = secureShuffle(free)
      let k = 0
      const order = options.map((option) => (option.isFixed ? option.id : shuffled[k++].id))
      // Com 3 ou mais opções livres, a ordem escrita pelo admin nunca sai igual (é onde costuma estar a certa em primeiro).
      if (free.length >= 3 && order.every((id, index) => id === original[index])) continue
      const position = order.findIndex((id) => options.find((option) => option.id === id)?.isCorrect)
      const [last, beforeLast] = [this.recent[this.recent.length - 1], this.recent[this.recent.length - 2]]
      // Nunca a mesma letra certa três vezes seguidas; e evita-se repetir a anterior.
      if (position === last && position === beforeLast && options.length > 2) continue
      const score = (this.used.get(position) ?? 0) * 2 + (position === last ? 1 : 0)
      if (!best || score < best.score) best = { order, score }
      if (score === 0) break
    }
    // Se todas as tentativas foram recusadas (poucas opções), aceita-se uma baralhada simples.
    const chosen = best?.order ?? (() => { let k = 0; const shuffled = secureShuffle(free); return options.map((option) => (option.isFixed ? option.id : shuffled[k++].id)) })()
    const position = chosen.findIndex((id) => options.find((option) => option.id === id)?.isCorrect)
    this.used.set(position, (this.used.get(position) ?? 0) + 1)
    this.recent.push(position)
    return chosen
  }
}

// ───────────── Escolher as questões ─────────────

export type Candidate = {
  id: string
  examYear: number | null
  topicId: string | null
  variant: string | null
  timesShown: number
  lastResult: 'right' | 'wrong' | null
  lastShownAt: number | null
}

export type PickOptions = {
  size: number
  now?: number
  /** Uma questão errada só volta depois deste tempo (modo normal). */
  retryCooldownMs?: number
  /** Parte máxima do quiz (0 a 1) ocupada por questões erradas antes, quando há novas que cheguem. */
  retryShare?: number
  /** `fill`: as questões sem tema (ou sem variante, na mistura) só entram para completar. */
  auxiliary?: 'mixed' | 'fill'
}

export const DEFAULT_RETRY_COOLDOWN_MS = 60 * 60 * 1000
export const DEFAULT_RETRY_SHARE = 0.3

const isRetry = (c: Candidate) => c.timesShown > 0 && (c.lastResult === 'wrong' || c.lastResult === null)
const isFresh = (c: Candidate) => c.timesShown === 0

/** Novas questões repartidas pelos anos (uma de cada ano à vez), ao acaso dentro de cada ano. */
function spreadByYear(list: Candidate[], count: number): Candidate[] {
  const buckets = new Map<string, Candidate[]>()
  for (const item of secureShuffle(list)) {
    const key = item.examYear === null ? 'sem-ano' : String(item.examYear)
    buckets.set(key, [...(buckets.get(key) ?? []), item])
  }
  const out: Candidate[] = []
  while (out.length < count && buckets.size > 0) {
    for (const key of secureShuffle([...buckets.keys()])) {
      const bucket = buckets.get(key)!
      out.push(bucket.shift()!)
      if (bucket.length === 0) buckets.delete(key)
      if (out.length >= count) break
    }
  }
  return out
}

/** As que foram vistas há mais tempo (e menos vezes) primeiro; empates ao acaso. */
const oldestFirst = (list: Candidate[]) =>
  secureShuffle(list).sort((a, b) => (a.lastShownAt ?? 0) - (b.lastShownAt ?? 0) || a.timesShown - b.timesShown)

/** `wantsVariant`: a escolha é «todas as variantes» de uma disciplina que as tem; as sem variante só completam. */
export function pickQuestions(pool: readonly Candidate[], options: PickOptions & { wantsVariant?: boolean }): string[] {
  const { size, now = Date.now(), retryCooldownMs = DEFAULT_RETRY_COOLDOWN_MS, retryShare = DEFAULT_RETRY_SHARE, auxiliary = 'mixed', wantsVariant = false } = options
  // Auxiliares: sem variante (quando se mistura variantes) ou sem tema (quando o tema manda). Só entram para completar.
  const isAux = (c: Candidate) => (wantsVariant && c.variant === null) || (auxiliary === 'fill' && c.topicId === null)

  const chosen: Candidate[] = []
  const has = new Set<string>()
  const add = (list: Candidate[]) => {
    for (const item of list) {
      if (chosen.length >= size) return
      if (!has.has(item.id)) {
        has.add(item.id)
        chosen.push(item)
      }
    }
  }
  const room = () => size - chosen.length

  const mainPool = pool.filter((c) => !isAux(c))
  const auxPool = pool.filter(isAux)
  for (const group of [mainPool, auxPool]) {
    if (room() <= 0) break
    const fresh = group.filter(isFresh)
    const retryReady = group.filter((c) => isRetry(c) && now - (c.lastShownAt ?? 0) >= retryCooldownMs)
    const retryCooling = group.filter((c) => isRetry(c) && now - (c.lastShownAt ?? 0) < retryCooldownMs)
    const seen = group.filter((c) => !isFresh(c) && !isRetry(c))

    const target = room()
    const nRetry = Math.min(retryReady.length, Math.max(Math.round(target * retryShare), target - fresh.length))
    add(spreadByYear(retryReady, nRetry))
    add(spreadByYear(fresh, room()))
    add(spreadByYear(retryReady.filter((c) => !has.has(c.id)), room()))
    add(oldestFirst(retryCooling))
    add(oldestFirst(seen))
  }
  // A ordem final mistura tudo, para as questões a repetir não ficarem juntas.
  return secureShuffle(chosen).map((item) => item.id)
}
