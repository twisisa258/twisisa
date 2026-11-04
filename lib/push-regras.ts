// Regras do motor de notificações push. Puro (sem base de dados nem rede): decide QUAL mensagem enviar, ou nenhuma.
// Os números (intervalo, limite diário, horas de silêncio, cooldowns) vêm da tabela app_settings, chave «push»; estes são só os valores por defeito.

export type PushKind = 'desafio-prazo' | 'retomar' | 'materia-nova' | 'questoes-quentes' | 'voltar' | 'escolher-curso'

export type PushConfig = {
  minGapMinutes: number
  maxPerDay: number
  quietFromHour: number
  quietToHour: number
  deadlineTiers: number[]
  resumeAfterMinutes: number
  comebackAfterDays: number
  cooldownHours: Record<PushKind, number>
}

export const PUSH_DEFAULTS: PushConfig = {
  minGapMinutes: 30,
  maxPerDay: 6,
  quietFromHour: 22,
  quietToHour: 7,
  deadlineTiers: [3, 4, 8],
  resumeAfterMinutes: 120,
  comebackAfterDays: 3,
  cooldownHours: { 'desafio-prazo': 0, retomar: 12, 'materia-nova': 6, 'questoes-quentes': 8, voltar: 72, 'escolher-curso': 24 },
}

const num = (value: unknown, fallback: number, min: number, max: number) => (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback)

/** Junta o que está na base de dados aos valores por defeito, ignorando o que não faz sentido. */
export function mergeConfig(raw: unknown): PushConfig {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const cooldowns = (source.cooldownHours && typeof source.cooldownHours === 'object' ? source.cooldownHours : {}) as Record<string, unknown>
  const tiers = Array.isArray(source.deadlineTiers) ? source.deadlineTiers.filter((t): t is number => typeof t === 'number' && t > 0 && t <= 23) : []
  return {
    minGapMinutes: num(source.minGapMinutes, PUSH_DEFAULTS.minGapMinutes, 5, 1440),
    maxPerDay: num(source.maxPerDay, PUSH_DEFAULTS.maxPerDay, 1, 48),
    quietFromHour: num(source.quietFromHour, PUSH_DEFAULTS.quietFromHour, 0, 23),
    quietToHour: num(source.quietToHour, PUSH_DEFAULTS.quietToHour, 0, 23),
    deadlineTiers: tiers.length ? [...new Set(tiers)].sort((a, b) => a - b) : PUSH_DEFAULTS.deadlineTiers,
    resumeAfterMinutes: num(source.resumeAfterMinutes, PUSH_DEFAULTS.resumeAfterMinutes, 15, 2880),
    comebackAfterDays: num(source.comebackAfterDays, PUSH_DEFAULTS.comebackAfterDays, 1, 60),
    cooldownHours: Object.fromEntries((Object.keys(PUSH_DEFAULTS.cooldownHours) as PushKind[]).map((kind) => [kind, num(cooldowns[kind], PUSH_DEFAULTS.cooldownHours[kind], 0, 720)])) as Record<PushKind, number>,
  }
}

/** Data (AAAA-MM-DD) e minutos desde a meia-noite, hora de Maputo. */
export function maputoNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

export type PushContext = {
  now: { date: string; minutes: number }
  userSeed: string
  needsCourse: boolean
  goal: number
  answered: number
  todayMet: boolean
  streak: number
  daysSinceActive: number | null
  hot: number
  openAttempt: { id: string; answered: number; total: number; idleMinutes: number } | null
  newMaterials: { id: string; title: string; subject: string | null }[]
  history: { sentToday: number; minutesSinceLast: number | null; lastByKind: Partial<Record<PushKind, number>>; refs: string[] }
}

export type PushMessage = { kind: PushKind; refs: string[]; title: string; body: string; url: string }

function hash(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}
const variant = <T,>(ctx: PushContext, kind: string, options: T[]): T => options[hash(`${ctx.userSeed}|${ctx.now.date}|${kind}`) % options.length]
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function isQuiet(minutes: number, cfg: PushConfig) {
  const hour = minutes / 60
  return cfg.quietFromHour > cfg.quietToHour ? hour >= cfg.quietFromHour || hour < cfg.quietToHour : hour >= cfg.quietFromHour && hour < cfg.quietToHour
}

