'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Clock, Flame, Sparkles, X } from 'lucide-react'
import { QuestionStatement } from '@/components/simulador/question-statement'
import { Toolbox } from '@/components/simulador/toolbox'
import { MathText } from '@/lib/math-text'
import { finishSession, saveAnswer } from '@/app/aluno/simulador/actions'
import { cue } from '@/lib/sim-cue'
import { JonasExplainSheet } from '@/components/simulador/jonas-explain'
import { QuestionImage } from '@/components/simulador/question-image'
import { MODE_META, QUICK_SECONDS_PER_QUESTION, clock, formatPoints, percent, type PlayData, type PlayItem } from '@/lib/simulator-shared'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

// Tudo cabe num ecrã (100dvh): cabeçalho, pergunta, opções, aviso e botão. Só a zona do meio rola, e só se o enunciado for muito longo.
export function SessionPlayer({ data, cues }: { data: PlayData; cues: { sound: boolean; haptics: boolean } }) {
  const router = useRouter()
  const questionMs = (data.secondsPerQuestion ?? QUICK_SECONDS_PER_QUESTION) * 1000
  const timed = data.mode === 'rapido'
  const [items, setItems] = useState<PlayItem[]>(data.items)
  const firstOpen = data.items.findIndex((item) => item.selectedOptionId === null)
  const [index, setIndex] = useState(firstOpen === -1 ? data.items.length - 1 : firstOpen)
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const [sheetStart, setSheetStart] = useState<'porque' | null>(null)
  const [msLeft, setMsLeft] = useState(questionMs)
  const [timeout, setTimeoutFlash] = useState(false)

  const itemsRef = useRef(items)
  itemsRef.current = items
  const pickedRef = useRef<string | null>(null)
  pickedRef.current = picked
  const busyRef = useRef(false)
  const finishingRef = useRef(false)
  const deadline = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const scroller = useRef<HTMLDivElement>(null)

  const item = items[index]
  const isLast = index === items.length - 1
  const fb = item.feedback
  const feedbackRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (fb) feedbackRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [fb])
  const chosen = item.selectedOptionId ?? picked

  let streak = 0
  for (let i = index; i >= 0 && items[i].feedback?.isCorrect; i--) streak++

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const finish = useCallback(async () => {
    if (finishingRef.current) return
    finishingRef.current = true
    setFinishing(true)
    setError(null)
    try {
      const res = await finishSession({ attemptId: data.id })
      if (!res.ok) throw new Error(res.message)
      router.refresh()
    } catch (e) {
      finishingRef.current = false
      setFinishing(false)
      setError(e instanceof Error && e.message ? e.message : 'Sem ligação. Tenta de novo.')
    }
  }, [data.id, router])

  const advance = useCallback((from: number) => {
    if (from >= itemsRef.current.length - 1) void finish()
    else setIndex(from + 1)
  }, [finish])

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
    setError(null)
    setPicked(null)
    setSheet(false)
    setSheetStart(null)
    setTimeoutFlash(false)
    setMsLeft(questionMs)
    deadline.current = Date.now() + questionMs
  }, [index, questionMs])

  // Verificar: só aqui a resposta é enviada e corrigida no servidor.
  const verify = useCallback(async () => {
    const current = itemsRef.current[index]
    const optionId = pickedRef.current
    if (!optionId || busyRef.current || finishingRef.current || current.selectedOptionId) return
    setError(null)
    busyRef.current = true
    setBusy(true)
    try {
      const res = await saveAnswer({ attemptId: data.id, position: current.position, optionId })
      if (res.ok && res.data.feedback) {
        const feedback = res.data.feedback
        setItems((list) => list.map((i) => (i.position === current.position ? { ...i, selectedOptionId: optionId, feedback } : i)))
        cue(feedback.isCorrect, cues)
      } else {
        if (!res.ok && res.timeUp) router.refresh()
        setError(res.ok ? 'Não foi possível guardar a resposta.' : res.message)
      }
    } catch {
      setError('Sem ligação. Carrega em Verificar de novo quando tiveres internet.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [data.id, index, router, cues])

  useEffect(() => {
    if (!timed) return
    const tick = setInterval(() => {
      const current = itemsRef.current[index]
      if (current.selectedOptionId || busyRef.current || finishingRef.current || deadline.current === Infinity) return
      const ms = deadline.current - Date.now()
      setMsLeft(Math.max(0, ms))
      if (ms <= 0) {
        deadline.current = Infinity
        // Tempo esgotado: se já havia uma opção marcada, verifica-a; senão, passa à seguinte.
        if (pickedRef.current) void verify()
        else {
          setTimeoutFlash(true)
          later(() => advance(index), 1200)
        }
      }
    }, 200)
    return () => clearInterval(tick)
  }, [timed, index, advance, verify])

  // Teclado: A–E escolhe a opção, Enter verifica (ou passa à seguinte). Não interfere com folhas abertas nem com campos de texto.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && (['INPUT', 'TEXTAREA', 'A'].includes(target.tagName) || target.isContentEditable)) return
      if (document.querySelector('[role="dialog"]')) return
      const current = itemsRef.current[index]
      if (!current) return
      if (event.key === 'Enter') {
        if (target?.tagName === 'BUTTON') return
        if (current.feedback) advance(index)
        else void verify()
        return
      }
      if (current.feedback || busyRef.current || finishingRef.current) return
      const at = LETTERS.indexOf(event.key.toUpperCase())
      const option = at >= 0 ? current.options[at] : undefined
      if (option && option.id !== current.hints.find((h) => h.level === 3)?.content) setPicked(option.id)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, advance, verify])

  const secs = Math.ceil(msLeft / 1000)
  // Tempo a acabar é um aviso (laranja, sem piscar): o vermelho fica reservado ao erro.
  const danger = timed && msLeft <= questionMs * 0.25 && !fb
  const done = items.filter((i) => i.feedback).length
  const correctLetter = fb ? LETTERS[Math.max(0, item.options.findIndex((o) => o.id === fb.correctOptionId))] : ''
  const closeSheet = useCallback(() => setSheet(false), [])
  const imageOptions = item.options.length > 1 && item.options.every((o) => o.image)
  const eliminated = !fb ? item.hints.find((h) => h.level === 3)?.content ?? null : null
  const setHints = useCallback((hints: PlayItem['hints']) => setItems((list) => list.map((i) => (i.position === item.position ? { ...i, hints } : i))), [item.position])
  const setMarked = useCallback((marked: boolean) => setItems((list) => list.map((i) => (i.position === item.position ? { ...i, marked } : i))), [item.position])
  const openJonas = useCallback((start: 'porque' | null) => { setSheetStart(start); setSheet(true) }, [])

  return (
    <main className="fixed inset-0 flex flex-col bg-fundo text-texto" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Cabeçalho: uma só linha alinhada + barra de progresso nas mesmas margens. */}
      <header className="flex-none">
        <div className="mx-auto w-full max-w-[640px] px-4 pt-2.5">
          <div className="flex h-10 items-center gap-2">
            <Link href="/aluno/simulador" aria-label="Sair (o teu progresso fica guardado)" className="btn btn-icone -ml-2 shrink-0"><X size={20} aria-hidden /></Link>
            <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{MODE_META[data.mode].label}<span className="font-normal text-texto-2">{data.variant ? ` · ${data.variant}` : data.subject ? ` · ${data.subject}` : ''}</span></p>
            {streak >= 2 && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-conquista-suave px-2 py-1 text-xs font-bold text-conquista-texto"><Flame size={13} aria-hidden />{streak}</span>}
            {timed && <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold tabular-nums ${danger ? 'bg-aviso-suave text-aviso' : 'bg-marca/[0.08] text-marca'}`}><Clock size={13} aria-hidden />{clock(secs)}</span>}
            <span className="shrink-0 text-[13px] tabular-nums text-texto-2">{index + 1}/{items.length}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-linha" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done}>
            <div className="h-full rounded-full bg-marca transition-[width] duration-300" style={{ width: `${percent(done, items.length)}%` }} />
          </div>
        </div>
      </header>

      {/* Pergunta + opções: ocupam o espaço que sobra. */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col justify-center px-4 pb-20 pt-4">
          <section aria-label="Questão" className="rounded-2xl border border-linha bg-white px-4 pb-4 pt-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-marca">{item.subject}</p>
          {item.images.length > 0 && <div className="mt-2 space-y-2">{item.images.map((image, i) => <QuestionImage key={image.url + i} image={image} priority={i === 0} />)}</div>}
          <div className="mt-2.5"><QuestionStatement text={item.statement} /></div>
          </section>

          <div
            className={`mt-4 grid gap-2 ${imageOptions ? 'grid-cols-2' : ''}`}
            role="radiogroup"
            aria-label="Respostas"
            onKeyDown={(event) => {
              if (fb || busy || finishing || !['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return
              event.preventDefault()
              const usable = item.options.filter((o) => o.id !== eliminated)
              const at = usable.findIndex((o) => o.id === chosen)
              const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
              const next = usable[(at + step + usable.length) % usable.length] ?? usable[0]
              if (next) { setPicked(next.id); requestAnimationFrame(() => document.getElementById(`opt-${next.id}`)?.focus()) }
            }}
          >
            {item.options.map((option, i) => {
              const isPicked = chosen === option.id
              const isOut = eliminated === option.id
              const isRight = !!fb && fb.correctOptionId === option.id
              const isWrong = !!fb && item.selectedOptionId === option.id && !isRight
              const tone = isRight ? 'bg-sucesso-suave' : isWrong ? 'bg-erro-suave' : isPicked ? 'bg-marca-suave ring-1 ring-marca/40' : 'bg-white hover:bg-superficie-2'
              return (
                <button key={option.id} id={`opt-${option.id}`} type="button" role="radio" aria-checked={isPicked} disabled={!!fb || busy || finishing || timeout || isOut} tabIndex={isPicked || (!chosen && i === 0) ? 0 : -1} aria-label={isOut ? `${LETTERS[i]}: eliminada pela dica` : undefined} onClick={() => setPicked(option.id)} className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors disabled:cursor-default ${tone} ${fb && !isRight && !isWrong ? 'opacity-50' : ''} ${isOut ? 'opacity-40 [&_span]:line-through' : ''}`}>
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${isRight ? 'bg-sucesso text-white' : isWrong ? 'bg-erro text-white' : isPicked ? 'bg-marca text-white' : 'bg-marca/[0.08] text-marca'}`}>
                    {isRight ? <Check size={14} aria-hidden /> : isWrong ? <X size={14} aria-hidden /> : LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1.5 text-[15px] leading-6 text-texto">
                    {option.image && <QuestionImage image={option.image} zoomable={false} />}
                    {option.body && <span className="block"><MathText text={option.body} /></span>}
                  </span>
                </button>
              )
            })}
          </div>

            {fb && (
              <div ref={feedbackRef} role="status" className={`mt-3 scroll-mb-24 flex items-center gap-3 rounded-xl px-3 py-2.5 ${fb.isCorrect ? 'bg-sucesso-suave' : 'bg-erro-suave'}`}>
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-white ${fb.isCorrect ? 'bg-sucesso' : 'bg-erro'}`}>{fb.isCorrect ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[14px] font-semibold leading-5 ${fb.isCorrect ? 'text-sucesso-texto' : 'text-erro-texto'}`}>
                    {fb.isCorrect ? (streak >= 3 ? `Acertaste! ${streak} seguidas` : 'Acertaste!') : 'Errado'}{fb.points > 0 && <span className="ml-1.5 text-[12px] font-bold">+{formatPoints(fb.points)} pts</span>}
                  </span>
                  <span className="block truncate text-[12px] leading-4 text-texto-2">{fb.isCorrect ? 'Continua assim.' : `A certa é a ${correctLetter}. Vê «Porque errei» nas ferramentas.`}</span>
                </span>
                <button type="button" onClick={() => openJonas(null)} className="btn btn-secundario shrink-0"><Sparkles size={14} aria-hidden />Ver explicação</button>
              </div>
            )}
        </div>
      </div>

      {/* Zona de ação: no fluxo (nunca tapa as opções). Só o botão (Verificar / Seguinte); o resultado aparece a seguir às opções, para não roubar espaço à questão. */}
      <footer className="relative flex-none bg-fundo pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Kit de ferramentas: flutua à direita, logo acima da zona de ação (nunca sobre as opções). */}
        <div className="pointer-events-none absolute inset-x-0 -top-[64px] z-10">
          <div className="mx-auto flex w-full max-w-[640px] justify-end px-4">
            <div className="pointer-events-auto">
              <Toolbox attemptId={data.id} mode={data.mode} item={item} wasWrong={!!fb && !fb.isCorrect} onHints={setHints} onMarked={setMarked} onOpenJonas={openJonas} />
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[640px] space-y-2 px-4 pt-2">
          {error && <p role="alert" className="rounded-xl bg-erro-suave px-3 py-2 text-[13px] text-erro-texto">{error}</p>}
          {timeout && <p className="text-center text-[13px] text-texto-2">Sem tempo! A passar à seguinte…</p>}
          {fb ? (
            <button type="button" disabled={finishing} onClick={() => advance(index)} className="btn btn-primario btn-grande w-full">
              {isLast ? (finishing ? 'A calcular…' : 'Ver resultado') : <>Seguinte<ArrowRight size={18} aria-hidden /></>}
            </button>
          ) : (
            <button type="button" disabled={!picked || busy || finishing || timeout} onClick={() => void verify()} className="btn btn-primario btn-grande w-full">
              {busy ? 'A verificar…' : 'Verificar'}
            </button>
          )}
        </div>
      </footer>

      {/* Explicação: o Jonas explica aqui mesmo, numa folha por cima (a página não cresce nem salta). */}
      {fb && <JonasExplainSheet key={`${data.id}-${item.position}-${sheetStart ?? 'passo'}`} startWith={sheetStart} attemptId={data.id} position={item.position} open={sheet} onClose={closeSheet} officialExplanation={fb.explanation} images={fb.images} />}
    </main>
  )
}
