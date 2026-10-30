// Regras de identidade partilhadas entre servidor e cliente (puras, sem acesso à base de dados).
// Decisões em docs/IDENTIDADE-ONBOARDING-RETENCAO.md (D1 a D9).

/** Idade mínima de conta. Decisão de produto (não é regra legal moçambicana). */
export const MIN_AGE = 13
/** Abaixo desta idade aplicam-se as predefinições de privacidade (ranking oculto, sem e-mails promocionais). */
export const MINOR_AGE = 18
export const MAX_AGE = 100

/** Versões dos documentos legais. Ao mudar o texto de /termos ou /privacidade, subir a versão: o aluno é convidado a aceitar de novo. */
export const TERMS_VERSION = '2026-10-22'
export const PRIVACY_VERSION = '2026-10-22'

export const TIME_ZONE = 'Africa/Maputo'

// ───────────── Datas (fuso de Maputo, CAT) ─────────────

export type CalendarDay = { year: number; month: number; day: number }

/** Dia civil em Maputo para um instante. */
export function maputoDay(now: Date = new Date()): CalendarDay {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0')
  return { year: get('year'), month: get('month'), day: get('day') }
}

export const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
export const daysInMonth = (year: number, month: number) => [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0

export const toIsoDate = (value: CalendarDay) => `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`

/** «2009-03-14» (ou data com hora) para dia civil; devolve null se não for uma data real. */
export function parseIsoDate(value: unknown): CalendarDay | null {
  const match = typeof value === 'string' ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

/** Idade completa em anos, contada no dia civil de `today`. */
export function ageOn(birth: CalendarDay, today: CalendarDay): number {
  let age = today.year - birth.year
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) age -= 1
  return age
}

export type BirthCheck =
  | { ok: true; birth: CalendarDay; age: number; minor: boolean }
  | { ok: false; code: 'invalid' | 'future' | 'too_old' | 'under_age'; message: string }

/** Valida a data de nascimento no servidor: real, não futura, até MAX_AGE anos, e pelo menos MIN_AGE. */
export function checkBirth(input: { year: unknown; month: unknown; day: unknown }, now: Date = new Date()): BirthCheck {
  const year = Number(input.year)
  const month = Number(input.month)
  const day = Number(input.day)
  if (![year, month, day].every(Number.isInteger) || year < 1900 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return { ok: false, code: 'invalid', message: 'Escolhe uma data de nascimento válida.' }
  }
  const birth = { year, month, day }
  const today = maputoDay(now)
  const age = ageOn(birth, today)
  if (age < 0) return { ok: false, code: 'future', message: 'A data de nascimento não pode estar no futuro.' }
  if (age > MAX_AGE) return { ok: false, code: 'too_old', message: 'Confirma o ano de nascimento.' }
  if (age < MIN_AGE) return { ok: false, code: 'under_age', message: `O Twisisa é para maiores de ${MIN_AGE} anos.` }
  return { ok: true, birth, age, minor: age < MINOR_AGE }
}

/** Hoje é o aniversário? Quem nasceu a 29/02 celebra a 28/02 nos anos não bissextos. */
export function isBirthday(birth: { month: number; day: number }, today: CalendarDay): boolean {
  if (birth.month === today.month && birth.day === today.day) return true
  return birth.month === 2 && birth.day === 29 && today.month === 2 && today.day === 28 && !isLeapYear(today.year)
}

// ───────────── Nome, e-mail, palavra-passe ─────────────

export function cleanName(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

export function validateName(value: unknown): string | null {
  const name = cleanName(value)
  if (name.length < 2 || name.length > 80) return 'O nome deve ter entre 2 e 80 caracteres.'
  if (/^[\d\s\p{P}]+$/u.test(name)) return 'Escreve o teu nome.'
  return null
}

export const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase()

export function validateEmail(value: unknown): string | null {
  const email = normalizeEmail(value)
  if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return 'Escreve um e-mail válido.'
  return null
}

const EMAIL_DOMAIN_FIXES: Record<string, string> = {
  'gmail.con': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.cm': 'gmail.com',
  'hotmail.con': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlook.con': 'outlook.com', 'outlok.com': 'outlook.com',
  'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com',
}

/** «ana@gmail.con» → «ana@gmail.com»; null se não houver erro conhecido. */
export function suggestEmail(value: unknown): string | null {
  const email = normalizeEmail(value)
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const fix = EMAIL_DOMAIN_FIXES[email.slice(at + 1)]
  return fix ? `${email.slice(0, at)}@${fix}` : null
}

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128

// Lista curta de senhas muito comuns (comparação sem maiúsculas). Não substitui um verificador completo.
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234', '123123123', '1q2w3e4r', '1qaz2wsx',
  'password', 'password1', 'password123', 'passw0rd', 'senha123', 'senha1234', 'minhasenha', 'palavrapasse', 'qwertyui', 'qwerty123', 'qwertyuiop', 'abcd1234', 'abc12345', 'abcdefgh', 'asdfghjk', 'iloveyou', 'letmein1', 'admin123', 'welcome1', 'twisisa123', 'twisisa1', 'mocambique', 'moçambique', 'maputo123', 'estudante', 'estudante1', 'estudante123',
])

export function validatePassword(value: unknown): string | null {
  const password = String(value ?? '')
  if (password.length < PASSWORD_MIN) return `A palavra-passe deve ter pelo menos ${PASSWORD_MIN} caracteres.`
  if (password.length > PASSWORD_MAX) return `A palavra-passe deve ter no máximo ${PASSWORD_MAX} caracteres.`
  if (COMMON_PASSWORDS.has(password.toLowerCase()) || /^(.)\1+$/.test(password)) return 'Essa palavra-passe é demasiado comum. Escolhe outra.'
  return null
}

/** 0 a 4, para a barra de força. Só orienta; a regra do servidor é validatePassword. */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0
  if (validatePassword(value)) return value.length >= PASSWORD_MIN ? 1 : value.length >= 4 ? 1 : 0
  let score = 2
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)) score += 1
  else if (/\d/.test(value) && /[A-Za-z]/.test(value) && value.length >= 10) score += 1
  return Math.min(score, 4) as 1 | 2 | 3 | 4
}

/** Nome provisório de quem cria conta só com e-mail: a parte antes do «@». O onboarding pede o nome verdadeiro. */
export function provisionalName(email: string): string {
  const local = normalizeEmail(email).split('@')[0].replace(/[._+-]+/g, ' ').trim()
  return (/\p{L}{2}/u.test(local) ? local : 'Estudante').slice(0, 80)
}

// ───────────── Meta diária ─────────────

export const DAILY_GOALS = [
  { value: 5, label: '5 questões', hint: 'cerca de 4 min' },
  { value: 10, label: '10 questões', hint: 'cerca de 8 min' },
  { value: 20, label: '20 questões', hint: 'cerca de 16 min' },
] as const

export const DEFAULT_DAILY_GOAL = 10
export const isDailyGoal = (value: unknown): value is (typeof DAILY_GOALS)[number]['value'] => DAILY_GOALS.some((goal) => goal.value === value)

// ───────────── Redireccionamento seguro ─────────────

/** Só caminhos internos («/aluno/ranking»). Qualquer outra coisa volta ao painel (evita redireccionamento aberto). */
export function safeNext(value: unknown, fallback = '/aluno'): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\') || /[\r\n]/.test(value) || value.length > 300) return fallback
  if (value.startsWith('/sign-in') || value.startsWith('/sign-up') || value.startsWith('/api/')) return fallback
  return value
}
