'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowRight } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useFeedback } from '@/components/feedback-provider'
import { startSession } from '@/app/aluno/simulador/actions'
import { tapCard } from '@/components/simulador/styles'
import { cn } from '@/lib/utils'
import type { AttemptMode } from '@/lib/simulator-shared'

type Props = { mode: AttemptMode; subjectId: string; variant?: string | null; topicId?: string | null; title: string; caption: string; disabled?: boolean }

export function StartCard({ mode, subjectId, variant = null, topicId = null, title, caption, disabled = false }: Props) {
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
      className={cn('flex w-full items-center gap-4 rounded-2xl p-4 text-left disabled:cursor-not-allowed', disabled ? 'bg-white/60 opacity-70' : tapCard, busy && 'opacity-80')}
    >
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[16px] font-semibold tracking-[-0.01em]', !disabled && 'text-[#1d4d41]')}>{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-5 text-[#5d6f64]">{busy ? 'A preparar as questões…' : caption}</span>
      </span>
      {!disabled && <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1d4d41] text-white">{busy ? <Spinner /> : <ArrowRight size={18} aria-hidden />}</span>}
    </button>
  )
}