/** Escolhe no máximo uma mensagem. Prioridade: prazo do desafio > prática a meio > matéria nova > questões quentes > voltar. */
export function pickPush(ctx: PushContext, cfg: PushConfig): PushMessage | null {
  if (isQuiet(ctx.now.minutes, cfg)) return null
  const h = ctx.history
  if (h.sentToday >= cfg.maxPerDay) return null
  if (h.minutesSinceLast !== null && h.minutesSinceLast < cfg.minGapMinutes) return null
  const cooled = (kind: PushKind) => {
    const ago = h.lastByKind[kind]
    return ago === undefined || ago >= cfg.cooldownHours[kind] * 60
  }

  if (ctx.needsCourse) {
    if (!cooled('escolher-curso')) return null
    return { kind: 'escolher-curso', refs: [ctx.now.date], title: 'Escolhe o teu curso', body: variant(ctx, 'curso', ['Falta só isso para começares a praticar.', 'Diz-nos o curso e preparamos as disciplinas das tuas provas.']), url: '/aluno?curso=1' }
  }

  // 1. Prazo do desafio diário: um aviso por patamar de horas (ex.: faltam 8, 4 e 3 horas).
  if (ctx.goal > 0 && !ctx.todayMet) {
    const hoursLeft = (24 * 60 - ctx.now.minutes) / 60
    const tier = cfg.deadlineTiers.find((t) => hoursLeft <= t)
    if (tier !== undefined && hoursLeft > 0 && !h.refs.includes(`desafio-prazo:${ctx.now.date}:${tier}`)) {
      const left = Math.max(1, ctx.goal - ctx.answered)
      const hours = Math.max(1, Math.ceil(hoursLeft))
      const body = ctx.streak > 0
        ? `Faltam ${plural(left, 'questão', 'questões')} para não perderes a tua sequência de ${plural(ctx.streak, 'dia', 'dias')}.`
        : variant(ctx, 'prazo', [`Faltam ${plural(left, 'questão', 'questões')} para cumprires a meta de hoje.`, `Com ${plural(left, 'questão', 'questões')} cumpres o desafio de hoje.`])
      return { kind: 'desafio-prazo', refs: [`${ctx.now.date}:${tier}`], title: `Faltam ${hours} ${hours === 1 ? 'hora' : 'horas'} para fechar o teu desafio diário`, body, url: '/aluno/simulador' }
    }
  }

  // 2. Começou e não continuou.
  const open = ctx.openAttempt
  if (open && open.answered > 0 && open.answered < open.total && open.idleMinutes >= cfg.resumeAfterMinutes && open.idleMinutes < 48 * 60 && cooled('retomar') && !h.refs.includes(`retomar:${open.id}`)) {
    return { kind: 'retomar', refs: [open.id], title: 'Deixaste uma prática a meio', body: `Respondeste a ${open.answered} de ${open.total}. Faltam só ${open.total - open.answered}.`, url: `/aluno/simulador/sessao/${open.id}` }
  }

  // 3. Matéria nova nas disciplinas do aluno.
  if (ctx.newMaterials.length > 0 && cooled('materia-nova')) {
    const [first] = ctx.newMaterials
    const many = ctx.newMaterials.length > 1
    return {
      kind: 'materia-nova',
      refs: ctx.newMaterials.map((item) => item.id),
      title: many ? `${ctx.newMaterials.length} novos materiais no teu curso` : 'Nova matéria no teu curso',
      body: many ? `${first.title} e mais ${ctx.newMaterials.length - 1} já estão na Biblioteca.` : `${first.title}${first.subject ? ` · ${first.subject}` : ''} já está na Biblioteca.`,
      url: '/biblioteca',
    }
  }

  // 4. Questões quentes: erros para rever e guardadas para hoje.
  if (ctx.hot > 0 && cooled('questoes-quentes')) {
    const n = Math.min(10, ctx.hot)
    return { kind: 'questoes-quentes', refs: [ctx.now.date], title: `${plural(n, 'questão quente', 'questões quentes')} à tua espera`, body: variant(ctx, 'quentes', ['Erros para rever e questões que guardaste. Uns minutos chegam.', 'É o que mais te vai render. Dez minutos e ficas a ganhar.']), url: '/aluno/simulador' }
  }

  // 5. Há dias sem praticar.
  if (ctx.daysSinceActive !== null && ctx.daysSinceActive >= cfg.comebackAfterDays && cooled('voltar')) {
    return { kind: 'voltar', refs: [ctx.now.date], title: `Já não praticas há ${plural(ctx.daysSinceActive, 'dia', 'dias')}`, body: 'Dez questões chegam para voltar ao ritmo.', url: '/aluno/simulador' }
  }
  return null
}
