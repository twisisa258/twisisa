#!/usr/bin/env bash
# Plano Plus: página /aluno/plano (cartão de membro, estado, escolha do meio de pagamento), selo Plus (cabeçalho, menu, cartão),
# logos das operadoras (provisórios) e ligação a partir do Perfil. O botão «Pagar» fica desativado: falta o serviço de pagamento.
# Corre na raiz do projeto:  mv aplicar-plano.sh ~/twisisa && cd ~/twisisa && bash aplicar-plano.sh
set -e
for f in components/student-feature-shell.tsx components/shell/app-header.tsx components/shell/aluno-aside.tsx components/student-mobile-sidebar.tsx components/student-nav.tsx lib/subscription.ts lib/plano.ts app/globals.css "app/aluno/(painel)/page.tsx" app/aluno/perfil/page.tsx State.md DESIGN.md; do
  [ -f "$f" ] || { echo "Falta $f. Corre este script na raiz do projeto (~/twisisa)."; exit 1; }
done

mkdir -p components/plano app/aluno/plano tests

cat > "lib/plano.ts" <<'TWISISA_PL8_EOF'
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
TWISISA_PL8_EOF

cat > "lib/subscription.ts" <<'TWISISA_PL8_EOF'
import { eq } from 'drizzle-orm'
import { cache } from 'react'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'
import { STATUS_ATIVOS } from '@/lib/plano'

export async function getSubscription(userId: string) {
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1)
  return row
}

/** Ativa se o estado for ativo e o período pago ainda não acabou (sem data de fim, vale o estado). */
export function isSubscriptionActive(status: string | undefined, periodEnd?: Date | null) {
  if (!status || !STATUS_ATIVOS.includes(status)) return false
  return !periodEnd || periodEnd.getTime() > Date.now()
}

/** Tem Plus ativo? Uma consulta por pedido (várias partes da mesma página partilham a resposta). Se a base falhar, segue sem selo. */
export const hasPlus = cache(async (userId: string): Promise<boolean> => {
  const row = await getSubscription(userId).catch(() => undefined)
  return isSubscriptionActive(row?.status, row?.currentPeriodEnd)
})
TWISISA_PL8_EOF

cat > "tests/plano.test.ts" <<'TWISISA_PL8_EOF'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PLANO, dataCurta, dataLonga, diasRestantes, estadoDoPlano, formatarNumero, mesAno, operadoraDoNumero, operadoraPorId, progressoDoPeriodo, soDigitos } from '../lib/plano'

const dia = (n: number) => new Date(Date.UTC(2026, 10, 10) + n * 86_400_000)

test('estado do plano: gratuito, ativo e terminado', () => {
  const agora = dia(0)
  assert.equal(estadoDoPlano(undefined, null, agora), 'gratuito')
  assert.equal(estadoDoPlano('active', dia(5), agora), 'ativo')
  assert.equal(estadoDoPlano('trialing', null, agora), 'ativo')
  assert.equal(estadoDoPlano('active', dia(-1), agora), 'terminado')
  assert.equal(estadoDoPlano('canceled', dia(5), agora), 'terminado')
})

test('número: tira +258, espaços e limita a 9 dígitos', () => {
  assert.equal(soDigitos('+258 84 000 0000'), '840000000')
  assert.equal(soDigitos('00258840000000'), '840000000')
  assert.equal(soDigitos('84 000 00001234'), '840000000')
  assert.equal(formatarNumero('840000000'), '84 000 0000')
  assert.equal(formatarNumero('8'), '8')
  assert.equal(formatarNumero('84000'), '84 000')
})

test('operadora pelo prefixo', () => {
  assert.equal(operadoraDoNumero('84 123'), 'mpesa')
  assert.equal(operadoraDoNumero('85'), 'mpesa')
  assert.equal(operadoraDoNumero('+258 86 111 2222'), 'emola')
  assert.equal(operadoraDoNumero('87'), 'emola')
  assert.equal(operadoraDoNumero('82'), 'mkesh')
  assert.equal(operadoraDoNumero('83'), 'mkesh')
  assert.equal(operadoraDoNumero('8'), null)
  assert.equal(operadoraDoNumero('81'), null)
  assert.equal(operadoraPorId('mpesa')?.nome, 'M-Pesa')
  assert.equal(operadoraPorId('outra'), null)
  assert.equal(operadoraPorId(null), null)
})

test('dias restantes arredondam para cima e nunca ficam negativos', () => {
  const agora = dia(0)
  assert.equal(diasRestantes(null, agora), null)
  assert.equal(diasRestantes(new Date(agora.getTime() + 3_600_000), agora), 1)
  assert.equal(diasRestantes(dia(19), agora), 19)
  assert.equal(diasRestantes(dia(-2), agora), 0)
  assert.equal(progressoDoPeriodo(PLANO.diasPeriodo * 2), 1)
  assert.equal(progressoDoPeriodo(15), 0.5)
  assert.equal(progressoDoPeriodo(-3), 0)
})

