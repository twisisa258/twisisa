'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowRight } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useFeedback } from '@/components/feedback-provider'
import { startSession } from '@/app/aluno/simulador/actions'
import { cn } from '@/lib/utils'
import type { AttemptMode } from '@/lib/simulator-shared'

type Props = { mode: AttemptMode; subjectId: string; variant?: string | null; title: string; caption?: string; secondary?: boolean; disabled?: boolean }

export function StartCard({ mode, subjectId, variant = null, title, caption, secondary = false, disabled = false }: Props) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, startTransition] = useTransition()
  const [started, setStarted] = useState(false)
  const busy = pending || started

  function start() {
    if (busy || disabled) return
    startTransition(async () => {
      try {
        const result = await startSession({ mode, subjectId, variant })
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
      className={cn(
        'group flex h-[60px] w-full items-center gap-3 rounded-2xl px-5 text-left transition duration-200 active:scale-[0.985] disabled:cursor-not-allowed',
        disabled ? 'bg-[#eceee7] text-[#9aa29b]' : secondary ? 'bg-white text-[#1d4d41] shadow-[0_1px_3px_rgba(20,50,40,0.10)] hover:bg-[#f4f6f1]' : 'bg-[#1d4d41] text-white shadow-[0_8px_18px_-10px_rgba(29,77,65,0.65)] hover:bg-[#18413a]',
      )}
    >
      <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{title}</span>
      {caption && !busy && <span className="shrink-0 text-[13px] opacity-70">{caption}</span>}
      {!disabled && (busy ? <Spinner /> : <ArrowRight size={18} className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />)}
    </button>
  )
}
