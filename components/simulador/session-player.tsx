'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Clock, Flame, Lightbulb, MessageCircle, X } from 'lucide-react'
import { MathText } from '@/lib/math-text'
import { finishSession, saveAnswer } from '@/app/aluno/simulador/actions'
import { QuestionImage } from '@/components/simulador/question-image'
import { MODE_META, QUICK_SECONDS_PER_QUESTION, clock, formatPoints, percent, type PlayData, type PlayItem } from '@/lib/simulator-shared'

const LETTERS = ['A', 'B', 'C', 'D', 'E']
const QUESTION_MS = QUICK_SECONDS_PER_QUESTION * 1000
const WRONG_LINES = ['Não faz mal, é assim que se aprende.', 'Lê a explicação e segue.', 'Um erro hoje é um acerto amanhã.']

// Tudo cabe num ecrã (100dvh): cabeçalho, pergunta, opções, aviso e botão. Só a zona do meio rola, e só se o enunciado for muito longo.
export function SessionPlayer({ data }: { data: PlayData }) {
  const router = useRouter()
  const timed = data.mode === 'rapido'
  const [items, setItems] = useState<PlayItem[]>(data.items)
  const firstOpen = data.items.findIndex((item) => item.selectedOptionId === null)
  const [index, setIndex] = useState(firstOpen === -1 ? data.items.length - 1 : firstOpen)
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheet, setSheet] = useState(false)
  const [msLeft, setMsLeft] = useState(QUESTION_MS)
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
    setTimeoutFlash(false)
    setMsLeft(QUESTION_MS)
    deadline.current = Date.now() + QUESTION_MS
  }, [index])

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
  }, [data.id, index, router])

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

  const secs = Math.ceil(msLeft / 1000)
  const danger = timed && secs <= 10 && !fb
  const done = items.filter((i) => i.feedback).length
  const correctLetter = fb ? LETTERS[Math.max(0, item.options.findIndex((o) => o.id === fb.correctOptionId))] : ''
  const hasExplanation = !!fb && (!!fb.explanation || fb.images.length > 0)
  const imageOptions = item.options.length > 1 && item.options.every((o) => o.image)

  return (
    <main className="fixed inset-0 flex flex-col bg-[#f8f8f5] text-[#202321]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Cabeçalho: uma só linha alinhada + barra de progresso nas mesmas margens. */}
      <header className="flex-none">
        <div className="mx-auto w-full max-w-[640px] px-4 pt-2.5">
          <div className="flex h-10 items-center gap-2">
            <Link href="/aluno/simulador" aria-label="Sair (o teu progresso fica guardado)" className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-[#68716a] hover:bg-[#eaede4]"><X size={20} aria-hidden /></Link>
            <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{MODE_META[data.mode].label}<span className="font-normal text-[#7d857e]">{data.variant ? ` · ${data.variant}` : data.subject ? ` · ${data.subject}` : ''}</span></p>
            {streak >= 2 && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fff1dc] px-2 py-1 text-xs font-bold text-[#b45f06]"><Flame size={13} aria-hidden />{streak}</span>}
            {timed && <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-bold tabular-nums ${danger ? 'animate-pulse bg-[#fbeaea] text-[#c24b4b]' : 'bg-[#1d4d41]/[0.08] text-[#1d4d41]'}`}><Clock size={13} aria-hidden />{clock(secs)}</span>}
            <span className="shrink-0 text-[13px] tabular-nums text-[#7d857e]">{index + 1}/{items.length}</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#e3e8de]" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done}>
            <div className="h-full rounded-full bg-[#1d4d41] transition-[width] duration-300" style={{ width: `${percent(done, items.length)}%` }} />
          </div>
        </div>
      </header>

      {/* Pergunta + opções: ocupam o espaço que sobra. */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col justify-center px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4d41]">{item.subject}</p>
          {item.images.length > 0 && <div className="mt-2 space-y-2">{item.images.map((image, i) => <QuestionImage key={image.url + i} image={image} priority={i === 0} />)}</div>}
          <h1 className="mt-1.5 text-[19px] font-semibold leading-[1.4] tracking-[-0.01em] sm:text-[21px]"><MathText text={item.statement} /></h1>

          <div className={`mt-4 grid gap-2 ${imageOptions ? 'grid-cols-2' : ''}`} role="radiogroup" aria-label="Respostas">
            {item.options.map((option, i) => {
              const isPicked = chosen === option.id
              const isRight = !!fb && fb.correctOptionId === option.id
              const isWrong = !!fb && item.selectedOptionId === option.id && !isRight
              const tone = isRight ? 'bg-[#e4f4ea]' : isWrong ? 'bg-[#fbeaea]' : isPicked ? 'bg-[#e3efe8] ring-1 ring-[#1d4d41]/40' : 'bg-white hover:bg-[#f4f7f2]'
              return (
                <button key={option.id} type="button" role="radio" aria-checked={isPicked} disabled={!!fb || busy || finishing || timeout} onClick={() => setPicked(option.id)} className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors disabled:cursor-default ${tone} ${fb && !isRight && !isWrong ? 'opacity-50' : ''}`}>
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${isRight ? 'bg-[#2f8a5a] text-white' : isWrong ? 'bg-[#c24b4b] text-white' : isPicked ? 'bg-[#1d4d41] text-white' : 'bg-[#1d4d41]/[0.08] text-[#1d4d41]'}`}>
                    {isRight ? <Check size={14} aria-hidden /> : isWrong ? <X size={14} aria-hidden /> : LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1.5 text-[15px] leading-6 text-[#2b332d]">
                    {option.image && <QuestionImage image={option.image} zoomable={false} />}
                    {option.body && <span className="block"><MathText text={option.body} /></span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Zona de ação: no fluxo (nunca tapa as opções). Antes de verificar, o botão; depois, o resultado + «Seguinte». */}
      <footer className="flex-none bg-[#f8f8f5] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-[640px] space-y-2 px-4 pt-2">
          {error && <p role="alert" className="rounded-xl bg-[#fcefef] px-3 py-2 text-[13px] text-[#9a3030]">{error}</p>}
          {timeout && <p className="text-center text-[13px] text-[#7d857e]">Sem tempo! A passar à seguinte…</p>}
          {fb && (
            <div role="status" className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${fb.isCorrect ? 'bg-[#e4f4ea]' : 'bg-[#fbeaea]'}`}>
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-white ${fb.isCorrect ? 'bg-[#2f8a5a]' : 'bg-[#c24b4b]'}`}>{fb.isCorrect ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[14px] font-semibold leading-5 ${fb.isCorrect ? 'text-[#1f6b45]' : 'text-[#9a3030]'}`}>
                  {fb.isCorrect ? (streak >= 3 ? `Acertaste! ${streak} seguidas` : 'Acertaste!') : 'Errado'}{fb.points > 0 && <span className="ml-1.5 text-[12px] font-bold">+{formatPoints(fb.points)} pts</span>}
                </span>
                <span className="block truncate text-[12px] leading-4 text-[#5d675f]">{fb.isCorrect ? 'Continua assim.' : `A certa é a ${correctLetter}. ${WRONG_LINES[item.position % WRONG_LINES.length]}`}</span>
              </span>
              {hasExplanation ? (
                <button type="button" onClick={() => setSheet(true)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold text-[#1d4d41]"><Lightbulb size={14} aria-hidden />Ver explicação</button>
              ) : (
                <Link href="/jonas" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold text-[#1d4d41]"><MessageCircle size={14} aria-hidden />Jonas</Link>
              )}
            </div>
          )}
          {fb ? (
            <button type="button" disabled={finishing} onClick={() => advance(index)} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1d4d41] text-[15px] font-semibold text-white hover:bg-[#163e34] disabled:opacity-60">
              {isLast ? (finishing ? 'A calcular…' : 'Ver resultado') : <>Seguinte<ArrowRight size={18} aria-hidden /></>}
            </button>
          ) : (
            <button type="button" disabled={!picked || busy || finishing || timeout} onClick={() => void verify()} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1d4d41] text-[15px] font-semibold text-white hover:bg-[#163e34] disabled:bg-[#1d4d41]/30">
              {busy ? 'A verificar…' : 'Verificar'}
            </button>
          )}
        </div>
      </footer>

      {/* Explicação: folha por cima, para a página não crescer nem saltar. */}
      {sheet && fb && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/25" onClick={() => setSheet(false)}>
          <div role="dialog" aria-label="Explicação" onClick={(event) => event.stopPropagation()} className="max-h-[75dvh] w-full max-w-[640px] overflow-y-auto rounded-t-3xl bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4d41]">Explicação</p>
              <button type="button" onClick={() => setSheet(false)} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-full text-[#68716a] hover:bg-[#eef0e9]"><X size={18} aria-hidden /></button>
            </div>
            <div className="mt-2 text-[15px] leading-7 text-[#2b332d]">
              {fb.explanation && <MathText text={fb.explanation} />}
              {fb.images.length > 0 && <div className="mt-3 space-y-3">{fb.images.map((image, i) => <QuestionImage key={image.url + i} image={image} />)}</div>}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
