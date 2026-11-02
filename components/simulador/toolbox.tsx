'use client'

import { QuestionStatement } from '@/components/simulador/question-statement'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Bookmark, BookmarkCheck, Check, ExternalLink, Flag, Lightbulb, Repeat, Sparkles, Wrench, X } from 'lucide-react'
import { MathText } from '@/lib/math-text'
import { askHint, createSimilar, loadRelated, markForLater, sendReport, submitSimilar, unmarkForLater } from '@/app/aluno/simulador/ferramentas-actions'
import type { AttemptMode, PlayHint, PlayItem } from '@/lib/simulator-shared'
import type { RelatedItem, RemindChoice, SimilarQuestion, SimilarResult } from '@/lib/kit'

// Kit de ferramentas do quiz: um botão flutuante abre uma folha com o que ajuda NESTE momento da questão.
// Antes de responder: dica (custa pontos), matéria relacionada, estudar depois, reportar.
// Depois de responder: porque errei, perguntar ao Jonas, questão parecida, e as mesmas de apoio.
// As cores seguem o propósito: azul = ajuda, índigo = Jonas e revisão, laranja = atenção, verde = ação, neutro = administrativo.

const LETTERS = ['A', 'B', 'C', 'D', 'E']
type View = 'menu' | 'dica' | 'materia' | 'depois' | 'parecida' | 'reportar'

const REMIND_LABELS: { value: RemindChoice; label: string; hint: string }[] = [
  { value: 'hoje', label: 'Hoje', hint: 'Lembro-te ao fim do dia' },
  { value: 'amanha', label: 'Amanhã', hint: 'Primeira coisa do dia' },
  { value: 'fim-de-semana', label: 'No fim de semana', hint: 'Sábado, com calma' },
  { value: 'sem-data', label: 'Sem data', hint: 'Fica na tua lista' },
]
const REPORT_REASONS = [
  { value: 'enunciado', label: 'O enunciado tem um erro' },
  { value: 'resposta', label: 'A resposta certa parece errada' },
  { value: 'figura', label: 'A figura não se vê bem' },
  { value: 'outro', label: 'Outro problema' },
]

type Tone = 'ajuda' | 'assistente' | 'aviso' | 'sucesso' | 'neutro'
const TONES: Record<Tone, string> = {
  ajuda: 'bg-ajuda-suave text-ajuda',
  assistente: 'bg-assistente-suave text-assistente',
  aviso: 'bg-aviso-suave text-aviso',
  sucesso: 'bg-sucesso-suave text-sucesso-texto',
  neutro: 'bg-[#f1efe8] text-[#444441]',
}

function Tile({ icon: Icon, tone, label, note, disabled, onClick }: { icon: typeof Wrench; tone: Tone; label: string; note?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-linha bg-white p-3 text-left transition active:scale-[0.98] disabled:opacity-50">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}><Icon size={20} aria-hidden /></span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold leading-5">{label}</span>
        {note && <span className="block text-[12px] leading-4 text-texto-2">{note}</span>}
      </span>
    </button>
  )
}

