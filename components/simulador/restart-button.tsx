'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useFeedback } from '@/components/feedback-provider'
import { startSession } from '@/app/aluno/simulador/actions'
import type { AttemptMode } from '@/lib/simulator-shared'
import { Spinner } from '@/components/ui/spinner'

export function RestartButton({ mode, subjectId, variant = null, topicId = null, label, primary = false }: { mode: AttemptMode; subjectId: string | null; variant?: string | null; topicId?: string | null; label: string; primary?: boolean }) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await startSession({ mode, subjectId, variant, topicId })
            if (!result.ok) return feedback.error(result.message)
            router.push(`/aluno/simulador/sessao/${result.data.id}`)
          } catch {
            feedback.error('Sem ligação. Verifica a internet e tenta de novo.')
          }
        })
      }
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors disabled:opacity-60 ${primary ? 'bg-marca text-white hover:bg-marca-escura' : 'bg-white text-marca shadow-[0_1px_2px_rgba(20,50,40,0.05),0_8px_20px_-12px_rgba(20,50,40,0.25)] hover:bg-superficie-2'}`}
    >
      {pending ? <><Spinner />A preparar…</> : label}
    </button>
  )
}
