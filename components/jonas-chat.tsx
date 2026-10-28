'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, PanelLeft, RotateCcw, Square, SquarePen, X } from 'lucide-react'
import { HistorySidebar } from '@/components/jonas/history-sidebar'
import { RichText } from '@/components/jonas/rich-text'
import { CopyButton, JonasAvatar, TypingDots } from '@/components/jonas/ui'
import { JonasRequestError, postStream } from '@/lib/jonas-client'
import type { ChatMessage, ConversationSummary } from '@/lib/jonas'

type UiMessage = ChatMessage
type Props = {
  firstName: string
  trackLabel: string | null
  subjects: { id: string; name: string }[]
  initialConversations: ConversationSummary[]
  loadFailed: boolean
  initialConversation: { summary: ConversationSummary; messages: ChatMessage[] } | null
}

// Exemplos simples e práticos: tocar preenche a caixa de texto (não envia), para o aluno completar.
const STARTERS: { text: string; prefill: (subject: string | null) => string }[] = [
  { text: 'Explica-me um conceito com um exemplo simples', prefill: (s) => `Explica-me ${s ? `um tema de ${s}` : 'um conceito'} com um exemplo simples: ` },
  { text: 'Ajuda-me a resolver um exercício passo a passo', prefill: () => 'Ajuda-me a resolver este exercício passo a passo:\n' },
  { text: 'Faz-me um plano de estudo de 2 semanas', prefill: (s) => `Faz-me um plano de estudo de 2 semanas para ${s ?? 'o meu exame'}.` },
]

