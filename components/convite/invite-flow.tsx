'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Eye, EyeOff, Flame, Lock } from 'lucide-react'
import { checkInvite, makeAccount, nextStep, openInvite, resendEmail } from '@/app/convite/actions'
import { maskEmail, type InviteStep } from '@/lib/staff-shared'
import type { InviteView } from '@/lib/staff-invites'

type Phase = 'sealed' | 'opening' | InviteStep | 'burning' | 'destroyed' | 'gone'
type Ctx = { name: string; roleLabel: string; email: string }

const AREAS = ['Marketing', 'Design', 'Suporte ao aluno', 'Comunidade', 'Programação', 'Finanças', 'Parcerias', 'Tradução', 'Vídeo', 'Análise de dados', 'Moderação', 'Conteúdos', 'Redes sociais']
const ROW = 56
const TOTAL = 64
const TARGET = TOTAL - 2

const primary = 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1d4d41] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#163e34] disabled:opacity-60'
const field = 'h-12 w-full rounded-xl border border-[#dfe3d9] bg-white px-4 text-[15px] outline-none transition-colors focus:border-[#1d4d41]'

function Paper({ children, className = '', onAnimationEnd }: { children: React.ReactNode; className?: string; onAnimationEnd?: () => void }) {
  return (
    <section onAnimationEnd={onAnimationEnd} className={`w-full max-w-[420px] rounded-[28px] border border-[#e3e5dc] bg-white p-6 shadow-[0_24px_60px_rgba(35,54,44,0.10)] sm:p-8 ${className}`}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4d41]"><Flame size={13} aria-hidden />Carta pessoal · abre-se uma só vez</p>
      {children}
    </section>
  )
}

function Envelope({ open, children }: { open: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="env" data-open={open} aria-hidden="true">
        <div className="env-back" />
        <div className="env-paper" />
        <div className="env-front" />
        <div className="env-flap" />
        <div className="env-seal">e</div>
      </div>
      {children}
    </div>
  )
}

