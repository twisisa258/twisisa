'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowRight, Play } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useFeedback } from '@/components/feedback-provider'
import { startSession } from '@/app/aluno/simulador/actions'
import { MODO_UI } from '@/components/simulador/modos'
import { cn } from '@/lib/utils'
import type { AttemptMode } from '@/lib/simulator-shared'

type Props = { mode: AttemptMode; subjectId: string; variant?: string | null; topicId?: string | null; title: string; caption?: string; secondary?: boolean; disabled?: boolean }

// Último passo: começar. Cada cartão arranca uma sessão; a cor é a do modo escolhido.
export function StartCard({ mode, subjectId, variant = null, topicId = null, title, caption, secondary = false, disabled = false }: Props) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, startTransition] = useTransition()
  const [started, setStarted] = useState(false)
  const busy = pending || started

  function start() {
    if (busy || disabled) return
    startTransition(async () => {
      try {
        const result = await startSession({ mode, subjectId, variant, topicId })
        if (!result.ok) return feedback.error(result.message)
        setStarted(true)
        router.push(`/aluno/simulador/sessao/${result.data.id}`)
      } catch {
        feedback.error('Sem ligação. Verifica a internet e tenta de novo.')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy || disabled}
      className={cn('sf sf-toque group flex min-h-[64px] w-full items-center gap-3.5 px-4 py-3 text-left disabled:cursor-not-allowed', disabled ? 'tom-neutro' : `tom-${MODO_UI[mode].tom}`)}
    >
      <span className="ic-tom ic-tom-sm"><Play size={15} fill="currentColor" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[16px] font-semibold leading-5', disabled ? 'text-texto-2' : 'text-texto')}>{title}</span>
        {caption && !busy && <span className="block text-[12px] leading-4 text-texto-2">{caption}</span>}
      </span>
      {!disabled && (busy ? <Spinner /> : <ArrowRight size={18} className="shrink-0 text-texto-2 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />)}
    </button>
  )
}