test('datas na hora de Maputo', () => {
  const d = new Date('2026-12-10T10:00:00Z')
  assert.equal(dataCurta(d), '10/12/2026')
  assert.equal(dataLonga(d), '10 dez 2026')
  assert.equal(mesAno(d), 'dez 2026')
  // 23:30 UTC já é o dia seguinte em Maputo (UTC+2)
  assert.equal(dataCurta(new Date('2026-12-31T23:30:00Z')), '01/01/2027')
})
TWISISA_PL8_EOF

cat > "components/plano/selo-plus.tsx" <<'TWISISA_PL8_EOF'
import { cn } from '@/lib/utils'

// O selo de quem tem o Twisisa Plus ativo: círculo ondulado em verde-claro com um visto. É o ÚNICO sítio onde o selo é desenhado;
// aparece ao lado do nome ou da foto (cabeçalho, menu lateral, cartão, página do plano) e só para quem tem Plus ativo.
// A cor vem de `--selo` e `--selo-visto` (app/globals.css, secção «twisisa-plano-8»), por isso muda sozinha no modo escuro.
// `decorativo`: quando o texto ao lado já diz «Plus», o leitor de ecrã ignora o selo.
const FORMA =
  'M23.5 12.0L23.3 12.7L22.8 13.4L22.1 14.0L21.4 14.5L20.8 15.0L20.5 15.5L20.3 16.1L20.4 16.9L20.6 17.7L20.6 18.6L20.5 19.4L20.1 20.1L19.4 20.5L18.6 20.6L17.7 20.6L16.9 20.4L16.1 20.3L15.5 20.5L15.0 20.8L14.5 21.4L14.0 22.1L13.4 22.8L12.7 23.3L12.0 23.5L11.3 23.3L10.6 22.8L10.0 22.1L9.5 21.4L9.0 20.8L8.5 20.5L7.9 20.3L7.1 20.4L6.3 20.6L5.4 20.6L4.6 20.5L3.9 20.1L3.5 19.4L3.4 18.6L3.4 17.7L3.6 16.9L3.7 16.1L3.5 15.5L3.2 15.0L2.6 14.5L1.9 14.0L1.2 13.4L0.7 12.7L0.5 12.0L0.7 11.3L1.2 10.6L1.9 10.0L2.6 9.5L3.2 9.0L3.5 8.5L3.7 7.9L3.6 7.1L3.4 6.3L3.4 5.4L3.5 4.6L3.9 3.9L4.6 3.5L5.4 3.4L6.3 3.4L7.1 3.6L7.9 3.7L8.5 3.5L9.0 3.2L9.5 2.6L10.0 1.9L10.6 1.2L11.3 0.7L12.0 0.5L12.7 0.7L13.4 1.2L14.0 1.9L14.5 2.6L15.0 3.2L15.5 3.5L16.1 3.7L16.9 3.6L17.7 3.4L18.6 3.4L19.4 3.5L20.1 3.9L20.5 4.6L20.6 5.4L20.6 6.3L20.4 7.1L20.3 7.9L20.5 8.5L20.8 9.0L21.4 9.5L22.1 10.0L22.8 10.6L23.3 11.3Z'