export function Toolbox({ attemptId, mode, item, wasWrong, onHints, onMarked, onOpenJonas }: {
  attemptId: string
  mode: AttemptMode
  item: PlayItem
  wasWrong: boolean
  onHints: (hints: PlayHint[]) => void
  onMarked: (marked: boolean) => void
  onOpenJonas: (startWith: 'porque' | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('menu')
  const fab = useRef<HTMLButtonElement>(null)
  const answered = !!item.feedback
  const timed = mode === 'rapido'

  const close = useCallback(() => {
    setOpen(false)
    setView('menu')
    fab.current?.focus()
  }, [])

  // Cada questão começa com o menu; o atalho T abre e fecha (fora de campos de texto).
  useEffect(() => { setOpen(false); setView('menu') }, [item.position])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (event.key === 'Escape' && open) close()
      else if ((event.key === 't' || event.key === 'T') && !event.ctrlKey && !event.metaKey && !event.altKey) setOpen((value) => !value)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close, timed, answered])

  // No Modo rápido o tempo corre: antes de responder não há ferramentas, para ninguém perder segundos a escolher.
  const hintsLeft = item.options.length >= 3 ? 3 - item.hints.length : 2 - item.hints.length
  const titles: Record<View, string> = { menu: 'Ferramentas', dica: 'Dica', materia: 'Matéria relacionada', depois: 'Estudar depois', parecida: 'Questão parecida', reportar: 'Reportar questão' }

  return (
    <>
      <button
        ref={fab}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="T"
        aria-label="Ferramentas da questão"
        className="kit-fab"
      >
        <Wrench size={24} aria-hidden />
        {wasWrong && !open && <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full bg-aviso ring-2 ring-fundo" aria-hidden />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={close}>
          <div role="dialog" aria-modal="true" aria-label={titles[view]} onClick={(event) => event.stopPropagation()} className="flex max-h-[88dvh] w-full max-w-[640px] flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(20,50,40,0.18)]">
            <div className="mx-auto mt-2 h-1 w-9 flex-none rounded-full bg-[#d3d1c7]" aria-hidden />
            <div className="flex flex-none items-center gap-1 px-3 pb-1 pt-2">
              {view !== 'menu' ? (
                <button type="button" onClick={() => setView('menu')} aria-label="Voltar às ferramentas" className="btn btn-icone"><ArrowLeft size={20} aria-hidden /></button>
              ) : <span className="w-2" />}
              <h2 className="min-w-0 flex-1 text-[16px] font-semibold">{titles[view]}</h2>
              <button type="button" onClick={close} autoFocus aria-label="Fechar" className="btn btn-icone"><X size={20} aria-hidden /></button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
              {view === 'menu' && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {wasWrong && <Tile icon={Lightbulb} tone="aviso" label="Porque errei" note="O Jonas encontra o engano" onClick={() => { close(); onOpenJonas('porque') }} />}
                  {answered && <Tile icon={Sparkles} tone="assistente" label="Pergunta ao Jonas" note="Explicação e dúvidas" onClick={() => { close(); onOpenJonas(null) }} />}
                  {!answered && !timed && <Tile icon={Lightbulb} tone="ajuda" label="Dica" note={item.hints.length ? `${item.hints.length} de ${item.options.length >= 3 ? 3 : 2} usadas` : 'Custa 25 % dos pontos'} onClick={() => setView('dica')} />}
                  {(answered || !timed) && <Tile icon={BookOpen} tone="ajuda" label="Matéria relacionada" note="Da Biblioteca" onClick={() => setView('materia')} />}
                  {answered && <Tile icon={Repeat} tone="sucesso" label="Questão parecida" note="Treina mais, criada por IA" onClick={() => setView('parecida')} />}
                  <Tile icon={item.marked ? BookmarkCheck : Bookmark} tone="assistente" label="Estudar depois" note={item.marked ? 'Guardada' : 'Escolhe quando'} onClick={() => setView('depois')} />
                  <Tile icon={Flag} tone="neutro" label="Reportar questão" note="Erro no enunciado" onClick={() => setView('reportar')} />
                </div>
              )}
              {view === 'dica' && <HintView attemptId={attemptId} item={item} left={hintsLeft} onHints={onHints} />}
              {view === 'materia' && <RelatedView questionId={item.questionId} />}
              {view === 'depois' && <LaterView item={item} onMarked={onMarked} onDone={() => setView('menu')} />}
              {view === 'parecida' && <SimilarView attemptId={attemptId} position={item.position} />}
              {view === 'reportar' && <ReportView questionId={item.questionId} onDone={close} />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ErrorLine({ text }: { text: string | null }) {
  return text ? <p role="alert" className="mt-3 rounded-xl bg-erro-suave px-3 py-2 text-[13px] text-erro-texto">{text}</p> : null
}

// ───────────── Dica ─────────────

const HINT_TITLES = ['A ideia', 'O primeiro passo', 'Uma opção eliminada']

function HintView({ attemptId, item, left, onHints }: { attemptId: string; item: PlayItem; left: number; onHints: (hints: PlayHint[]) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const next = (item.hints.length + 1) as 1 | 2 | 3
  const spent = Math.min(75, item.hints.length * 25)

  async function ask() {
    if (busy) return
    setBusy(true)
    setError(null)
    const res = await askHint({ attemptId, position: item.position, level: next }).catch(() => null)
    setBusy(false)
    if (!res) return setError('Sem ligação. Verifica a internet e tenta de novo.')
    if (!res.ok) return setError(res.message)
    onHints([...item.hints.filter((h) => h.level !== res.data.level), res.data].sort((a, b) => a.level - b.level))
  }

  return (
    <div>
      <p className="text-[13px] text-texto-2">Uma dica de cada vez, sem dizer a resposta. Cada dica gasta 25 % dos pontos desta questão{spent > 0 ? `; já gastaste ${spent} %` : ''}.</p>
      <ol className="mt-3 space-y-2">
        {item.hints.map((hint) => (
          <li key={hint.level} className="rounded-2xl bg-ajuda-suave p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ajuda">{hint.level}. {HINT_TITLES[hint.level - 1]}</p>
            <div className="mt-1 text-[15px] leading-6 text-texto">
              {hint.level === 3 ? <>A opção <b>{LETTERS[Math.max(0, item.options.findIndex((o) => o.id === hint.content))]}</b> está errada. Já a podes riscar.</> : <MathText text={hint.content} />}
            </div>
          </li>
        ))}
      </ol>
      <ErrorLine text={error} />
      {left > 0 ? (
        <button type="button" disabled={busy} onClick={() => void ask()} className="btn btn-primario btn-grande mt-3 w-full">
          {busy ? 'A pensar…' : item.hints.length === 0 ? 'Pedir a primeira dica' : `Pedir a dica ${next}: ${HINT_TITLES[next - 1].toLowerCase()}`}
        </button>
      ) : (
        <p className="mt-3 rounded-xl bg-[#f1efe8] px-3 py-2 text-[13px] text-texto-2">Usaste todas as dicas desta questão. Escolhe a tua resposta.</p>
      )}
    </div>
  )
}

// ───────────── Matéria relacionada ─────────────

function RelatedView({ questionId }: { questionId: string }) {
  const [state, setState] = useState<{ topic: string | null; subject: string; items: RelatedItem[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setState(null)
    void loadRelated({ questionId })
      .then((res) => { if (!cancelled) (res.ok ? setState(res.data) : setError(res.message)) })
      .catch(() => { if (!cancelled) setError('Sem ligação. Verifica a internet.') })
    return () => { cancelled = true }
  }, [questionId, tries])

  if (error) return <div><ErrorLine text={error} /><button type="button" onClick={() => setTries((n) => n + 1)} className="btn btn-secundario mt-3">Tentar de novo</button></div>
  if (!state) return <p className="py-6 text-center text-[14px] text-texto-2" aria-live="polite">A procurar na Biblioteca…</p>
  if (state.items.length === 0) {
    return (
      <div className="py-2">
        <p className="text-[14px]">Ainda não há materiais de {state.subject} na Biblioteca.</p>
        <a href="/biblioteca" target="_blank" rel="noopener" className="btn btn-secundario mt-3">Abrir a Biblioteca<ExternalLink size={16} aria-hidden /></a>
      </div>
    )
  }
  const anyTopic = state.items.some((i) => i.byTopic)
  return (
    <div>
      <p className="text-[13px] text-texto-2">{anyTopic && state.topic ? `Materiais de ${state.subject} que falam de «${state.topic}».` : `Materiais de ${state.subject}.${state.topic ? ' Nenhum fala diretamente do tema desta questão.' : ''}`}</p>
      <ul className="mt-3 space-y-2">
        {state.items.map((m) => (
          <li key={m.id}>
            <a href={m.href} target="_blank" rel="noopener" className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-linha bg-white p-3 no-underline">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ajuda-suave text-ajuda"><BookOpen size={19} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-texto">{m.title}</span>
                <span className="block text-[12px] text-texto-2">{m.category}{m.byTopic ? ' · fala do tema' : ''}</span>
              </span>
              <ExternalLink size={16} className="shrink-0 text-texto-2" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ───────────── Estudar depois ─────────────

function LaterView({ item, onMarked, onDone }: { item: PlayItem; onMarked: (marked: boolean) => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function save(remind: RemindChoice, label: string) {
    if (busy) return
    setBusy(true)
    setError(null)
    const res = await markForLater({ questionId: item.questionId, remind }).catch(() => null)
    setBusy(false)
    if (!res) return setError('Sem ligação. Verifica a internet e tenta de novo.')
    if (!res.ok) return setError(res.message)
    onMarked(true)
    setSaved(label)
  }

  async function remove() {
    setBusy(true)
    const res = await unmarkForLater({ questionId: item.questionId }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setError(res?.message ?? 'Sem ligação. Verifica a internet e tenta de novo.')
    onMarked(false)
    onDone()
  }

  if (saved) {
    return (
      <div className="py-2">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-sucesso-texto"><Check size={18} aria-hidden />Guardada: {saved.toLowerCase()}.</p>
        <p className="mt-1 text-[13px] text-texto-2">Vais encontrá-la em «Estudar depois» no menu e no teu plano do dia.</p>
        <button type="button" onClick={onDone} className="btn btn-secundario mt-3">Voltar às ferramentas</button>
      </div>
    )
  }
  return (
    <div>
      <p className="text-[13px] text-texto-2">{item.marked ? 'Esta questão já está guardada. Podes mudar quando a queres rever.' : 'Quando queres voltar a esta questão?'}</p>
      <div className="mt-3 grid gap-2">
        {REMIND_LABELS.map((choice) => (
          <button key={choice.value} type="button" disabled={busy} onClick={() => void save(choice.value, choice.label)} className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border border-linha bg-white px-4 text-left active:scale-[0.99] disabled:opacity-50">
            <span><span className="block text-[15px] font-semibold">{choice.label}</span><span className="block text-[12px] text-texto-2">{choice.hint}</span></span>
            <Bookmark size={18} className="text-assistente" aria-hidden />
          </button>
        ))}
      </div>
      <ErrorLine text={error} />
      {item.marked && <button type="button" disabled={busy} onClick={() => void remove()} className="btn btn-perigo mt-3 w-full">Tirar da lista</button>}
    </div>
  )
}

// ───────────── Questão parecida (IA) ─────────────

function SimilarView({ attemptId, position }: { attemptId: string; position: number }) {
  const [question, setQuestion] = useState<SimilarQuestion | null>(null)
  const [result, setResult] = useState<SimilarResult | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    if (busy) return
    setBusy(true)
    setError(null)
    setResult(null)
    setPicked(null)
    const res = await createSimilar({ attemptId, position }).catch(() => null)
    setBusy(false)
    if (!res) return setError('Sem ligação. Verifica a internet e tenta de novo.')
    if (!res.ok) return setError(res.message)
    setQuestion(res.data)
  }

  async function answer() {
    if (!question || picked === null || busy) return
    setBusy(true)
    setError(null)
    const res = await submitSimilar({ id: question.id, choice: picked }).catch(() => null)
    setBusy(false)
    if (!res) return setError('Sem ligação. Verifica a internet e tenta de novo.')
    if (!res.ok) return setError(res.message)
    setResult(res.data)
  }

  if (!question) {
    return (
      <div>
        <p className="text-[14px]">O Jonas cria uma questão nova do mesmo tema, com outros números, para treinares.</p>
        <p className="mt-1 text-[12px] text-texto-2">Não conta para os teus pontos nem para o ranking.</p>
        <ErrorLine text={error} />
        <button type="button" disabled={busy} onClick={() => void create()} className="btn btn-primario btn-grande mt-3 w-full">{busy ? 'A criar a questão…' : 'Criar questão parecida'}</button>
      </div>
    )
  }
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-assistente">Criada por IA</p>
      <div className="mt-1"><QuestionStatement text={question.statement} compact /></div>
      <div className="mt-3 grid gap-2" role="radiogroup" aria-label="Respostas">
        {question.options.map((text, i) => {
          const right = result && result.correctIndex === i
          const wrong = result && result.chosen === i && !right
          const tone = right ? 'border-sucesso bg-sucesso-suave' : wrong ? 'border-erro bg-erro-suave' : picked === i ? 'border-marca bg-marca-suave' : 'border-linha bg-white'
          return (
            <button key={i} type="button" role="radio" aria-checked={picked === i} disabled={!!result || busy} onClick={() => setPicked(i)} className={`flex min-h-[48px] items-center gap-3 rounded-xl border-2 px-3 py-2 text-left ${tone}`}>
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold ${right ? 'bg-sucesso text-white' : wrong ? 'bg-erro text-white' : 'bg-[#edf0e9] text-marca'}`}>{right ? <Check size={14} aria-hidden /> : wrong ? <X size={14} aria-hidden /> : LETTERS[i]}</span>
              <span className="min-w-0 flex-1 text-[15px] leading-6"><MathText text={text} /></span>
              {right && <span className="text-[12px] font-semibold text-sucesso-texto">Certa</span>}
              {wrong && <span className="text-[12px] font-semibold text-erro-texto">A tua resposta</span>}
            </button>
          )
        })}
      </div>
      <ErrorLine text={error} />
      {result ? (
        <div className="mt-3">
          <p role="status" className={`text-[15px] font-semibold ${result.correct ? 'text-sucesso-texto' : 'text-erro-texto'}`}>{result.correct ? 'Acertaste!' : `A certa é a ${LETTERS[result.correctIndex]}.`}</p>
          {result.explanation && <p className="mt-1 text-[14px] leading-6"><MathText text={result.explanation} /></p>}
          <p className="mt-2 text-[12px] text-texto-2">Criada por IA, pode ter erros. Na dúvida, pergunta ao Jonas ou ao teu professor.</p>
          <button type="button" disabled={busy} onClick={() => void create()} className="btn btn-primario mt-3 w-full">{busy ? 'A criar…' : 'Outra parecida'}</button>
        </div>
      ) : (
        <button type="button" disabled={picked === null || busy} onClick={() => void answer()} className="btn btn-primario btn-grande mt-3 w-full">{busy ? 'A verificar…' : 'Verificar'}</button>
      )}
    </div>
  )
}

// ───────────── Reportar ─────────────

function ReportView({ questionId, onDone }: { questionId: string; onDone: () => void }) {
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!reason || busy) return
    setBusy(true)
    setError(null)
    const res = await sendReport({ questionId, reason, note }).catch(() => null)
    setBusy(false)
    if (!res) return setError('Sem ligação. Verifica a internet e tenta de novo.')
    if (!res.ok) return setError(res.message)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="py-2">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-sucesso-texto"><Check size={18} aria-hidden />Obrigado, a equipa vai ver.</p>
        <button type="button" onClick={onDone} className="btn btn-secundario mt-3">Continuar</button>
      </div>
    )
  }
  return (
    <div>
      <div className="grid gap-2" role="radiogroup" aria-label="Motivo">
        {REPORT_REASONS.map((r) => (
          <button key={r.value} type="button" role="radio" aria-checked={reason === r.value} onClick={() => setReason(r.value)} className={`min-h-[48px] rounded-xl border-2 px-3 text-left text-[14px] font-medium ${reason === r.value ? 'border-marca bg-marca-suave' : 'border-linha bg-white'}`}>{r.label}</button>
        ))}
      </div>
      <label htmlFor="report-note" className="mt-3 block text-[13px] text-texto-2">Queres explicar melhor? (opcional)</label>
      <textarea id="report-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-1 w-full resize-none rounded-xl border border-linha bg-white p-3 text-[15px] outline-none focus:border-marca" />
      <ErrorLine text={error} />
      <button type="button" disabled={!reason || busy} onClick={() => void send()} className="btn btn-primario btn-grande mt-3 w-full">{busy ? 'A enviar…' : 'Enviar reporte'}</button>
    </div>
  )
}

