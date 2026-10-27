// Percurso do aluno: o que está a preparar. As classes são uma lista fixa (não se gerem no admin).
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
