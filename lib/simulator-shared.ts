// Tipos e utilitários do Simulador partilhados entre servidor e cliente. Sem acesso à base de dados.
export type AttemptMode = 'pratica' | 'rapido' | 'revisao'
export const ATTEMPT_MODES: AttemptMode[] = ['pratica', 'rapido', 'revisao']
export const isAttemptMode = (value: unknown): value is AttemptMode => ATTEMPT_MODES.includes(value as AttemptMode)

export const ROUND_SIZE = 10
// Prática (exames anteriores): até 40 questões por variante.
export const PRACTICE_SIZE = 40
// Cada resposta certa vale entre 2 e 4 pontos (peso da questão); questões já vistas valem menos.
export const POINTS_MIN = 2
export const POINTS_MAX = 4
// Modo rápido: 1:30 por questão.
export const QUICK_SECONDS_PER_QUESTION = 90
// Limite duro da sessão no servidor: o relógio de cada questão é do ecrã; isto trava quem tente ganhar tempo.
export const QUICK_SERVER_SECONDS_PER_QUESTION = 110
export const TIME_GRACE_MS = 5000

export const MODE_META: Record<AttemptMode, { label: string; tagline: string; meta: string; cta: string; moduleKey: 'pratica' | 'modo-rapido' | 'revisar-erros' }> = {
  pratica: { label: 'Prática', tagline: 'Exames de anos anteriores, com correção a cada resposta', meta: `${PRACTICE_SIZE} questões · sem limite de tempo`, cta: 'Começar prática', moduleKey: 'pratica' },
  rapido: { label: 'Modo rápido', tagline: '1:30 por questão, para treinares o ritmo do exame', meta: `${ROUND_SIZE} questões · 1:30 cada`, cta: 'Começar modo rápido', moduleKey: 'modo-rapido' },
  revisao: { label: 'Revisar erros', tagline: 'Refaz o que erraste e fixa a matéria', meta: 'Só questões que já erraste', cta: 'Começar revisão', moduleKey: 'revisar-erros' },
}

export type PlayImage = { url: string; alt: string; width: number | null; height: number | null; caption: string | null }
export type PlayOption = { id: string; body: string | null; image: PlayImage | null }
export type PlayFeedback = { isCorrect: boolean; correctOptionId: string; explanation: string | null; images: PlayImage[]; points: number }
export type PlayItem = {
  position: number
  subject: string
  statement: string
  images: PlayImage[]
  options: PlayOption[]
  selectedOptionId: string | null
  feedback: PlayFeedback | null
}
export type PlayData = {
  id: string
  mode: AttemptMode
  total: number
  subject: string | null
  variant: string | null
  endsAt: number | null
  serverNow: number
  items: PlayItem[]
}

/** 90 → «1:30». */
export const clock = (totalSeconds: number) => {
  const s = Math.max(0, Math.ceil(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Rota e dados de cada modo na página explicativa. */
export const MODE_SLUGS: Record<string, AttemptMode> = { pratica: 'pratica', 'modo-rapido': 'rapido', 'revisar-erros': 'revisao' }
export const SLUG_BY_MODE: Record<AttemptMode, string> = { pratica: 'pratica', rapido: 'modo-rapido', revisao: 'revisar-erros' }

export const percent = (correct: number, total: number) => (total > 0 ? Math.round((correct / total) * 100) : 0)
/** 13.4 → «13,4». */
export const formatGrade = (grade: number) => (Number.isFinite(grade) ? grade.toFixed(1).replace('.', ',') : '0,0')
/** 2 → «2»; 2.5 → «2,5». */
export const formatPoints = (points: number) => (Number.isInteger(points) ? String(points) : points.toFixed(1).replace('.', ','))

export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s} s`
  return s === 0 ? `${m} min` : `${m} min ${s} s`
}

export function verdict(pct: number) {
  if (pct >= 80) return { title: 'Excelente!', text: 'Estás muito bem preparado nesta matéria.' }
  if (pct >= 60) return { title: 'Bom trabalho!', text: 'Estás no bom caminho. Revê os erros e sobe a nota.' }
  if (pct >= 40) return { title: 'Estás a avançar', text: 'Cada ronda ajuda. Revê o que falhaste e tenta de novo.' }
  return { title: 'Cada erro ensina', text: 'Começar é o mais difícil. Revê as respostas e repete: vais notar a diferença.' }
}

/** Imagem mais leve para ligações fracas: o Cloudinary entrega uma versão reduzida (largura máx. 900 px, formato automático). */
export function slimImage(url: string) {
  if (!url.includes('/upload/') || /\.svg(\?|$)/i.test(url) || /\/upload\/[^/]*(f_|w_|q_)/.test(url)) return url
  return url.replace('/upload/', '/upload/f_auto,q_auto,w_900/')
}
