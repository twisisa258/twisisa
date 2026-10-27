'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowUp, Lightbulb, RotateCcw, Sparkles, X } from 'lucide-react'
import { RichText } from '@/components/jonas/rich-text'
import { JonasAvatar, TypingDots } from '@/components/jonas/ui'
import { QuestionImage } from '@/components/simulador/question-image'
import { MathText } from '@/lib/math-text'
import { JonasRequestError, postStream } from '@/lib/jonas-client'
import { EXPLAIN_LABELS, type ExplainAction } from '@/lib/jonas-prompts'
import type { PlayImage } from '@/lib/simulator-shared'

type Msg = { id: string; role: 'user' | 'assistant'; content: string }

// Atalhos depois da explicação: o Jonas aprofunda sem o aluno sair do Simulador.
const SHORTCUTS: { action: Exclude<ExplainAction, 'passo' | 'pergunta'>; label: string }[] = [
  { action: 'devagar', label: 'Mais devagar' },
  { action: 'exemplo', label: 'Dá um exemplo' },
  { action: 'outras', label: 'As outras opções' },
  { action: 'resumo', label: 'Resumo' },
]

const chip = 'inline-flex h-9 shrink-0 items-center rounded-full bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] px-3.5 text-[13px] font-semibold text-[#1d4d41] shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_1px_4px_rgba(29,77,65,0.10)] ring-1 ring-[#1d4d41]/10 transition active:scale-[0.98] hover:from-[#e2eee7] hover:to-[#cbe0d3] disabled:opacity-50'

/**
 * Folha com a explicação do Jonas para UMA questão já respondida. Fica montada enquanto a questão está no ecrã:
 * fechar e abrir de novo não repete o pedido. Se o Jonas não estiver disponível, mostra a explicação escrita pela equipa (se existir).
 */