function Roulette({ label, instant, onLanded }: { label: string; instant: boolean; onLanded: () => void }) {
  const strip = useMemo(() => Array.from({ length: TOTAL }, (_, i) => (i === TARGET ? label : AREAS[(i * 7) % AREAS.length])), [label])
  const [go, setGo] = useState(instant)
  const [blur, setBlur] = useState(!instant)
  const landed = useRef(false)
  const land = () => { if (!landed.current) { landed.current = true; onLanded() } }

  useEffect(() => {
    if (instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setGo(true)
      setBlur(false)
      land()
      return
    }
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)))
    const timer = setTimeout(() => setBlur(false), 2800)
    return () => { cancelAnimationFrame(frame); clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-[#e3e5dc] bg-[#f8f8f5]" style={{ height: ROW * 3 }} role="img" aria-label={`A tua tarefa: ${label}`}>
      <div className="pointer-events-none absolute inset-x-0 z-10 rounded-xl border-y-2 border-[#1d4d41]/70 bg-[#1d4d41]/[0.06]" style={{ top: ROW, height: ROW }} />
      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-[#f8f8f5] via-transparent to-[#f8f8f5]" />
      <div
        onTransitionEnd={land}
        style={{ transform: `translateY(-${go ? (TARGET - 1) * ROW : 0}px)`, transition: go && !instant ? 'transform 4800ms cubic-bezier(0.12, 0.6, 0.08, 1)' : 'none', filter: blur ? 'blur(1.6px)' : 'none' }}
      >
        {strip.map((area, i) => (
          <div key={i} className={`flex items-center justify-center px-4 text-center text-lg font-semibold ${i === TARGET ? 'text-[#1d4d41]' : 'text-[#48534b]'}`} style={{ height: ROW }}>{area}</div>
        ))}
      </div>
    </div>
  )
}

function Ended({ message, hint }: { message: string; hint?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f4ef] px-5 text-[#202321]">
      <div className="max-w-xs text-center">
        <p className="text-lg font-semibold">{message}</p>
        {hint && <p className="mt-2 text-sm leading-6 text-[#68736a]">{hint}</p>}
      </div>
    </main>
  )
}

export function InviteFlow({ token, view }: { token: string; view: InviteView }) {
  const initial: Phase = view.state === 'sealed' ? 'sealed' : view.state === 'step' ? view.step : view.state === 'done' ? 'burning' : 'gone'
  const [phase, setPhase] = useState<Phase>(initial)
  const [fresh, setFresh] = useState(false) // true quando se chega ao passo nesta sessão (há animação); false ao recarregar
  const [ctx, setCtx] = useState<Ctx>(view.state === 'step' ? { name: view.name, roleLabel: view.roleLabel, email: view.email } : { name: '', roleLabel: 'Revisor de questões', email: '' })
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [landed, setLanded] = useState(false)
  const [needSignIn, setNeedSignIn] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resent, setResent] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Verificação: a página pergunta ao servidor de 4 em 4 segundos (o e-mail pode ser aberto noutro dispositivo).
  useEffect(() => {
    if (phase !== 'aguardar') return
    const timer = setInterval(async () => {
      try {
        const res = await checkInvite({ token })
        if (res.ok && res.data.state === 'done') setPhase('burning')
        else if (res.ok && res.data.state === 'gone') setPhase('gone')
      } catch { /* sem ligação: tenta no ciclo seguinte */ }
    }, 4000)
    return () => clearInterval(timer)
  }, [phase, token])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function guarded<T>(task: () => Promise<{ ok: true; data: T } | { ok: false; message: string }>, onOk: (data: T) => void) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await task()
      if (res.ok) onOk(res.data)
      else setError(res.message)
    } catch {
      setError('Sem ligação. Verifica a internet e tenta de novo.')
    } finally {
      setBusy(false)
    }
  }

  const unlock = () => guarded(() => openInvite({ token, code }), (data) => {
    setCtx({ name: data.name, roleLabel: data.roleLabel, email: data.email })
    setPhase('opening')
    timers.current.push(setTimeout(() => { setFresh(true); setPhase(data.step) }, 1700))
  })
  const toTask = () => guarded(() => nextStep({ token, to: 'tarefa' }), () => { setFresh(true); setLanded(false); setPhase('tarefa') })
  const toAccount = () => guarded(() => nextStep({ token, to: 'conta' }), () => { setFresh(true); setPhase('conta') })
  const createAccount = () => {
    if (password !== confirmPassword) return setError('As palavras-passe não coincidem.')
    return guarded(() => makeAccount({ token, password }), (data) => {
      if (data.needSignIn) setNeedSignIn(true)
      else { setFresh(true); setCooldown(60); setPhase('aguardar') }
    })
  }
  const resend = () => guarded(() => resendEmail({ token }), () => { setResent(true); setCooldown(60) })

  if (view.state === 'locked') return <Ended message="Esta carta está bloqueada." hint="Houve demasiadas tentativas com o código. Pede a quem te convidou que envie uma nova carta." />
  if (phase === 'gone') return <Ended message="Esta carta já não existe." hint="Foi aberta e destruída, ou foi retirada. Se achas que é engano, fala com quem te convidou." />

  const stage = 'flex min-h-screen items-center justify-center bg-[#f3f4ef] px-5 py-10 text-[#202321]'

  if (phase === 'sealed' || phase === 'opening') {
    return (
      <main className={stage}>
        <Envelope open={phase === 'opening'}>
          <form onSubmit={(e) => { e.preventDefault(); void unlock() }} className="flex w-full max-w-[300px] flex-col items-stretch gap-3" aria-busy={busy}>
            <label htmlFor="code" className="text-center text-xs font-medium text-[#68736a]">Código de abertura (veio no e-mail)</label>
            <input
              id="code" value={code} disabled={busy || phase === 'opening'} autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} maxLength={9} placeholder="XXXX-XXXX"
              onChange={(e) => { const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); setCode(raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw) }}
              className={`${field} text-center font-mono text-lg font-semibold tracking-[0.2em]`}
            />
            <button type="submit" disabled={busy || phase === 'opening' || code.replace('-', '').length < 8} className={primary}>{busy ? 'A verificar…' : 'Abrir'}</button>
            <p role="alert" className="min-h-5 text-center text-sm text-[#9a3030]">{error}</p>
          </form>
        </Envelope>
      </main>
    )
  }

  if (phase === 'burning') {
    return (
      <main className={stage}>
        <Paper className="letter-burn" onAnimationEnd={() => setPhase('destroyed')}>
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Dados verificados.</h1>
          <p className="mt-3 text-sm leading-6 text-[#68736a]">A carta cumpriu o seu papel.</p>
        </Paper>
      </main>
    )
  }

  if (phase === 'destroyed') {
    return (
      <main className={stage}>
        <div className="fade-up max-w-xs text-center">
          <p className="text-2xl font-semibold tracking-[-0.03em]">Carta destruída.</p>
          <p className="mt-3 text-sm leading-6 text-[#68736a]">Está tudo verificado. Bem-vindo à equipa. Esta carta não pode ser aberta outra vez.</p>
          <Link href="/admin/questoes" className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#1d4d41] px-7 text-sm font-semibold text-white hover:bg-[#163e34]">Entrar no painel</Link>
        </div>
      </main>
    )
  }

  const letterClass = fresh ? 'letter-in' : ''
  return (
    <main className={stage}>
      <Paper className={letterClass}>
        {phase === 'carta' && (
          <>
            <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Olá, {ctx.name}.</h1>
            <p className="mt-4 text-[17px] font-medium leading-7">Se estás a ver este convite, é porque aceitaste participar na administração do twisisa.</p>
            <p className="mt-3 text-sm leading-6 text-[#68736a]">Lê com atenção e segue as instruções. Depois de finalizares, esta carta será destruída e não poderá ser aberta outra vez.</p>
            <div className="my-6 h-px bg-[#edf0e9]" />
            <p className="text-sm leading-6 text-[#48534b]">Clica no botão abaixo para saberes a tua tarefa.</p>
            <button type="button" onClick={() => void toTask()} disabled={busy} className={`${primary} mt-4`}>{busy ? 'A abrir…' : <>Descobrir a minha tarefa<ArrowRight size={18} aria-hidden /></>}</button>
            <p role="alert" className="mt-3 min-h-5 text-center text-sm text-[#9a3030]">{error}</p>
          </>
        )}

        {phase === 'tarefa' && (
          <>
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">{landed ? 'A tua tarefa' : 'A escolher a tua tarefa…'}</h1>
            <Roulette label={ctx.roleLabel} instant={!fresh} onLanded={() => setLanded(true)} />
            {landed && (
              <div className="fade-up">
                <p className="mt-5 text-sm leading-6 text-[#48534b]">Vais rever exercícios: confirmar enunciados, opções e explicações antes de chegarem aos alunos. Só terás acesso a essa área.</p>
                <button type="button" onClick={() => void toAccount()} disabled={busy} className={`${primary} mt-5`}>{busy ? 'A continuar…' : <>Continuar<ArrowRight size={18} aria-hidden /></>}</button>
                <p className="mt-2 text-center text-xs text-[#9aa29b]">Daqui não se volta atrás.</p>
                <p role="alert" className="mt-2 min-h-5 text-center text-sm text-[#9a3030]">{error}</p>
              </div>
            )}
          </>
        )}

        {phase === 'conta' && (
          <form onSubmit={(e) => { e.preventDefault(); void createAccount() }} aria-busy={busy}>
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Cria a tua conta</h1>
            <p className="mt-2 text-sm leading-6 text-[#68736a]">O teu nome e o resto defines depois, no painel.</p>
            <label className="mt-5 block text-xs font-medium text-[#68736a]" htmlFor="email">E-mail do convite</label>
            <div className="relative mt-1.5">
              <input id="email" value={ctx.email} readOnly className={`${field} bg-[#f3f4ef] pr-10 text-[#68736a]`} />
              <Lock size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9aa29b]" aria-hidden />
            </div>
            <label className="mt-4 block text-xs font-medium text-[#68736a]" htmlFor="password">Palavra-passe</label>
            <div className="relative mt-1.5">
              <input id="password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required placeholder="Mínimo 8 caracteres" className={`${field} pr-12`} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'} className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center text-[#68736a]">{show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}</button>
            </div>
            <label className="mt-4 block text-xs font-medium text-[#68736a]" htmlFor="confirm">Repete a palavra-passe</label>
            <input id="confirm" type={show ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required className={`${field} mt-1.5`} />
            {needSignIn && (
              <p role="status" className="mt-4 rounded-xl bg-[#f4eddb] p-3 text-sm leading-6 text-[#805f19]">Já existe uma conta com este e-mail. <Link href="/sign-in" className="font-semibold underline">Entra com ela</Link> e volta a abrir esta carta (link e código): conclui-se sozinha.</p>
            )}
            <button type="submit" disabled={busy || needSignIn} className={`${primary} mt-5`}>{busy ? 'A criar…' : 'Criar conta'}</button>
            <p role="alert" className="mt-3 min-h-5 text-center text-sm text-[#9a3030]">{error}</p>
          </form>
        )}

        {phase === 'aguardar' && (
          <div className="text-center">
            <div className="mx-auto mt-8 size-14 animate-spin rounded-full border-[3px] border-[#dfe8e1] border-t-[#1d4d41]" role="status" aria-label="A aguardar verificação" />
            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">A aguardar a verificação dos dados</h1>
            <p className="mt-3 text-sm leading-6 text-[#68736a]">Enviámos uma mensagem para <span className="font-semibold text-[#202321]">{maskEmail(ctx.email)}</span>. Abre-a e confirma o e-mail. Esta página atualiza sozinha.</p>
            <button type="button" onClick={() => void resend()} disabled={busy || cooldown > 0} className="mt-6 text-sm font-semibold text-[#1d4d41] hover:underline disabled:text-[#9aa29b] disabled:no-underline">
              {cooldown > 0 ? `Reenviar e-mail (${cooldown} s)` : 'Reenviar e-mail'}
            </button>
            {resent && !error && <p className="mt-2 text-xs text-[#1f6b45]">Mensagem reenviada.</p>}
            <p role="alert" className="mt-2 min-h-5 text-sm text-[#9a3030]">{error}</p>
          </div>
        )}
      </Paper>
    </main>
  )
}
