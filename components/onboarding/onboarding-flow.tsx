'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { ListaEscolha, type ItemEscolha } from '@/components/ui/lista-escolha'
import { MiniModal } from '@/components/aluno/mini-modal'
import { authClient } from '@/lib/auth-client'
import { checkBirth, DAILY_GOALS, DEFAULT_DAILY_GOAL, MIN_AGE } from '@/lib/identity'
import { isTrack, TRACKS, type Track } from '@/lib/percurso'
import { listCourseCombos, listCoursesOfMyInstitution, saveAboutYou, saveCourse, saveGoal, saveTrack, startFirstSession } from '@/app/aluno/bem-vindo/actions'

type Institution = { id: string; shortName: string; name: string; soon: boolean }
type Etapa = 'sobre' | 'percurso' | 'curso' | 'combo' | 'meta'
type Combo = { optionId: string; label: string }

const field = 'h-12 w-full rounded-xl border border-[#dfe1d9] bg-white px-3 text-[15px] outline-none focus:border-marca'
const primary = 'flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-marca text-[15px] font-semibold text-white transition hover:bg-marca-escura disabled:opacity-50'
const secondary = 'flex h-12 w-full items-center justify-center rounded-2xl border border-linha bg-white text-[14px] font-semibold text-texto transition hover:bg-[#f4f7f2] disabled:opacity-50'

// DD/MM/AAAA: só dígitos, com as barras postas pelo campo.
const maskDate = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/')
}
const birthToText = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

