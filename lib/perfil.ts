// Regras do perfil do aluno (puras, sem segredos): províncias, foto e completude.

export const PROVINCES = [
  'Cidade de Maputo',
  'Maputo',
  'Gaza',
  'Inhambane',
  'Sofala',
  'Manica',
  'Tete',
  'Zambézia',
  'Nampula',
  'Niassa',
  'Cabo Delgado',
] as const

export function isProvince(value: unknown): value is (typeof PROVINCES)[number] {
  return PROVINCES.some((province) => province === value)
}

// Pasta e nome do ficheiro da foto no Cloudinary: uma foto por aluno (a nova substitui a antiga).
export const AVATAR_FOLDER = 'estuda-mz/avatares'

// Foto quadrada, centrada no rosto, leve e no melhor formato para o aparelho.
export function avatarUrl(url: string | null | undefined, size = 160) {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'res.cloudinary.com') return url
    return url.replace('/image/upload/', `/image/upload/c_fill,g_face,w_${size},h_${size},f_auto,q_auto/`)
  } catch {
    return null
  }
}

export type ProfileStep = { key: string; label: string; done: boolean }

// O que conta para a completude. O telefone é opcional e não conta.
export function profileSteps(input: {
  image: string | null
  nickname: string | null
  province: string | null
  school: string | null
  track: string | null
  institutionId: string | null
  targetCourse: string | null
}): ProfileStep[] {
  const steps: ProfileStep[] = [
    { key: 'foto', label: 'Foto', done: !!input.image },
    { key: 'nickname', label: '@nickname', done: !!input.nickname },
    { key: 'escola', label: 'Escola', done: !!input.province && !!input.school },
    { key: 'percurso', label: 'Percurso', done: !!input.track },
  ]
  if (input.track === 'admissao') {
    steps.push({ key: 'instituicao', label: 'Instituição', done: !!input.institutionId })
    steps.push({ key: 'curso', label: 'Curso alvo', done: !!input.targetCourse })
  }
  return steps
}
