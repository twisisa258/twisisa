// Saudação da página /aluno: usa a hora de Maputo (CAT), datas moçambicanas e o percurso da conta.
// Só devolve texto; os emojis ficam aqui de propósito (só esta saudação os usa).
const TZ = 'Africa/Maputo'

type Part = 'madrugada' | 'manha' | 'tarde' | 'noite'

// Feriados nacionais de Moçambique (datas fixas; o Natal é o Dia da Família) e datas que interessam a estudantes.
// `{n}` é o primeiro nome.
const DATES: Record<string, string> = {
  '01-01': 'Feliz Ano Novo, {n} 🎆',
  '02-03': 'Feliz Dia dos Heróis, {n} 🎖️',
  '03-08': 'Feliz Dia da Mulher, {n} 💐',
  '04-07': 'Feliz Dia da Mulher Moçambicana, {n} 🌸',
  '05-01': 'Feliz Dia do Trabalhador, {n} 💪',
  '06-25': 'Feliz Dia da Independência, {n} 🎉',
  '09-07': 'Feliz Dia da Vitória, {n} ✌️',
  '09-25': 'Feliz Dia das Forças Armadas, {n} 🎖️',
  '10-04': 'Feliz Dia da Paz, {n} 🕊️',
  '10-05': 'Dia Mundial do Professor, {n} 🍎',
  '11-01': 'Feliz Dia da Juventude Africana, {n} ✨',
  '11-17': 'Feliz Dia do Estudante, {n} 🎓',
  '12-25': 'Feliz Dia da Família, {n} 🏡',
  '12-31': 'Boa passagem de ano, {n} 🥂',
}

const STREAK_MILESTONES = new Set([3, 7, 14, 30, 50, 100, 200, 365])

const BY_PART: Record<Part, string[]> = {
  madrugada: ['Ainda de pé, {n}? 🦉', 'Já é tarde, {n}. Descansa também 😴', 'Madrugada de estudo, {n} 🌙'],
  manha: ['Bom dia, {n} ☀️', 'Bom dia, {n} ☀️', 'Olá, {n} 👋'],
  tarde: ['Boa tarde, {n} 🌤️', 'Boa tarde, {n} 🌤️', 'Olá, {n} 👋'],
  noite: ['Boa noite, {n} 🌙', 'Boa noite, {n} 🌙', 'Olá, {n} 👋'],
}

function maputoParts(date: Date) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' })
  const get = (type: string) => f.formatToParts(date).find((p) => p.type === type)?.value ?? ''
  return { year: Number(get('year')), month: get('month'), day: get('day'), hour: Number(get('hour')), weekday: get('weekday') }
}

function partOf(hour: number): Part {
  if (hour < 5) return 'madrugada'
  if (hour < 12) return 'manha'
  if (hour < 18) return 'tarde'
  return 'noite'
}

// Escolha estável: o mesmo aluno vê a mesma frase durante a mesma parte do dia (não muda a cada recarregamento).
function pick<T>(items: T[], seed: string): T {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return items[h % items.length]
}

export function getGreeting(input: { name: string; userId: string; createdAt?: Date | string | null; streak?: number | null; now?: Date }): string {
  const now = input.now ?? new Date()
  const name = input.name.trim().split(/\s+/)[0] || 'estudante'
  const fill = (text: string) => text.replace('{n}', name)
  const t = maputoParts(now)
  const key = `${t.month}-${t.day}`
  const part = partOf(t.hour)
  const seed = `${input.userId}|${t.year}-${key}|${part}`

  const created = input.createdAt ? new Date(input.createdAt) : null
  const createdOk = created && !Number.isNaN(created.getTime()) ? created : null

  // 1. Conta nova (primeiras 48 horas).
  if (createdOk && now.getTime() - createdOk.getTime() < 48 * 60 * 60 * 1000) return fill('Boas-vindas, {n} 🎊')

  // 2. Feriado ou data especial.
  if (DATES[key]) return fill(DATES[key])

  // 3. Aniversário da conta.
  if (createdOk) {
    const c = maputoParts(createdOk)
    const years = t.year - c.year
    if (years >= 1 && c.month === t.month && c.day === t.day) return fill(`${years === 1 ? 'Um ano' : `${years} anos`} no Twisisa, {n} 🎂`)
  }

  // 4. Marcos da sequência de dias.
  const streak = input.streak ?? 0
  if (STREAK_MILESTONES.has(streak)) return fill(`${streak} dias seguidos, {n} 🔥`)

  // 5. Dia da semana.
  if (t.weekday === 'Mon' && part === 'manha') return fill('Boa semana, {n} 💪')
  if (t.weekday === 'Fri' && part !== 'madrugada') return fill('Boa sexta, {n} 🎉')
  if ((t.weekday === 'Sat' || t.weekday === 'Sun') && (part === 'manha' || part === 'tarde')) return fill('Bom fim de semana, {n} 🌿')

  // 6. Parte do dia.
  return fill(pick(BY_PART[part], seed))
}