export function SeloPlus({ className, decorativo = false }: { className?: string; decorativo?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('selo-plus', className)} {...(decorativo ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Assinante Plus' })}>
      <path d={FORMA} className="selo-plus-forma" />
      <path d="M7.6 12.5l3 3 5.9-6.4" className="selo-plus-visto" />
    </svg>
  )
}
TWISISA_PL8_EOF

cat > "components/plano/operadoras.tsx" <<'TWISISA_PL8_EOF'
import { operadoraPorId, type OperadoraId } from '@/lib/plano'

// Logos das operadoras (M-Pesa, e-Mola, mKesh). Um só sítio.
// PROVISÓRIOS: o nome em letras, na cor de cada operadora. Para pôr os logos oficiais, guardar os SVG em `public/operadoras/`
// (mpesa.svg, emola.svg, mkesh.svg) e trocar o conteúdo de `OperadoraLogo` por <img src={`/operadoras/${id}.svg`} alt={nome} />.
const ROTULO: Record<OperadoraId, string> = { mpesa: 'M-PESA', emola: 'e-Mola', mkesh: 'mKesh' }

export function OperadoraLogo({ id, tamanho = 'm' }: { id: OperadoraId; tamanho?: 'p' | 'm' | 'g' }) {
  const nome = operadoraPorId(id)?.nome ?? id
  return (
    <span className={`op-logo op-${id} op-${tamanho}`} role="img" aria-label={nome}>
      {ROTULO[id]}
    </span>
  )
}

/** Logo da operadora guardada na subscrição (`provider`), ou nada se for um valor que não conhecemos. */
export function OperadoraDaSubscricao({ provider, tamanho = 'p' }: { provider: string | null | undefined; tamanho?: 'p' | 'm' | 'g' }) {
  const operadora = operadoraPorId(provider)
  return operadora ? <OperadoraLogo id={operadora.id} tamanho={tamanho} /> : null
}
TWISISA_PL8_EOF

cat > "components/plano/inclinar.tsx" <<'TWISISA_PL8_EOF'
'use client'

import { useRef } from 'react'

// Inclinação suave do cartão Plus a seguir o dedo ou o rato, com um brilho. Só mexe em variáveis CSS (sem re-desenhar o React).
// Quem prefere menos movimento não vê nada (o CSS também desliga a transição).
export function Inclinar({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  function mover(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const caixa = el.getBoundingClientRect()
    const x = (event.clientX - caixa.left) / caixa.width
    const y = (event.clientY - caixa.top) / caixa.height
    el.style.setProperty('--ry', `${((x - 0.5) * 10).toFixed(1)}deg`)
    el.style.setProperty('--rx', `${((0.5 - y) * 8).toFixed(1)}deg`)
    el.style.setProperty('--mx', `${(x * 100).toFixed(0)}%`)
    el.style.setProperty('--my', `${(y * 100).toFixed(0)}%`)
  }

  function largar() {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--rx', '0deg')
  }

  return (
    <div ref={ref} className="pc-pal" onPointerMove={mover} onPointerLeave={largar} onPointerCancel={largar}>
      {children}
    </div>
  )
}
TWISISA_PL8_EOF

cat > "components/plano/cartao-plus.tsx" <<'TWISISA_PL8_EOF'
import { Lock } from 'lucide-react'
import { dataCurta, mesAno } from '@/lib/plano'
import { Inclinar } from '@/components/plano/inclinar'
import { SeloPlus } from '@/components/plano/selo-plus'

// O cartão de membro Plus. Só mostra dados que existem: o nome da conta, o mês em que começou e a data em que acaba o período pago.
// `bloqueado`: quem não tem Plus vê o cartão desfocado com um cadeado (a curiosidade que convida a subscrever).
export function CartaoPlus({ nome, desde, ate, bloqueado = false }: { nome: string; desde?: Date | null; ate?: Date | null; bloqueado?: boolean }) {
  return (
    <Inclinar>
      <article className={bloqueado ? 'pc pc-bloq' : 'pc'} aria-label={bloqueado ? 'Cartão Twisisa Plus bloqueado' : 'Cartão Twisisa Plus'}>
        <SeloPlus decorativo className="pc-agua" />
        <div className="pc-topo">
          <span className="pc-logo"><i aria-hidden="true" />Twisisa</span>
          <span className="pc-plus">PLUS</span>
        </div>
        <span className="pc-chip" aria-hidden="true" />
        <div className="pc-pe">
          <div className="pc-nome">
            <small>{desde ? `Membro desde ${mesAno(desde)}` : 'Membro'}</small>
            <b><span>{nome}</span>{!bloqueado && <SeloPlus className="pc-selo" />}</b>
          </div>
          <div className="pc-val">
            <small>Válido até</small>
            <span>{ate ? dataCurta(ate) : '—'}</span>
          </div>
        </div>
        {bloqueado && (
          <div className="pc-tranca">
            <Lock size={28} aria-hidden="true" />
            <b>O teu cartão Plus</b>
            <span>Desbloqueia ao subscrever</span>
          </div>
        )}
      </article>
    </Inclinar>
  )
}
TWISISA_PL8_EOF

cat > "components/plano/pagar-form.tsx" <<'TWISISA_PL8_EOF'
'use client'

import { useState } from 'react'
import { OperadoraLogo } from '@/components/plano/operadoras'
import { OPERADORAS, PLANO, formatarNumero, operadoraDoNumero, operadoraPorId, soDigitos, type OperadoraId } from '@/lib/plano'

// Escolha do meio de pagamento e do número. O operador é reconhecido pelo prefixo e escolhe-se sozinho.
// O botão fica desativado até existir o serviço que faz o pedido no telemóvel (ver State.md): nada finge cobrar.
export function PagarForm({ titulo = 'Pagar com' }: { titulo?: string }) {
  const [operadora, setOperadora] = useState<OperadoraId>('mpesa')
  const [digitos, setDigitos] = useState('')
  const detetada = operadoraDoNumero(digitos)

  function escrever(texto: string) {
    const novos = soDigitos(texto)
    setDigitos(novos)
    const nova = operadoraDoNumero(novos)
    if (nova) setOperadora(nova)
  }

  const aviso =
    digitos.length >= 2 && !detetada
      ? 'Este número não é M-Pesa, e-Mola nem mKesh.'
      : detetada && detetada !== operadora
        ? `Este número é ${operadoraPorId(detetada)?.nome}.`
        : detetada
          ? `Número ${operadoraPorId(detetada)?.nome}.`
          : ''

  return (
    <div className="pl-caixa">
      <fieldset className="pl-campo">
        <legend>{titulo}</legend>
        <div className="pl-meios">
          {OPERADORAS.map((item) => (
            <label key={item.id} className="pl-meio">
              <input type="radio" name="meio" value={item.id} checked={operadora === item.id} onChange={() => setOperadora(item.id)} />
              <OperadoraLogo id={item.id} tamanho="g" />
              <small>{item.prefixos.join(' · ')}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="pl-campo">
        <label htmlFor="pl-numero">Número</label>
        <div className="pl-tel">
          <span aria-hidden="true">+258</span>
          <input id="pl-numero" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={11} placeholder="84 000 0000" value={formatarNumero(digitos)} onChange={(event) => escrever(event.target.value)} aria-describedby="pl-aviso" />
        </div>
        <p id="pl-aviso" className="pl-aviso" aria-live="polite">{aviso}</p>
      </div>

      <button type="button" className="btn btn-primario w-full" disabled>Pagar {PLANO.precoMt} MT</button>
      <p className="pl-nota">Pagamento por meios locais disponível em breve.</p>
    </div>
  )
}
TWISISA_PL8_EOF

cat > "app/aluno/plano/page.tsx" <<'TWISISA_PL8_EOF'
import { Check, CreditCard } from 'lucide-react'
import { CartaoPlus } from '@/components/plano/cartao-plus'
import { OperadoraDaSubscricao } from '@/components/plano/operadoras'
import { PagarForm } from '@/components/plano/pagar-form'
import { SeloPlus } from '@/components/plano/selo-plus'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { PLANO, dataLonga, diasRestantes, estadoDoPlano, operadoraPorId, progressoDoPeriodo } from '@/lib/plano'
import { requireStudent } from '@/lib/require-student'
import { getSubscription } from '@/lib/subscription'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Plano' }

// Linhas curtas: cada uma cabe numa linha no telemóvel (regra de DESIGN.md).
const INCLUI = ['Simulados e desafios premium', 'Materiais avançados', 'Histórico de progresso', 'Selo Plus junto à tua foto'] as const

export default async function PlanoPage() {
  const session = await requireStudent('/aluno/plano')
  const firstName = session.user.name.split(' ')[0]
  const subscription = await getSubscription(session.user.id).catch((error: unknown) => {
    console.error('[PLANO]', error)
    return null
  })

  if (subscription === null) {
    return (
      <StudentFeatureShell firstName={firstName} eyebrow="Perfil" title="Plano" icon={CreditCard} backHref="/aluno/perfil" backLabel="Voltar ao perfil">
        <div className="max-w-xl rounded-2xl border border-linha bg-white p-6">
          <p className="text-[15px] font-medium">Não foi possível carregar o teu plano</p>
          <p className="mt-1 text-sm text-texto-2">Tenta outra vez daqui a pouco.</p>
        </div>
      </StudentFeatureShell>
    )
  }

  const fim = subscription?.currentPeriodEnd ?? null
  const estado = estadoDoPlano(subscription?.status, fim)
  const dias = estado === 'ativo' ? diasRestantes(fim) : null

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Perfil" title="Plano" icon={CreditCard} backHref="/aluno/perfil" backLabel="Voltar ao perfil">
      <div className="flex max-w-xl flex-col gap-4">
        {estado === 'ativo' ? (
          <>
            <CartaoPlus nome={session.user.name} desde={subscription?.createdAt} ate={fim} />

            <section className="pl-caixa" aria-label="Estado do plano">
              <div className="pl-estado">
                <div className="min-w-0">
                  <span className="chip bg-sucesso-suave text-sucesso-texto">Ativo</span>
                  <p className="pl-titulo">{PLANO.nome}</p>
                  <p className="pl-apoio">{fim ? `Válido até ${dataLonga(fim)}` : 'Sem data de fim'}</p>
                  {operadoraPorId(subscription?.provider) && (
                    <p className="pl-apoio">Pago com <OperadoraDaSubscricao provider={subscription?.provider} /></p>
                  )}
                </div>
                {dias !== null && (
                  <div className="pl-anel" style={{ ['--p' as string]: Math.round(progressoDoPeriodo(dias) * 100) }} role="img" aria-label={`${dias} dias restantes`}>
                    <i>{dias}d</i>
                  </div>
                )}
              </div>
            </section>

            <section className="pl-caixa pl-selo-caixa" aria-label="Selo Plus">
              <SeloPlus className="pl-selo-g" decorativo />
              <div className="min-w-0">
                <p className="pl-titulo">Selo Plus</p>
                <p className="pl-apoio">Aparece junto à tua foto.</p>
              </div>
            </section>
          </>
        ) : (
          <>
            <CartaoPlus nome={session.user.name} bloqueado />

            {estado === 'terminado' ? (
              <section className="pl-caixa" aria-label="Estado do plano">
                <span className="chip bg-superficie-2 text-texto-2">Terminou</span>
                <p className="pl-titulo">{fim ? `O teu Plus terminou a ${dataLonga(fim)}` : 'O teu Plus terminou'}</p>
                <p className="pl-apoio">Renova para voltares a ter o selo.</p>
              </section>
            ) : (
              <section className="pl-caixa" aria-label="Plano Plus">
                <span className="chip bg-superficie-2 text-texto-2">{PLANO.nome}</span>
                <p className="pl-preco">{PLANO.precoMt}<span>MT / mês</span></p>
                <ul className="pl-lista">
                  {INCLUI.map((texto) => (
                    <li key={texto}><Check size={17} strokeWidth={2.5} aria-hidden /><span>{texto}</span></li>
                  ))}
                </ul>
              </section>
            )}

            <PagarForm titulo={estado === 'terminado' ? 'Renovar com' : 'Pagar com'} />
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
TWISISA_PL8_EOF

# Ligações ao que já existe (menu, cabeçalho, painel, perfil) e registo no State.md e DESIGN.md.
node - <<'TWISISA_PL8_NODE'
const fs = require('fs')
function patch(file, steps) {
  let text = fs.readFileSync(file, 'utf8')
  for (const [from, to, done] of steps) {
    if (text.includes(done)) continue
    if (!text.includes(from)) { console.error(`Não encontrei o trecho esperado em ${file}:\n${from}\nO ficheiro mudou desde o zip; diz-me e ajusto.`); process.exit(1) }
    text = text.replace(from, to)
  }
  fs.writeFileSync(file, text)
}

// Menu: a página do plano fica dentro de «Eu» (continua a aparecer como página atual).
patch('components/student-nav.tsx', [
  ["type Item = { href: string; label: string; icon: typeof BookOpen; exact?: boolean }", "type Item = { href: string; label: string; icon: typeof BookOpen; exact?: boolean; also?: readonly string[] }", 'also?: readonly string[]'],
  ["{ href: '/aluno/perfil', label: 'Eu', icon: UserRound },", "{ href: '/aluno/perfil', label: 'Eu', icon: UserRound, also: ['/aluno/plano'] },", "also: ['/aluno/plano']"],
  ["  return pathname === item.href || pathname.startsWith(`${item.href}/`)", "  return pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.also ?? []).some((extra) => pathname === extra || pathname.startsWith(`${extra}/`))", 'item.also ??'],
])

// O selo chega a toda a moldura do aluno: sabe-se uma vez por pedido se há Plus ativo.
patch('components/student-feature-shell.tsx', [
  ["import { auth } from '@/lib/auth'", "import { auth } from '@/lib/auth'\nimport { hasPlus } from '@/lib/subscription'", "import { hasPlus }"],
  ["  const image = session?.user.image ?? null\n", "  const image = session?.user.image ?? null\n  const plus = session ? await hasPlus(session.user.id) : false\n", 'const plus = session'],
  ["<AlunoAside firstName={firstName} image={image} />", "<AlunoAside firstName={firstName} image={image} plus={plus} />", 'image={image} plus={plus}'],
  ["<AppHeader aluno={{ firstName, image }} />", "<AppHeader aluno={{ firstName, image, plus }} />", '{{ firstName, image, plus }}'],
])
patch('app/aluno/(painel)/page.tsx', [
  ["import { AlunoAside } from '@/components/shell/aluno-aside'", "import { AlunoAside } from '@/components/shell/aluno-aside'\nimport { hasPlus } from '@/lib/subscription'", "import { hasPlus }"],
  ["  const firstName = session.user.name.split(' ')[0]\n", "  const firstName = session.user.name.split(' ')[0]\n  const plus = await hasPlus(session.user.id)\n", 'const plus = await hasPlus'],
  ["<AlunoAside firstName={firstName} image={session.user.image ?? null} />", "<AlunoAside firstName={firstName} image={session.user.image ?? null} plus={plus} />", 'image={session.user.image ?? null} plus={plus}'],
  ["<AppHeader aluno={{ firstName, image: session.user.image ?? null }}", "<AppHeader aluno={{ firstName, image: session.user.image ?? null, plus }}", 'image: session.user.image ?? null, plus }'],
])
patch('components/shell/app-header.tsx', [
  ["import { Avatar } from '@/components/aluno/avatar'", "import { Avatar } from '@/components/aluno/avatar'\nimport { SeloPlus } from '@/components/plano/selo-plus'", "import { SeloPlus }"],
  ["type Aluno = { firstName: string; image: string | null }", "type Aluno = { firstName: string; image: string | null; plus?: boolean }", 'plus?: boolean'],
  ['<Link href="/aluno/perfil" className="sh-av" aria-label="O meu perfil"><Avatar name={aluno.firstName} image={aluno.image} size={32} /></Link>', '<Link href="/aluno/perfil" className="sh-av" aria-label={aluno.plus ? \'O meu perfil, assinante Plus\' : \'O meu perfil\'}>\n          <Avatar name={aluno.firstName} image={aluno.image} size={32} />\n          {aluno.plus && <SeloPlus decorativo className="sh-selo" />}\n        </Link>', 'className="sh-selo"'],
  ["<StudentMobileSidebar firstName={aluno.firstName} image={aluno.image} open={open}", "<StudentMobileSidebar firstName={aluno.firstName} image={aluno.image} plus={aluno.plus} open={open}", 'plus={aluno.plus} open={open}'],
])
patch('components/shell/aluno-aside.tsx', [
  ["import { Avatar } from '@/components/aluno/avatar'", "import { Avatar } from '@/components/aluno/avatar'\nimport { SeloPlus } from '@/components/plano/selo-plus'", "import { SeloPlus }"],
  ["export function AlunoAside({ firstName, image = null }: { firstName: string; image?: string | null }) {", "export function AlunoAside({ firstName, image = null, plus = false }: { firstName: string; image?: string | null; plus?: boolean }) {", 'plus = false'],
  ["          <span>{firstName}</span>\n        </span>", "          <span>{firstName}</span>\n          {plus && <SeloPlus />}\n        </span>", '{plus && <SeloPlus />}'],
])
patch('components/student-mobile-sidebar.tsx', [
  ["import { Avatar } from '@/components/aluno/avatar'", "import { Avatar } from '@/components/aluno/avatar'\nimport { SeloPlus } from '@/components/plano/selo-plus'", "import { SeloPlus }"],
  ["export function StudentMobileSidebar({ firstName, image = null, open, onClose }: { firstName: string; image?: string | null; open: boolean; onClose: () => void }) {", "export function StudentMobileSidebar({ firstName, image = null, plus = false, open, onClose }: { firstName: string; image?: string | null; plus?: boolean; open: boolean; onClose: () => void }) {", 'plus = false'],
  ["            <span>{firstName}</span>\n          </Link>", "            <span>{firstName}</span>\n            {plus && <SeloPlus />}\n          </Link>", '{plus && <SeloPlus />}'],
])

// Perfil: o «Plano» leva à nova página.
patch('app/aluno/perfil/page.tsx', [
  ['<Link href="/planos" className={linkButton}><BookOpen className="mr-2 size-4" aria-hidden="true" />{plus ? \'Ver o meu plano\' : \'Ver planos\'}</Link>', '<Link href="/aluno/plano" className={linkButton}><BookOpen className="mr-2 size-4" aria-hidden="true" />{plus ? \'Ver o meu plano\' : \'Ver o plano Plus\'}</Link>', 'href="/aluno/plano"'],
])

// Registo no projecto (State.md e DESIGN.md).
patch('State.md', [
  ["| `/planos` | FEITO |", "| `/aluno/plano` | FEITO, FALTA TESTE | Cartão Plus (nome, mês de início e fim do período, só dados reais), estado (ativo, terminou, gratuito), selo Plus, escolha do meio (M-Pesa, e-Mola, mKesh) e número com o operador reconhecido pelo prefixo. O botão «Pagar» está desativado: falta o serviço que faz o pedido no telemóvel. Ativo = linha em `subscriptions` com `status` ativo e `current_period_end` no futuro. |\n| `/planos` | FEITO |", '| `/aluno/plano` |'],
  ["## Pendentes, por prioridade", "## Plano Plus (10/11/2026), FEITO, FALTA TESTE\n- **Selo Plus** (`components/plano/selo-plus.tsx`, cores `--selo` e `--selo-visto`): só para quem tem Plus ativo (`hasPlus` em `lib/subscription.ts`, uma consulta por pedido). Aparece na foto do cabeçalho, no menu lateral e na gaveta, no cartão e em `/aluno/plano`. Falta: ranking e perfil público (exige uma marca visível para os outros alunos) e o interruptor «mostrar o selo» (precisa de uma coluna nova).\n- **Logos das operadoras** em `components/plano/operadoras.tsx`: PROVISÓRIOS (nome em letras, cor da operadora). Trocar pelos SVG oficiais em `public/operadoras/`.\n- **Pagamento: NÃO FEITO.** Falta escolher o serviço que faz o pedido no telemóvel (M-Pesa, e-Mola, mKesh) e uma acção de servidor que crie/confirme o pagamento e escreva em `subscriptions` (`status`, `provider`, `reference`, `current_period_end`). Quando existir, criar a tabela de pagamentos (histórico com data, meio, referência e estado): hoje não há quem escreva nela, por isso não foi criada.\n- Os benefícios (simulados e desafios premium, materiais avançados, histórico) continuam por reservar a quem paga; por isso a página não os mostra como «desbloqueados».\n- Para ver o estado ativo antes do pagamento existir: `INSERT INTO subscriptions (user_id, product_id, status, provider, reference, current_period_end) VALUES ('<id do utilizador>', 'plus', 'active', 'mpesa', 'TESTE', now() + interval '30 days') ON CONFLICT (user_id) DO UPDATE SET status = 'active', provider = 'mpesa', current_period_end = now() + interval '30 days', updated_at = now();` e, para voltar ao gratuito, `DELETE FROM subscriptions WHERE user_id = '<id>';`.\n\n## Pendentes, por prioridade", '## Plano Plus (10/11/2026)'],
])
const design = fs.readFileSync('DESIGN.md', 'utf8')
if (!design.includes('## Selo Plus')) {
  fs.writeFileSync('DESIGN.md', design.replace(/\s*$/, '\n') + "\n## Selo Plus e cartão de membro\n- Selo Plus: círculo ondulado em verde-claro com visto (`--selo`, `--selo-visto`), desenhado só por `components/plano/selo-plus.tsx`. É uma marca de identidade, não um botão: não usa a cor da marca. Só aparece com Plus ativo, ao lado da foto ou do nome.\n- Cartão Plus (`components/plano/cartao-plus.tsx`): só mostra dados reais (nome, mês de início, fim do período). Sem número de membro inventado. Sem sombra exterior (só um brilho interior).\n- Logos das operadoras num só sítio (`components/plano/operadoras.tsx`).\n")
}
TWISISA_PL8_NODE

# Estilos (acrescentados ao fim)
if ! grep -q "twisisa-plano-8" app/globals.css; then
cat >> app/globals.css <<'TWISISA_PL8_EOF'

/* [twisisa-plano-8] Plano Plus: selo, cartão de membro, logos das operadoras e pagamento. Cores por tokens; o cartão e os logos têm cores de marca fixas. */
:root{--selo:#3fbf75;--selo-visto:#fff}
@media (prefers-color-scheme:dark){html:not([data-theme="light"]){--selo:#5fd994;--selo-visto:#0b2a1b}}
html[data-theme="dark"]{--selo:#5fd994;--selo-visto:#0b2a1b}
.selo-plus{display:inline-block;width:1em;height:1em;flex:none;vertical-align:-.15em}
.selo-plus-forma{fill:var(--selo)}
.selo-plus-visto{fill:none;stroke:var(--selo-visto);stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round}
.sh-av{position:relative}
.sh-selo{position:absolute;right:-5px;bottom:-4px;width:17px;height:17px;border-radius:50%;box-shadow:0 0 0 2px var(--k-bg)}
.sh-who .selo-plus{width:16px;height:16px}

/* logos das operadoras (provisórios: ver components/plano/operadoras.tsx) */
.op-logo{display:inline-grid;place-items:center;height:26px;padding:0 9px;border-radius:6px;color:#fff;font:800 .7rem/1 'Manrope',system-ui,sans-serif;letter-spacing:.01em;white-space:nowrap;vertical-align:middle}
.op-p{height:20px;padding:0 7px;border-radius:5px;font-size:.62rem}
.op-g{height:38px;padding:0 14px;border-radius:8px;font-size:.88rem}
.op-mpesa{background:#008a43}
.op-emola{background:#c65a0a}
.op-mkesh{background:#0b5fa5}

/* cartão Plus */
.pc-pal{--rx:0deg;--ry:0deg;--mx:30%;--my:20%;perspective:900px}
.pc{position:relative;container-type:inline-size;display:flex;flex-direction:column;justify-content:space-between;width:100%;max-width:440px;aspect-ratio:1.586;padding:18px;border-radius:18px;overflow:hidden;color:#fff;
  background:radial-gradient(120% 90% at 85% 0%,#3b8a74 0,transparent 55%),linear-gradient(145deg,#0f2f27 0,#1d4d41 55%,#2a6b5a 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22);transform:rotateX(var(--rx)) rotateY(var(--ry));transition:transform .15s ease-out;will-change:transform}
.pc::before{content:"";position:absolute;inset:0;background:repeating-radial-gradient(circle at 100% 100%,rgba(255,255,255,.07) 0 1px,transparent 1px 11px);pointer-events:none}
.pc::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at var(--mx) var(--my),rgba(255,255,255,.22),transparent 45%);mix-blend-mode:soft-light;pointer-events:none}
.pc>*{position:relative;z-index:1}
.pc>.pc-agua{position:absolute;right:-26px;bottom:-30px;width:170px;height:170px;opacity:.16;z-index:0}
.pc-topo{display:flex;align-items:center;justify-content:space-between}
.pc-logo{display:inline-flex;align-items:center;gap:8px;font:800 1.05rem 'Manrope',system-ui,sans-serif;letter-spacing:-.03em;white-space:nowrap}
.pc-logo i{width:20px;height:20px;border-radius:5px;background:#fff}
.pc-plus{padding:3px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.16);font:800 .72rem 'Manrope',system-ui,sans-serif;letter-spacing:.14em}
.pc-chip{position:relative;width:40px;height:30px;border-radius:6px;background:linear-gradient(135deg,#d8f3e4,#8fd6ae);box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.pc-chip::before{content:"";position:absolute;inset:6px 10px;border:1px solid rgba(8,60,38,.35);border-radius:3px}
.pc-pe{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
.pc-pe small{display:block;font-size:.7rem;font-weight:600;opacity:.75;white-space:nowrap}
.pc-nome{min-width:0}
.pc-nome b{display:flex;align-items:center;gap:6px;font:800 clamp(.95rem,5.2cqw,1.15rem)/1.2 'Manrope',system-ui,sans-serif;letter-spacing:-.01em}
.pc-nome b span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-selo{width:1.15em;height:1.15em}
.pc-val{text-align:right;font:700 .92rem 'Manrope',system-ui,sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap}
.pc-bloq{background:linear-gradient(145deg,#26332d,#3a4a42);filter:saturate(.5)}
.pc-bloq .pc-pe{filter:blur(5px)}
.pc-tranca{position:absolute!important;inset:0;z-index:3!important;display:grid;place-content:center;justify-items:center;gap:4px;background:rgba(10,20,15,.35);text-align:center}
.pc-tranca b{font:800 1.05rem 'Manrope',system-ui,sans-serif;white-space:nowrap}
.pc-tranca span{font-size:.85rem;opacity:.85;white-space:nowrap}
@media (prefers-reduced-motion:reduce){.pc{transform:none!important;transition:none}}

/* página do plano */
.pl-caixa{padding:16px;border:1px solid var(--linha);border-radius:16px;background:var(--superficie)}
.pl-estado{display:flex;align-items:center;justify-content:space-between;gap:14px}
.pl-titulo{margin:8px 0 0;font:800 1.05rem/1.25 'Manrope',system-ui,sans-serif;letter-spacing:-.02em}
.pl-apoio{margin:2px 0 0;color:var(--texto-2);font-size:.88rem;line-height:1.5}
.pl-estado .pl-apoio,.pl-selo-caixa .pl-apoio{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-anel{--p:60;display:grid;place-items:center;flex:none;width:56px;height:56px;border-radius:50%;background:conic-gradient(var(--sucesso) calc(var(--p)*1%),var(--sucesso-suave) 0)}
.pl-anel i{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--superficie);font:800 .95rem 'Manrope',system-ui,sans-serif;font-style:normal;font-variant-numeric:tabular-nums}
.pl-selo-caixa{display:flex;align-items:center;gap:14px}
.pl-selo-caixa .pl-titulo{margin-top:0}
.pl-selo-g{width:48px;height:48px;flex:none}
.pl-preco{margin:10px 0 0;font:800 2.2rem/1 'Manrope',system-ui,sans-serif;letter-spacing:-.05em}
.pl-preco span{margin-left:6px;color:var(--texto-2);font-size:.95rem;font-weight:700;letter-spacing:0}
.pl-lista{display:grid;gap:8px;margin:14px 0 0;padding:0;list-style:none;font-size:.93rem;font-weight:500}
.pl-lista li{display:flex;align-items:center;gap:10px;white-space:nowrap}
.pl-lista svg{flex:none;color:var(--sucesso)}
.pl-campo{margin:0 0 16px;padding:0;border:0;min-width:0}
.pl-campo legend,.pl-campo>label{display:block;margin:0 0 8px;padding:0;font-size:.92rem;font-weight:700}
.pl-meios{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.pl-meio{position:relative;display:grid;gap:8px;justify-items:center;padding:14px 6px 10px;border:1px solid var(--linha);border-radius:12px;background:var(--superficie-2);cursor:pointer;text-align:center}
.pl-meio input{position:absolute;opacity:0;pointer-events:none}
.pl-meio:has(input:checked){border-color:var(--marca);background:var(--marca-suave);box-shadow:0 0 0 1px var(--marca)}
.pl-meio:has(input:focus-visible){outline:2px solid var(--marca);outline-offset:2px}
.pl-meio small{color:var(--texto-2);font-size:.72rem;font-weight:600;white-space:nowrap}
.pl-tel{display:flex;align-items:center;height:48px;border:1px solid var(--linha);border-radius:12px;background:var(--superficie-2);overflow:hidden}
.pl-tel:focus-within{border-color:var(--marca);box-shadow:0 0 0 3px var(--marca-suave)}
.pl-tel span{padding:0 10px 0 14px;color:var(--texto-2);font-weight:700}
.pl-tel input{flex:1;min-width:0;height:100%;border:0;background:transparent;color:var(--texto);font:600 1.05rem 'DM Sans',system-ui,sans-serif;letter-spacing:.02em;outline:none}
.pl-aviso{min-height:1.4em;margin:8px 2px 0;color:var(--texto-2);font-size:.85rem}
.pl-nota{margin:10px 0 0;color:var(--texto-2);font-size:.82rem;text-align:center}
TWISISA_PL8_EOF
fi

echo "Plano Plus aplicado."

# Git
if [ -d .git ]; then
  git add lib/plano.ts lib/subscription.ts tests/plano.test.ts components/plano app/aluno/plano components/student-feature-shell.tsx components/shell components/student-mobile-sidebar.tsx components/student-nav.tsx "app/aluno/(painel)/page.tsx" app/aluno/perfil/page.tsx app/globals.css State.md DESIGN.md
  git commit -m "Plano Plus: página /aluno/plano, cartão de membro, selo Plus e logos das operadoras"
  git push origin main
fi