export function JonasChat({ firstName, trackLabel, subjects, initialConversations, loadFailed, initialConversation }: Props) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeId, setActiveId] = useState<string | null>(initialConversation?.summary.id ?? null)
  const [messages, setMessages] = useState<UiMessage[]>(initialConversation?.messages ?? [])
  const [subjectId, setSubjectId] = useState<string | null>(initialConversation?.summary.subjectId ?? null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showJump, setShowJump] = useState(false)

  const activeRef = useRef(activeId)
  const abortRef = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const stick = useRef(true)
  const lastUserText = useRef('')
  const subjectIdRef = useRef(subjectId)
  useEffect(() => {
    subjectIdRef.current = subjectId
  }, [subjectId])

  const active = activeId ? (conversations.find((item) => item.id === activeId) ?? (initialConversation && initialConversation.summary.id === activeId ? initialConversation.summary : null)) : null
  const subjectName = active?.subjectName ?? subjects.find((item) => item.id === subjectId)?.name ?? null

  // Se o fluxo estiver a decorrer quando se sai da página, cancela-o (o servidor guarda o que já chegou).
  useEffect(() => () => abortRef.current?.abort(), [])

  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages, streaming, opening])

  useEffect(() => {
    const el = textarea.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`
  }, [input])

  function onScroll() {
    const el = scroller.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    stick.current = near
    setShowJump((current) => (current === !near ? current : !near))
  }

  function jumpToEnd() {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    stick.current = true
    setShowJump(false)
  }

  const adopt = useCallback((headers: Headers | null | undefined) => {
    const id = headers?.get('X-Conversation-Id')
    if (!id) return
    const rawTitle = headers?.get('X-Conversation-Title')
    let title = 'Nova conversa'
    try {
      title = rawTitle ? decodeURIComponent(rawTitle) : title
    } catch {
      // título ilegível: fica o genérico
    }
    const isNew = activeRef.current !== id
    if (isNew) {
      activeRef.current = id
      setActiveId(id)
      window.history.replaceState(null, '', `/jonas?c=${encodeURIComponent(id)}`)
    }
    setConversations((previous) => {
      const existing = previous.find((item) => item.id === id)
      const summary: ConversationSummary = { id, title: existing?.title ?? title, subjectId: existing?.subjectId ?? null, subjectName: existing?.subjectName ?? null, updatedAt: new Date().toISOString() }
      if (!existing && isNew) {
        const chosen = subjects.find((item) => item.id === subjectIdRef.current)
        summary.subjectId = chosen?.id ?? null
        summary.subjectName = chosen?.name ?? null
      }
      return [summary, ...previous.filter((item) => item.id !== id)]
    })
  }, [subjects])

  const send = useCallback(
    async (text: string, regenerate = false) => {
      if (streaming) return
      setError(null)
      const currentId = activeRef.current
      const stamp = Date.now()
      const assistantId = `tmp-a-${stamp}`
      if (!regenerate) lastUserText.current = text
      setMessages((previous) => {
        const base = regenerate && previous.length && previous[previous.length - 1].role === 'assistant' ? previous.slice(0, -1) : previous
        return [...base, ...(regenerate ? [] : [{ id: `tmp-u-${stamp}`, role: 'user' as const, content: text }]), { id: assistantId, role: 'assistant' as const, content: '' }]
      })
      stick.current = true
      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)
      try {
        const { headers } = await postStream(
          '/api/jonas',
          { conversationId: currentId ?? undefined, message: regenerate ? undefined : text, regenerate, subjectId: currentId ? undefined : (subjectIdRef.current ?? undefined) },
          (partial) => setMessages((previous) => previous.map((item) => (item.id === assistantId ? { ...item, content: partial } : item))),
          controller.signal,
        )
        adopt(headers)
      } catch (caught) {
        if (controller.signal.aborted) {
          // O aluno parou a resposta: o que já chegou fica (e o servidor guardou).
        } else if (caught instanceof JonasRequestError) {
          adopt(caught.headers)
          setError(caught.message)
        } else {
          setError('A resposta foi interrompida. Podes pedir de novo.')
        }
      } finally {
        setMessages((previous) => previous.filter((item) => !(item.id === assistantId && !item.content)))
        setStreaming(false)
        abortRef.current = null
      }
    },
    [streaming, adopt],
  )

  function submit(event?: React.FormEvent) {
    event?.preventDefault()
    const text = input.trim()
    if (!text || streaming || opening) return
    setInput('')
    void send(text)
  }

  function retry() {
    if (activeRef.current) return void send('', true)
    // Ainda não há conversa no servidor: volta a enviar a mesma pergunta.
    const text = lastUserText.current
    if (!text) return
    setMessages((previous) => (previous.length && previous[previous.length - 1].role === 'user' ? previous.slice(0, -1) : previous))
    void send(text)
  }

  function stop() {
    abortRef.current?.abort()
  }

  const newChat = useCallback(() => {
    abortRef.current?.abort()
    activeRef.current = null
    setActiveId(null)
    setMessages([])
    setSubjectId(null)
    setError(null)
    setInput('')
    setDrawer(false)
    stick.current = true
    window.history.replaceState(null, '', '/jonas')
    textarea.current?.focus()
  }, [])

  async function openConversation(id: string) {
    setDrawer(false)
    if (id === activeRef.current) return
    abortRef.current?.abort()
    setOpening(true)
    setError(null)
    try {
      const response = await fetch(`/api/jonas/conversas/${encodeURIComponent(id)}`, { credentials: 'same-origin' })
      if (!response.ok) throw new Error('falhou')
      const data = (await response.json()) as { summary: ConversationSummary; messages: ChatMessage[] }
      activeRef.current = id
      setActiveId(id)
      setMessages(data.messages)
      setSubjectId(data.summary.subjectId)
      stick.current = true
      window.history.replaceState(null, '', `/jonas?c=${encodeURIComponent(id)}`)
    } catch {
      setError('Não foi possível abrir a conversa. Tenta de novo.')
    } finally {
      setOpening(false)
    }
  }

  async function renameConversation(id: string, title: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/jonas/conversas/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
      if (!response.ok) throw new Error('falhou')
      setConversations((previous) => previous.map((item) => (item.id === id ? { ...item, title: title.trim().slice(0, 120) } : item)))
      return true
    } catch {
      setError('Não foi possível mudar o nome.')
      return false
    }
  }

  async function deleteConversation(id: string): Promise<boolean> {
    setBusyId(id)
    try {
      const response = await fetch(`/api/jonas/conversas/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('falhou')
      setConversations((previous) => previous.filter((item) => item.id !== id))
      if (activeRef.current === id) newChat()
      return true
    } catch {
      setError('Não foi possível eliminar a conversa.')
      return false
    } finally {
      setBusyId(null)
    }
  }

  function toggleSidebar() {
    if (window.matchMedia('(min-width: 1024px)').matches) setCollapsed((value) => !value)
    else setDrawer((value) => !value)
  }

  function fill(text: string) {
    setInput(text)
    requestAnimationFrame(() => {
      const el = textarea.current
      if (!el) return
      el.focus()
      el.setSelectionRange(text.length, text.length)
    })
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    // No telemóvel o Enter muda de linha (o envio é pelo botão); no computador envia.
    if (window.matchMedia('(pointer: coarse)').matches) return
    event.preventDefault()
    submit()
  }

  const lastIndex = messages.length - 1
  const empty = messages.length === 0

  return (
    <div className="fixed inset-0 flex bg-[#f8f8f5] text-[#202321]">
      {drawer && <button type="button" aria-label="Fechar o histórico" onClick={() => setDrawer(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />}

      <aside
        aria-label="Histórico de conversas"
        className={`fixed inset-y-0 left-0 z-40 w-[300px] max-w-[86vw] border-r border-[#e6e9e0] bg-[#f2f4ee] pt-[env(safe-area-inset-top)] transition-[transform,visibility] duration-200 lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:pt-0 lg:transition-[width,visibility] ${drawer ? 'visible translate-x-0' : 'invisible -translate-x-full'} ${collapsed ? 'lg:invisible lg:w-0 lg:overflow-hidden lg:border-r-0' : 'lg:visible lg:w-[300px]'}`}
      >
        <div className="h-full w-[300px] max-w-[86vw] lg:max-w-none">
          <HistorySidebar conversations={conversations} activeId={activeId} loadFailed={loadFailed} busyId={busyId} onNew={newChat} onOpen={(id) => void openConversation(id)} onRename={renameConversation} onDelete={deleteConversation} onClose={() => setDrawer(false)} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-14 shrink-0 items-center gap-1 border-b border-[#eceee7] bg-[#f8f8f5]/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-4">
          <Link href="/aluno" aria-label="Voltar ao painel" className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#5d675f] hover:bg-[#eceee7]"><ArrowLeft size={19} aria-hidden="true" /></Link>
          <button type="button" onClick={toggleSidebar} aria-label="Abrir ou fechar o histórico" className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#5d675f] hover:bg-[#eceee7]"><PanelLeft size={19} aria-hidden="true" /></button>
          <div className="min-w-0 flex-1 px-1.5">
            <h1 className="truncate text-[15px] font-semibold leading-5">{active?.title ?? 'Jonas'}</h1>
            {subjectName && <p className="truncate text-[11.5px] leading-4 text-[#7d887f]">{subjectName}</p>}
          </div>
          <button type="button" onClick={newChat} aria-label="Nova conversa" className="flex size-10 shrink-0 items-center justify-center rounded-full text-[#1d4d41] hover:bg-[#e4ece6]"><SquarePen size={19} aria-hidden="true" /></button>
        </header>

        <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6">
            {opening ? (
              <div aria-busy="true" aria-label="A abrir a conversa" className="space-y-5">
                {[70, 100, 55].map((width, index) => <div key={index} style={{ width: `${width}%` }} className="h-16 animate-pulse rounded-2xl bg-[#eceee7]" />)}
              </div>
            ) : empty ? (
              <div className="flex min-h-[52vh] flex-col justify-center py-6">
                <h2 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.02em]">Olá, {firstName}. O que queres estudar?</h2>
                {trackLabel && <p className="mt-1 text-[13.5px] text-[#7d887f]">{trackLabel}</p>}
                {subjects.length > 0 && (
                  <label className="mt-5 block">
                    <span className="sr-only">Disciplina (opcional)</span>
                    <select value={subjectId ?? ''} onChange={(event) => setSubjectId(event.target.value || null)} className="h-10 w-full max-w-xs rounded-xl border border-[#dfe3d9] bg-white px-3 text-[14px] text-[#202321] outline-none focus:border-[#1d4d41]">
                      <option value="">Todas as disciplinas</option>
                      {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                    </select>
                  </label>
                )}
                <ul className="mt-5 space-y-2">
                  {STARTERS.map(({ text, prefill }) => (
                    <li key={text}>
                      <button type="button" onClick={() => fill(prefill(subjects.find((item) => item.id === subjectId)?.name ?? null))} className="w-full rounded-xl border border-[#e1e4db] bg-white px-4 py-3 text-left text-[14.5px] leading-5 text-[#202321] transition hover:border-[#1d4d41]/40 active:scale-[0.99]">{text}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="space-y-7">
                {messages.map((message, index) => {
                  const isLast = index === lastIndex
                  if (message.role === 'user') {
                    return (
                      <li key={message.id} className="flex justify-end">
                        <div className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-gradient-to-br from-[#2f7260] to-[#1d4d41] px-4 py-2.5 text-[15.5px] leading-6 text-white">{message.content}</div>
                      </li>
                    )
                  }
                  const writing = streaming && isLast
                  return (
                    <li key={message.id} className="flex gap-3">
                      <JonasAvatar />
                      <div className="min-w-0 flex-1 pt-0.5" aria-busy={writing}>
                        {message.content ? <RichText text={message.content} /> : <TypingDots />}
                        {!writing && message.content && (
                          <div className="-ml-2.5 mt-1.5 flex items-center gap-1">
                            <CopyButton text={message.content} />
                            {isLast && !streaming && (
                              <button type="button" onClick={() => void send('', true)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-[#68716a] transition-colors hover:bg-[#eef1e9] hover:text-[#1d4d41]"><RotateCcw size={13} aria-hidden="true" />Responder de novo</button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="relative shrink-0 bg-gradient-to-t from-[#f8f8f5] via-[#f8f8f5] to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
          <div className="mx-auto w-full max-w-[760px]">
            {showJump && !empty && (
              <button type="button" onClick={jumpToEnd} aria-label="Ir para o fim da conversa" className="absolute -top-11 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full bg-white text-[#1d4d41] shadow-[0_2px_10px_rgba(20,50,40,0.18)] ring-1 ring-black/[0.05]"><ArrowDown size={17} aria-hidden="true" /></button>
            )}
            {error && (
              <div role="alert" className="mb-2 flex items-center gap-2 rounded-2xl bg-[#fcefee] py-2 pl-4 pr-2 text-[13.5px] text-[#8e3730]">
                <span className="min-w-0 flex-1">{error}</span>
                {!streaming && <button type="button" onClick={retry} className="h-8 shrink-0 rounded-full bg-white px-3 text-[12.5px] font-semibold text-[#8e3730]">Tentar de novo</button>}
                <button type="button" onClick={() => setError(null)} aria-label="Fechar o aviso" className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/70"><X size={15} aria-hidden="true" /></button>
              </div>
            )}
            <form onSubmit={submit} className="flex items-end gap-2 rounded-[26px] bg-white p-2 shadow-[0_2px_12px_rgba(20,50,40,0.10)] ring-1 ring-black/[0.05] focus-within:ring-2 focus-within:ring-[#1d4d41]/25">
              <label htmlFor="jonas-input" className="sr-only">Mensagem para o Jonas</label>
              <textarea id="jonas-input" ref={textarea} rows={1} value={input} maxLength={4000} onChange={(event) => setInput(event.target.value)} onKeyDown={onKeyDown} placeholder={empty ? 'Escreve a tua dúvida…' : 'Continua a conversa…'} className="max-h-44 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-[15.5px] leading-6 outline-none placeholder:text-[#98a19a]" />
              {streaming ? (
                <button type="button" onClick={stop} aria-label="Parar a resposta" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#202923] text-white"><Square size={13} fill="currentColor" aria-hidden="true" /></button>
              ) : (
                <button type="submit" disabled={!input.trim() || opening} aria-label="Enviar mensagem" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2f7260] to-[#1d4d41] text-white shadow-[0_2px_6px_rgba(29,77,65,0.25)] transition disabled:opacity-35 disabled:shadow-none"><ArrowUp size={18} aria-hidden="true" /></button>
              )}
            </form>
            <p className="mt-2 text-center text-[11px] text-[#8a948c]">O Jonas pode errar. Confirma sempre com o teu professor.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