// Ecrãs curtos, sem scroll: sobre ti → percurso → (admissão: curso → combinação de provas) → meta. Cada passo guarda-se no servidor.
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
  initialStep: 1 | 2
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
  const [etapa, setEtapa] = useState<Etapa>(initialStep === 1 ? 'sobre' : 'percurso')
  const [pending, setPending] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [underAge, setUnderAge] = useState(false)

  const [name, setName] = useState(initialName)
  const [birth, setBirth] = useState(birthToText(initialBirth))
  const [accepted, setAccepted] = useState(false)

  const [track, setTrack] = useState<Track | null>(isTrack(initialTrack) ? initialTrack : null)
  const [institutionId, setInstitutionId] = useState(institutions.some((item) => item.id === initialInstitutionId) ? (initialInstitutionId ?? '') : '')
  const [courses, setCourses] = useState<ItemEscolha[]>([])
  const [courseId, setCourseId] = useState<string | null>(null)
  const [combos, setCombos] = useState<Combo[]>([])
  const [optionId, setOptionId] = useState<string | null>(null)
  const [goal, setGoal] = useState<number>(initialGoal ?? DEFAULT_DAILY_GOAL)

  const admissao = track === 'admissao' && Boolean(institutionId)
  const etapas: Etapa[] = ['sobre', 'percurso', ...(admissao ? (['curso', ...(combos.length > 1 ? ['combo'] : [])] as Etapa[]) : []), 'meta']
  const posicao = etapas.indexOf(etapa)

  // Data de nascimento: erro de data impossível mostra-se já; o limite de 13 anos decide-se no servidor.
  const complete = birth.length === 10
  const [dd, mm, yyyy] = birth.split('/').map(Number)
  const birthCheck = complete ? checkBirth({ year: yyyy, month: mm, day: dd }) : null
  const birthError = birthCheck && !birthCheck.ok && birthCheck.code !== 'under_age' ? birthCheck.message : null
  const aboutValid = name.trim().length >= 2 && complete && !birthError && (!needsConsent || accepted)
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

  function voltar() {
    const anterior = etapas[posicao - 1]
    if (anterior) setEtapa(anterior)
  }

  async function submitAbout() {
    if (!aboutValid || pending) return
    const result = await run(() => saveAboutYou({ name, day: dd, month: mm, year: yyyy, acceptTerms: accepted }))
    if (!result) return
    if (result.ok) return setEtapa('percurso')
    if (result.underAge) {
      authClient.signOut().catch(() => undefined)
      return setUnderAge(true)
    }
    feedback.error(result.message)
  }

  async function submitTrack() {
    if (!trackValid || !track || pending) return
    const result = await run(async () => {
      const saved = await saveTrack({ track, institutionId: track === 'admissao' ? institutionId : null })
      if (!saved.ok || track !== 'admissao') return { saved, list: null }
      return { saved, list: await listCoursesOfMyInstitution() }
    })
    if (!result) return
    if (!result.saved.ok) return feedback.error(result.saved.message)
    if (track !== 'admissao') return setEtapa('meta')
    if (!result.list?.ok) return feedback.error(result.list?.message ?? 'Não foi possível carregar os cursos.')
    setCourses(result.list.courses.map((course) => ({ id: course.id, label: course.name, detail: course.unit })))
    setCourseId(null)
    setCombos([])
    setOptionId(null)
    setEtapa('curso')
  }

  async function submitCourse(semCurso = false) {
    if (pending || (!semCurso && !courseId)) return
    const result = await run(async () => {
      if (semCurso) return { saved: await saveCourse({ courseId: null, optionId: null }), combos: [] as Combo[] }
      const list = await listCourseCombos(courseId!)
      if (!list.ok) return { saved: { ok: false as const, message: list.message }, combos: [] as Combo[] }
      // Uma só combinação fica escolhida sem perguntar; várias: pergunta.
      if (list.combos.length > 1) return { saved: { ok: true as const }, combos: list.combos, ask: true }
      return { saved: await saveCourse({ courseId, optionId: list.combos[0]?.optionId ?? null }), combos: list.combos }
    })
    if (!result) return
    if (!result.saved.ok) return feedback.error(result.saved.message)
    if ('ask' in result && result.ask) {
      setCombos(result.combos)
      setOptionId(null)
      return setEtapa('combo')
    }
    setCombos([])
    setEtapa('meta')
  }

  async function submitCombo() {
    if (pending || !optionId || !courseId) return
    const result = await run(() => saveCourse({ courseId, optionId }))
    if (!result) return
    if (result.ok) return setEtapa('meta')
    feedback.error(result.message)
  }

  async function submitGoal() {
    if (pending) return
    const result = await run(() => saveGoal({ dailyGoal: goal }))
    if (!result) return
    // Nunca entra num quiz sozinho: pergunta primeiro se quer praticar agora.
    if (result.ok) return setPronto(true)
    feedback.error(result.message)
  }

  function irParaPainel() {
    router.replace('/aluno')
    router.refresh()
  }

  async function praticarAgora() {
    if (iniciando) return
    setIniciando(true)
    const first = await startFirstSession().catch(() => ({ href: null }))
    router.replace(first.href ?? '/aluno')
    router.refresh()
  }

  if (underAge) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-[420px] flex-col justify-center gap-5 px-5 text-texto">
        <h1 className="text-2xl font-medium tracking-[-0.05em]">O Twisisa é para maiores de {MIN_AGE} anos</h1>
        <p className="text-[15px] leading-6 text-texto-2">Não guardámos nenhum dado teu. Quando fizeres {MIN_AGE} anos, volta e cria a tua conta.</p>
        <Link href="/" className={primary}>Voltar ao início</Link>
      </main>
    )
  }

  const botao = (rotulo: string, onClick: () => void, ok: boolean) => (
    <button type="button" onClick={onClick} disabled={!ok || pending} aria-busy={pending} className={primary}>{pending ? <><Spinner />A guardar…</> : rotulo}</button>
  )

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[420px] flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] text-texto">
      <header className="flex h-12 items-center justify-between">
        {posicao > 0 ? (
          <button type="button" onClick={voltar} disabled={pending} aria-label="Voltar" className="-ml-2 flex size-11 items-center justify-center text-texto-2">
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        ) : (
          <span className="size-11" aria-hidden="true" />
        )}
        <div role="progressbar" aria-valuemin={1} aria-valuemax={etapas.length} aria-valuenow={posicao + 1} aria-label={`Passo ${posicao + 1} de ${etapas.length}`} className="flex gap-1.5">
          {etapas.map((e, n) => <span key={e} className={`h-1.5 w-6 rounded-full ${n <= posicao ? 'bg-marca' : 'bg-[#dfe1d9]'}`} />)}
        </div>
        <span className="size-11" aria-hidden="true" />
      </header>

      {etapa === 'sobre' && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">Vamos conhecer-te</h1>
          <p className="mt-1.5 text-[14px] leading-5 text-texto-2">Para te tratarmos pelo nome e te darmos os parabéns no dia certo.</p>

          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Como te chamas?
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} placeholder="O teu nome" className={field} />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Data de nascimento
              <input value={birth} onChange={(event) => setBirth(maskDate(event.target.value))} inputMode="numeric" autoComplete="bday" maxLength={10} placeholder="DD/MM/AAAA" aria-invalid={Boolean(birthError)} className={field} />
              {birthError && <span className="text-[13px] font-normal text-erro-texto">{birthError}</span>}
            </label>

            {needsConsent && (
              <label className="flex items-start gap-3 text-[13px] leading-5 text-texto-2">
                <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-marca" />
                <span>Aceito os <Link href="/termos" target="_blank" className="font-semibold text-marca underline">Termos</Link> e a <Link href="/privacidade" target="_blank" className="font-semibold text-marca underline">Privacidade</Link>.</span>
              </label>
            )}
          </div>

          <div className="mt-auto pt-5">{botao('Continuar', submitAbout, aboutValid)}</div>
        </section>
      )}

      {etapa === 'percurso' && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">O que preparas?</h1>

          <div role="radiogroup" aria-label="O que preparas" className="mt-4 flex flex-col gap-2">
            {TRACKS.map((item) => {
              const selected = track === item.value
              return (
                <button key={item.value} type="button" role="radio" aria-checked={selected} onClick={() => setTrack(item.value)} className={`flex h-[52px] items-center justify-between rounded-2xl border px-4 text-left text-[15px] font-semibold transition ${selected ? 'border-2 border-marca bg-marca-suave text-marca' : 'border-linha bg-white'}`}>
                  {item.label}
                  {selected && <Check size={18} aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          {track === 'admissao' && (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">A que instituição te candidatas?</p>
              <ListaEscolha rotulo="Instituição" valor={institutionId || null} onChange={setInstitutionId} vazio="Ainda não há instituições disponíveis. Escolhe a 10ª ou a 12ª classe." itens={institutions.map((item) => ({ id: item.id, label: item.shortName, detail: item.name, soon: item.soon }))} />
            </div>
          )}

          <div className="mt-auto pt-5">{botao('Continuar', submitTrack, trackValid)}</div>
        </section>
      )}

      {etapa === 'curso' && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">Que curso queres?</h1>
          <p className="mt-1.5 text-[14px] leading-5 text-texto-2">O Simulador passa a mostrar só as disciplinas das provas desse curso.</p>
          <div className="mt-4">
            <ListaEscolha rotulo="Curso" valor={courseId} onChange={setCourseId} itens={courses} vazio="Ainda não há cursos desta instituição na plataforma." />
          </div>
          <div className="mt-auto grid gap-2 pt-5">
            {courses.length > 0 && botao('Continuar', () => submitCourse(false), Boolean(courseId))}
            <button type="button" onClick={() => submitCourse(true)} disabled={pending} className={secondary}>{courses.length > 0 ? 'Ainda não sei o curso' : 'Continuar'}</button>
          </div>
        </section>
      )}

      {etapa === 'combo' && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">Que provas vais fazer?</h1>
          <p className="mt-1.5 text-[14px] leading-5 text-texto-2">Este curso aceita mais do que uma combinação. Escolhe a tua.</p>
          <div className="mt-4">
            <ListaEscolha rotulo="Combinação de provas" valor={optionId} onChange={setOptionId} itens={combos.map((combo) => ({ id: combo.optionId, label: combo.label }))} />
          </div>
          <div className="mt-auto pt-5">{botao('Continuar', submitCombo, Boolean(optionId))}</div>
        </section>
      )}

      {etapa === 'meta' && (
        <section className="flex flex-1 flex-col" aria-labelledby="passo-titulo">
          <h1 id="passo-titulo" className="mt-2 text-[26px] font-medium tracking-[-0.05em]">Quantas questões por dia?</h1>
          <p className="mt-1.5 text-[14px] leading-5 text-texto-2">Podes mudar quando quiseres.</p>
          <div role="radiogroup" aria-label="Meta por dia" className="mt-5 grid grid-cols-3 gap-2">
            {DAILY_GOALS.map((item) => {
              const selected = goal === item.value
              return (
                <button key={item.value} type="button" role="radio" aria-checked={selected} onClick={() => setGoal(item.value)} className={`flex h-[72px] flex-col items-center justify-center rounded-2xl border transition ${selected ? 'border-2 border-marca bg-marca-suave text-marca' : 'border-linha bg-white'}`}>
                  <span className="text-[22px] font-semibold leading-6">{item.value}</span>
                  <span className="text-[11px] text-texto-2">{item.hint}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-auto pt-5">{botao('Começar', submitGoal, true)}</div>
        </section>
      )}

      <MiniModal open={pronto} onClose={irParaPainel} title="Tudo pronto. Queres praticar agora?">
        <p className="text-[14px] leading-5 text-texto-2">Um treino curto para começares, sem pressão. Podes fazê-lo mais tarde, quando quiseres.</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={praticarAgora} disabled={iniciando} aria-busy={iniciando} className="btn btn-primario flex-1">{iniciando ? 'A preparar…' : 'Praticar agora'}</button>
          <button type="button" onClick={irParaPainel} disabled={iniciando} className="btn btn-secundario">Agora não</button>
        </div>
      </MiniModal>
    </main>
  )
}
