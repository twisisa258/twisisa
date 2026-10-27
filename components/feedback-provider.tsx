'use client'

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'

type Kind = 'success' | 'error'
type Feedback = { kind: Kind; title: string; message: string }
type FeedbackApi = {
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  close: () => void
}

const FeedbackContext = createContext<FeedbackApi | null>(null)

const SUCCESS_AUTO_CLOSE_MS = 3500

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) throw new Error('useFeedback tem de ser usado dentro de <FeedbackProvider>.')
  return context
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const close = useCallback(() => setFeedback(null), [])
  const success = useCallback((message: string, title = 'Concluído') => setFeedback({ kind: 'success', title, message }), [])
  const error = useCallback((message: string, title = 'Algo correu mal') => setFeedback({ kind: 'error', title, message }), [])
  const api = useMemo(() => ({ success, error, close }), [success, error, close])

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {feedback && <FeedbackDialog feedback={feedback} onClose={close} />}
    </FeedbackContext.Provider>
  )
}

function FeedbackDialog({ feedback, onClose }: { feedback: Feedback; onClose: () => void }) {
  const titleId = useId()
  const messageId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const isError = feedback.kind === 'error'

  // Foco no botão ao abrir e de volta ao elemento anterior ao fechar; Escape fecha; a página não desloca por baixo.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    buttonRef.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [onClose])

  // Sucesso fecha sozinho; o erro fica até ser fechado, para dar tempo de ler.
  useEffect(() => {
    if (isError) return
    const timer = window.setTimeout(onClose, SUCCESS_AUTO_CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [isError, onClose, feedback])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button type="button" tabIndex={-1} aria-label="Fechar" onClick={onClose} className="absolute inset-0 cursor-default bg-[#202923]/50 animate-in fade-in motion-reduce:animate-none" />
      <div
        role={isError ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 motion-reduce:animate-none"
      >
        <span className={`mx-auto flex size-12 items-center justify-center rounded-full ${isError ? 'bg-[#fbeeee] text-[#9a3030]' : 'bg-[#edf3ee] text-[#1d4d41]'}`}>
          {isError ? <CircleAlert size={26} /> : <CircleCheck size={26} />}
        </span>
        <h2 id={titleId} className="mt-4 text-lg font-semibold text-[#202923]">{feedback.title}</h2>
        <p id={messageId} className="mt-1.5 text-sm leading-6 text-[#68736a]">{feedback.message}</p>
        <button
          ref={buttonRef}
          type="button"
          onClick={onClose}
          className={`mt-5 inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold text-white ${isError ? 'bg-[#9a3030] hover:bg-[#7f2626]' : 'bg-[#1d4d41] hover:bg-[#163e34]'}`}
        >
          {isError ? 'Fechar' : 'Ok'}
        </button>
      </div>
    </div>
  )
}