export function JonasExplainSheet({ attemptId, position, open, onClose, officialExplanation, images }: { attemptId: string; position: number; open: boolean; onClose: () => void; officialExplanation: string | null; images: PlayImage[] }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const started = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const body = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  useEffect(() => () => abortRef.current?.abort(), [])

  useLayoutEffect(() => {
    const el = body.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages, loading, error, open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const ask = useCallback(
    async (action: ExplainAction, text = '') => {
      if (abortRef.current) return
      setError(null)
      const stamp = Date.now()
      const assistantId = `a-${stamp}`
      const showUser = action !== 'passo'
      setMessages((previous) => [...previous, ...(showUser ? [{ id: `u-${stamp}`, role: 'user' as const, content: action === 'pergunta' ? text : EXPLAIN_LABELS[action] }] : []), { id: assistantId, role: 'assistant', content: '' }])
      stick.current = true
      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)
      try {
        await postStream('/api/jonas/explicar', { attemptId, position, action, text: text || undefined }, (partial) => setMessages((previous) => previous.map((item) => (item.id === assistantId ? { ...item, content: partial } : item))), controller.signal)
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof JonasRequestError ? caught.message : 'A resposta foi interrompida. Tenta de novo.')
      } finally {
        setMessages((previous) => previous.filter((item) => !(item.id === assistantId && !item.content)))
        setStreaming(false)
        abortRef.current = null
      }
    },
    [attemptId, position],
  )

  // Primeira abertura: usa a explicação já guardada (sem gastar IA); se não há, pede ao Jonas o passo a passo.
  useEffect(() => {
    if (!open || started.current) return
    started.current = true
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/jonas/explicar?attemptId=${encodeURIComponent(attemptId)}&position=${position}`, { credentials: 'same-origin' })
        if (response.ok) {
          const data = (await response.json()) as { messages: Msg[] }
          if (!cancelled && data.messages.some((message) => message.role === 'assistant')) {
            // O primeiro pedido («passo a passo») não se mostra como balão: a resposta já o diz.
            setMessages(data.messages.filter((message, index) => !(index === 0 && message.role === 'user' && message.content === EXPLAIN_LABELS.passo)))
            setLoading(false)
            return
          }
        }
      } catch {
        // sem ligação: tenta pedir mesmo assim, o erro aparece com «Tentar de novo»
      }
      if (cancelled) return
      setLoading(false)
      await ask('passo')
    })()
    return () => {
      cancelled = true
    }
  }, [open, attemptId, position, ask])

  function onScroll() {
    const el = body.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || streaming || loading) return
    setInput('')
    void ask('pergunta', text)
  }

  function retry() {
    const last = messages[messages.length - 1]
    // Sem nenhuma resposta ainda: repete o passo a passo; com conversa, deixa o aluno escolher outro atalho.
    if (!messages.some((message) => message.role === 'assistant')) void ask('passo')
    else if (last?.role === 'user') void ask('pergunta', last.content)
    else setError(null)
  }

  if (!open) return null
  const hasAnswer = messages.some((message) => message.role === 'assistant' && message.content)
  const showOfficial = !!officialExplanation && !hasAnswer && !streaming && !loading

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Explicação do Jonas" onClick={(event) => event.stopPropagation()} className="flex max-h-[88dvh] w-full max-w-[640px] flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(20,50,40,0.18)]">
        <div className="flex flex-none items-center gap-2.5 px-5 pb-2 pt-4">
          <JonasAvatar size={30} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-5">Jonas</p>
            <p className="text-[12px] leading-4 text-[#7d887f]">Explicação passo a passo</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" autoFocus className="flex size-10 items-center justify-center rounded-full text-[#68716a] hover:bg-[#eef0e9]"><X size={19} aria-hidden="true" /></button>
        </div>

        <div ref={body} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3">
          {images.length > 0 && <div className="mb-3 space-y-3">{images.map((image, i) => <QuestionImage key={image.url + i} image={image} />)}</div>}

          {loading && <TypingDots />}
          <div className="space-y-5">
            {messages.map((message) =>
              message.role === 'user' ? (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-gradient-to-br from-[#2f7260] to-[#1d4d41] px-3.5 py-2 text-[14.5px] leading-6 text-white">{message.content}</p>
                </div>
              ) : (
                <div key={message.id} aria-busy={streaming && message === messages[messages.length - 1]}>
                  {message.content ? <RichText text={message.content} /> : <TypingDots />}
                </div>
              ),
            )}
          </div>

          {showOfficial && (
            <div className="mt-3 rounded-2xl bg-[#f6f8f3] p-4 text-[15px] leading-7 text-[#2b332d]">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#1d4d41]"><Lightbulb size={13} aria-hidden="true" />Explicação da equipa</p>
              <MathText text={officialExplanation} />
            </div>
          )}

          {error && (
            <div role="alert" className="mt-3 flex items-center gap-2 rounded-2xl bg-[#fcefee] py-2 pl-4 pr-2 text-[13.5px] text-[#8e3730]">
              <span className="min-w-0 flex-1">{error}</span>
              {!streaming && <button type="button" onClick={retry} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-[12.5px] font-semibold"><RotateCcw size={12} aria-hidden="true" />Tentar de novo</button>}
            </div>
          )}
        </div>

        <div className="flex-none space-y-2.5 border-t border-[#eef0e9] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {hasAnswer && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
              {SHORTCUTS.map((shortcut) => (
                <button key={shortcut.action} type="button" disabled={streaming} onClick={() => void ask(shortcut.action)} className={chip}>{shortcut.label}</button>
              ))}
            </div>
          )}
          <form onSubmit={submit} className="flex items-center gap-2 rounded-full bg-[#f4f6f1] p-1.5 pl-4 ring-1 ring-black/[0.04] focus-within:ring-2 focus-within:ring-[#1d4d41]/25">
            <Sparkles size={15} className="shrink-0 text-[#1d4d41]" aria-hidden="true" />
            <label htmlFor={`jonas-q-${position}`} className="sr-only">Pergunta ao Jonas sobre esta questão</label>
            <input id={`jonas-q-${position}`} value={input} maxLength={1000} onChange={(event) => setInput(event.target.value)} placeholder="Pergunta ao Jonas sobre esta questão…" className="h-9 min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-[#98a19a]" />
            <button type="submit" disabled={!input.trim() || streaming || loading} aria-label="Enviar pergunta" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2f7260] to-[#1d4d41] text-white disabled:opacity-35"><ArrowUp size={17} aria-hidden="true" /></button>
          </form>
        </div>
      </div>
    </div>
  )
}

/** Botão «Ver explicação» com a folha do Jonas (para a revisão no resultado). */
export function ExplainButton({ attemptId, position, officialExplanation, images }: { attemptId: string; position: number; officialExplanation: string | null; images: PlayImage[] }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-br from-[#2f7260] to-[#1d4d41] px-4 text-[13.5px] font-semibold text-white shadow-[0_2px_6px_rgba(29,77,65,0.25)] transition active:scale-[0.98] hover:from-[#2a6858] hover:to-[#183f35]">
        <Sparkles size={15} aria-hidden="true" />Ver explicação
      </button>
      <JonasExplainSheet attemptId={attemptId} position={position} open={open} onClose={close} officialExplanation={officialExplanation} images={images} />
    </>
  )
}
