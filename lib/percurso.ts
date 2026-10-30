// Percurso do aluno: o que está a preparar. As classes principais são uma lista fixa (não se gerem no admin).
// O conteúdo (questões, módulos, disciplinas) existe só para estas três: `Track`.
export const TRACKS = [
  { value: '10', label: '10ª classe', description: 'Ensino secundário. Não precisa de instituição.' },
  { value: '12', label: '12ª classe', description: 'Ensino secundário. Não precisa de instituição.' },
  { value: 'admissao', label: 'Admissão ao ensino superior', description: 'Escolhes a instituição a que te candidatas.' },
] as const

export type Track = (typeof TRACKS)[number]['value']

export function isTrack(value: unknown): value is Track {
  return TRACKS.some((track) => track.value === value)
}

export function trackLabel(value: string | null | undefined) {
  return TRACKS.find((track) => track.value === value)?.label ?? null
}

// «Outra classe»: quem não prepara a 10ª, a 12ª nem a admissão. Fica guardada em `other_level` (e `track` fica vazio).
export const OTHER_LEVELS = [
  { value: '8', label: '8ª classe' },
  { value: '9', label: '9ª classe' },
  { value: '11', label: '11ª classe' },
] as const

export const OTHER_LEVEL_MAX = 40

export function isPresetLevel(value: string | null | undefined) {
  return OTHER_LEVELS.some((level) => level.value === value)
}

/** Texto da «outra classe» limpo, ou null se não serve (vazio, 1 letra, ou comprido demais). */
export function cleanOtherLevel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, OTHER_LEVEL_MAX)
  if (isPresetLevel(text)) return text
  return text.length >= 2 ? text : null
}

export function otherLevelLabel(value: string | null | undefined) {
  if (!value) return null
  return OTHER_LEVELS.find((level) => level.value === value)?.label ?? value
}

/** Nome do percurso para mostrar: classe principal ou «outra classe». */
export function levelLabel(track: string | null | undefined, otherLevel: string | null | undefined) {
  return trackLabel(track) ?? otherLevelLabel(otherLevel)
}
