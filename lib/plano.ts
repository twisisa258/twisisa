// O plano pago. Um só sítio para o preço, as operadoras e as contas de datas, usado na landing, em /planos e em /aluno/plano.
export const PLANO = { nome: 'Twisisa Plus', precoMt: 197, diasPeriodo: 30 } as const

// Meios de pagamento locais. Os prefixos são os dos números de cada operadora (84/85 Vodacom, 86/87 Movitel, 82/83 Tmcel).
export const OPERADORAS = [
  { id: 'mpesa', nome: 'M-Pesa', prefixos: ['84', '85'] },
  { id: 'emola', nome: 'e-Mola', prefixos: ['86', '87'] },
  { id: 'mkesh', nome: 'mKesh', prefixos: ['82', '83'] },
] as const

export type OperadoraId = (typeof OPERADORAS)[number]['id']

/** Estados da subscrição que contam como pagos. */
export const STATUS_ATIVOS: readonly string[] = ['active', 'trialing']

export type EstadoPlano = 'gratuito' | 'ativo' | 'terminado'

/** gratuito: nunca teve plano · ativo: pago e dentro do período · terminado: teve plano que já não vale. */
export function estadoDoPlano(status: string | null | undefined, fim?: Date | null, agora: Date = new Date()): EstadoPlano {
  if (!status) return 'gratuito'
  if (STATUS_ATIVOS.includes(status) && (!fim || fim.getTime() > agora.getTime())) return 'ativo'
  return 'terminado'
}

/** Só os 9 dígitos do número moçambicano: aceita espaços, +258 e 00258. */
export function soDigitos(texto: string): string {
  let digitos = texto.replace(/\D/g, '')
  if (digitos.startsWith('00258')) digitos = digitos.slice(5)
  else if (digitos.startsWith('258') && digitos.length > 9) digitos = digitos.slice(3)
  return digitos.slice(0, 9)
}

/** 84 000 0000 */
export function formatarNumero(digitos: string): string {
  const d = soDigitos(digitos)
  return d.slice(0, 2) + (d.length > 2 ? ` ${d.slice(2, 5)}` : '') + (d.length > 5 ? ` ${d.slice(5)}` : '')
}

export function operadoraDoNumero(numero: string): OperadoraId | null {
  const prefixo = soDigitos(numero).slice(0, 2)
  if (prefixo.length < 2) return null
  return OPERADORAS.find((operadora) => (operadora.prefixos as readonly string[]).includes(prefixo))?.id ?? null
}

export function operadoraPorId(id: string | null | undefined) {
  return OPERADORAS.find((operadora) => operadora.id === id) ?? null
}

/** Dias que faltam para o fim (arredonda para cima; 0 se já acabou; null sem data de fim). */
export function diasRestantes(fim: Date | null | undefined, agora: Date = new Date()): number | null {
  if (!fim) return null
  const ms = fim.getTime() - agora.getTime()
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

/** Parte do período mensal que ainda falta (0 a 1), para o anel. */
export function progressoDoPeriodo(dias: number): number {
  return Math.min(1, Math.max(0, dias / PLANO.diasPeriodo))
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function partes(data: Date) {
  const formato = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Maputo', day: '2-digit', month: '2-digit', year: 'numeric' })
  const valor = (tipo: string) => formato.formatToParts(data).find((parte) => parte.type === tipo)?.value ?? ''
  return { dia: valor('day'), mes: Number(valor('month')), ano: valor('year') }
}

/** 10/12/2026 (hora de Maputo) */
export function dataCurta(data: Date): string {
  const { dia, mes, ano } = partes(data)
  return `${dia}/${String(mes).padStart(2, '0')}/${ano}`
}

/** 10 dez 2026 */
export function dataLonga(data: Date): string {
  const { dia, mes, ano } = partes(data)
  return `${Number(dia)} ${MESES[mes - 1]} ${ano}`
}

/** nov 2026 */
export function mesAno(data: Date): string {
  const { mes, ano } = partes(data)
  return `${MESES[mes - 1]} ${ano}`
}
