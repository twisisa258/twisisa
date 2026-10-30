'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { checkBirth, DAILY_GOALS, DEFAULT_DAILY_GOAL, MAX_AGE, MIN_AGE, maputoDay } from '@/lib/identity'
import { isTrack, TRACKS, type Track } from '@/lib/percurso'
import { saveAboutYou, saveReminders, saveTrackAndGoal, startFirstSession } from '@/app/aluno/bem-vindo/actions'

type Institution = { id: string; shortName: string; name: string; soon: boolean }
type Step = 1 | 2 | 3

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const field = 'h-12 w-full rounded-xl border border-[#dfe1d9] bg-white px-3 text-[15px] outline-none focus:border-[#1d4d41]'
const primary = 'flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#1d4d41] text-[15px] font-semibold text-white transition hover:bg-[#153e34] disabled:opacity-50'

// Três ecrãs, cada um num ecrã de 360x640 sem scroll. Cada passo é guardado no servidor ao avançar (retoma onde parou).
export function OnboardingFlow({
  initialStep,
  initialName,
  initialBirth,
  needsConsent,
  initialTrack,
  initialInstitutionId,
  initialGoal,
  institutions,
}: {
  initialStep: Step
  initialName: string
  initialBirth: string | null
  needsConsent: boolean
  initialTrack: string | null
  initialInstitutionId: string | null
  initialGoal: number | null
  institutions: Institution[]
}) {
  const router = useRouter()
  const feedback = useFeedback()
  const [step, setStep] = useState<Step>(initialStep)
  const [pending, setPending] = useState(false)
  const [underAge, setUnderAge] = useState(false)

  const [name, setName] = useState(initialName)
  const [year, setYear] = useState(initialBirth ? String(Number(initialBirth.slice(0, 4))) : '')
  const [month, setMonth] = useState(initialBirth ? String(Number(initialBirth.slice(5, 7))) : '')
  const [day, setDay] = useState(initialBirth ? String(Number(initialBirth.slice(8, 10))) : '')
  const [accepted, setAccepted] = useState(false)

  const [track, setTrack] = useState<Track | null>(isTrack(initialTrack) ? initialTrack : null)
  const [institutionId, setInstitutionId] = useState(institutions.some((item) => item.id === initialInstitutionId) ? (initialInstitutionId ?? '') : '')
  const [goal, setGoal] = useState<number>(initialGoal ?? DEFAULT_DAILY_GOAL)

  const years = useMemo(() => {
    const current = maputoDay().year
    return Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, index) => current - MIN_AGE - index)
  }, [])

  const birthComplete = Boolean(day && month && year)
  // Mostra o erro de uma data impossível (31 de Fevereiro, por exemplo). O limite de 13 anos é decidido no servidor.
  const birthCheck = birthComplete ? checkBirth({ year, month, day }) : null
  const birthError = birthCheck && !birthCheck.ok && birthCheck.code !== 'under_age' ? birthCheck.message : null
  const aboutValid = name.trim().length >= 2 && birthComplete && !birthError && (!needsConsent || accepted)
  const trackValid = Boolean(track) && (track !== 'admissao' || Boolean(institutionId))

  async function run<T>(task: () => Promise<T>, onError = 'Não foi possível guardar. Tenta outra vez.'): Promise<T | null> {
    setPending(true)
    try {
      return await task()
    } catch {
      feedback.error(onError)
      return null
    } finally {
      setPending(false)
    }
  }

  async function submitAbout() {
    if (!aboutValid || pending) return
    const result = await run(() => saveAboutYou({ name, day: Number(day), month: Number(month), year: Number(year), acceptTerms: accepted }))
    if (!result) return
    if (result.ok) return setStep(2)
    if (result.underAge) {
      authClient.signOut().catch(() => undefined)
      return setUnderAge(true)
    }
    feedback.error(result.message)
  }

  async function submitTrack() {
    if (!trackValid || !track || pending) return
    const result = await run(() => saveTrackAndGoal({ track, institutionId: track === 'admissao' ? institutionId : null, dailyGoal: goal }))
    if (!result) return
    if (result.ok) return setStep(3)
    feedback.error(result.message)
  }

  async function submitReminders(choice: 'email' | 'none') {
    if (pending) return
    setPending(true)
    try {
      const result = await saveReminders({ choice })
      if (!result.ok) {
        feedback.error(result.message)
        return
      }
      // Sem ecrã de parabéns: entra directo num primeiro simulado curto (ou no painel, se ainda não há questões).
      const first = await startFirstSession().catch(() => ({ href: null }))
      router.replace(first.href ?? '/aluno')
      router.refresh()
    } catch {
      feedback.error('Não foi possível guardar. Tenta outra vez.')
    } finally {
      setPending(false)
    }
  }

  if (underAge) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-[420px] flex-col justify-center gap-5 px-5 text-[#202321]">
        <h1 className="text-2xl font-medium tracking-[-0.05em]">O Twisisa é para maiores de {MIN_AGE} anos</h1>
        <p className="text-[15px] leading-6 text-[#4d5851]">Não guardámos nenhum dado teu. Quando fizeres {MIN_AGE} anos, volta e cria a tua conta.</p>
        <Link href="/" className={primary}>Voltar ao início</Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[420px] flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] text-[#202321]">
      <header className="flex h-12 items-center justify-between">
        {step > 1 ? (
          <button type="button" onClick={() => setStep((step - 1) as Step)} disabled={pending} aria-label="Voltar" className="-ml-2 flex size-11 items-center justify-center text-[#4d5851]">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        ) : (
          <span className="size-11" aria-hidden="true" />
        )}
        <div role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label={`Passo ${step} de 3`} className="flex gap-1.5">
          {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 w-6 rounded-full ${n <= step ? 'bg-[#1d4d41]' : 'bg-[#dfe1d9]'}`} />)}
        </div>
        <span className="size-11" aria-hidden="true" />
      </header>

      {step === 1 && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">Sobre ti</h1>
          <p className="mt-1.5 text-[14px] leading-5 text-[#6e756f]">Para te tratarmos pelo nome e te darmos os parabéns no dia certo.</p>

          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Como te chamas?
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} placeholder="O teu nome" className={field} />
            </label>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">Data de nascimento</legend>
              <div className="grid grid-cols-[72px_1fr_92px] gap-2">
                <select aria-label="Dia" value={day} onChange={(event) => setDay(event.target.value)} className={field}>
                  <option value="">Dia</option>
                  {Array.from({ length: 31 }, (_, index) => index + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <select aria-label="Mês" value={month} onChange={(event) => setMonth(event.target.value)} className={field}>
                  <option value="">Mês</option>
                  {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
                </select>
                <select aria-label="Ano" value={year} onChange={(event) => setYear(event.target.value)} className={field}>
                  <option value="">Ano</option>
                  {years.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {birthError && <p className="text-[13px] text-[#b03a28]">{birthError}</p>}
            </fieldset>

            {needsConsent && (
              <label className="flex items-start gap-3 text-[13px] leading-5 text-[#4d5851]">
                <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#1d4d41]" />
                <span>Aceito os <Link href="/termos" target="_blank" className="font-semibold text-[#1d4d41] underline">Termos</Link> e a <Link href="/privacidade" target="_blank" className="font-semibold text-[#1d4d41] underline">Privacidade</Link>.</span>
              </label>
            )}
          </div>

          <div className="mt-auto pt-5">
            <button type="button" onClick={submitAbout} disabled={!aboutValid || pending} aria-busy={pending} className={primary}>{pending ? <><Spinner />A guardar…</> : 'Continuar'}</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">O que preparas?</h1>

          <div role="radiogroup" aria-label="O que preparas" className="mt-4 flex flex-col gap-2">
            {TRACKS.map((item) => {
              const selected = track === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTrack(item.value)}
                  className={`flex h-[52px] items-center justify-between rounded-2xl border px-4 text-left text-[15px] font-semibold transition ${selected ? 'border-2 border-[#1d4d41] bg-[#f3f7f4] text-[#1d4d41]' : 'border-[#e3e5dc] bg-white'}`}
                >
                  {item.label}
                  {selected && <Check size={18} aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          {track === 'admissao' && (
            <label className="mt-3 flex flex-col gap-1.5 text-sm font-medium">
              A que instituição te candidatas?
              {institutions.length === 0 ? (
                <span className="rounded-xl border border-dashed border-[#d5dacd] bg-white p-3 text-[13px] font-normal text-[#68736a]">Ainda não há instituições disponíveis. Escolhe a 10ª ou a 12ª classe.</span>
              ) : (
                <select value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} className={field}>
                  <option value="">Escolhe a instituição</option>
                  {institutions.map((item) => <option key={item.id} value={item.id}>{item.shortName} · {item.name}{item.soon ? ' (em breve)' : ''}</option>)}
                </select>
              )}
            </label>
          )}

          <div className="mt-4">
            <p className="text-sm font-medium" id="meta-titulo">Meta por dia</p>
            <div role="radiogroup" aria-labelledby="meta-titulo" className="mt-2 grid grid-cols-3 gap-2">
              {DAILY_GOALS.map((item) => {
                const selected = goal === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setGoal(item.value)}
                    className={`flex h-[64px] flex-col items-center justify-center rounded-2xl border transition ${selected ? 'border-2 border-[#1d4d41] bg-[#f3f7f4] text-[#1d4d41]' : 'border-[#e3e5dc] bg-white'}`}
                  >
                    <span className="text-[20px] font-semibold leading-6">{item.value}</span>
                    <span className="text-[11px] text-[#6e756f]">{item.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-auto pt-5">
            <button type="button" onClick={submitTrack} disabled={!trackValid || pending} aria-busy={pending} className={primary}>{pending ? <><Spinner />A guardar…</> : 'Continuar'}</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">Lembretes</h1>
          <p className="mt-1.5 text-[14px] leading-5 text-[#6e756f]">Um aviso curto quando fizer falta, nunca mais de um por dia. Podes desligar quando quiseres.</p>

          <div className="mt-5 flex flex-col gap-2.5">
            {/* O aviso no telemóvel (Web Push) é a fase G do plano: o botão existe mas ainda não pode ser escolhido. */}
            <button type="button" disabled className="flex h-14 items-center justify-between rounded-2xl border border-[#e3e5dc] bg-white px-4 text-left text-[15px] font-semibold opacity-50">
              No telemóvel
              <span className="rounded-full bg-[#f1f2ec] px-2 py-0.5 text-[11px] font-semibold text-[#6e756f]">Em breve</span>
            </button>
            <button type="button" onClick={() => submitReminders('email')} disabled={pending} className="flex h-14 items-center rounded-2xl border border-[#e3e5dc] bg-white px-4 text-left text-[15px] font-semibold transition hover:border-[#1d4d41] disabled:opacity-60">
              Por e-mail
            </button>
            <button type="button" onClick={() => submitReminders('none')} disabled={pending} className="flex h-14 items-center rounded-2xl border border-[#e3e5dc] bg-white px-4 text-left text-[15px] font-semibold text-[#4d5851] transition hover:border-[#1d4d41] disabled:opacity-60">
              Agora não
            </button>
          </div>

          {pending && <p className="mt-4 flex items-center gap-2 text-[13px] text-[#6e756f]" aria-live="polite"><Spinner />A preparar o teu primeiro simulado…</p>}
        </section>
      )}
    </main>
  )
}
