'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowRight } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { startSession } from '@/app/aluno/simulador/actions'
import { tapCard } from '@/components/simulador/styles'
import type { AttemptMode } from '@/lib/simulator-shared'

function useStart(mode: AttemptMode, subjectId: string, variant: string | null, topicId: string | null = null) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, startTransition] = useTransition()
  const [started, setStarted] = useState(false)
  function start() {
    if (pending || started) return
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
  return { start, busy: pending || started }
}

/**
 * Cartão para começar uma sessão: uma variante (ex.: Matemática I), todas as variantes, ou um tema.
 * `fresh` = questões que o aluno ainda não viu; é o que lhe mostra que há matéria nova.
 */
export function VariantCard({ mode = 'pratica', subjectId, variant, topicId = null, title, caption, count, fresh, size }: { mode?: AttemptMode; subjectId: string; variant: string | null; topicId?: string | null; title: string; caption: string; count: number; fresh?: number; size: number }) {
  const { start, busy } = useStart(mode, subjectId, variant, topicId)
  return (
    <button type="button" onClick={start} disabled={busy} className={`group flex w-full items-center gap-4 rounded-2xl p-4 text-left disabled:opacity-70 ${tapCard}`}>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold tracking-[-0.01em] text-[#1d4d41]">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-5 text-[#5d6f64]">{busy ? 'A preparar as questões…' : caption}</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-block rounded-full bg-white/75 px-2.5 py-0.5 text-[12px] font-semibold text-[#1d4d41]">{Math.min(size, count)} questões</span>
          {typeof fresh === 'number' && (
            <span className="inline-block rounded-full bg-[#fff3dc] px-2.5 py-0.5 text-[12px] font-semibold text-[#805f19]">{fresh === 0 ? 'Já viste tudo' : `${fresh} por ver`}</span>
          )}
        </span>
      </span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1d4d41] text-white"><ArrowRight size={18} aria-hidden /></span>
    </button>
  )
}

/** Botão principal para a Revisão de erros (sem variantes: revê os erros da disciplina). */
export function StartButton({ mode, subjectId, label, disabled = false }: { mode: AttemptMode; subjectId: string; label: string; disabled?: boolean }) {
  const { start, busy } = useStart(mode, subjectId, null)
  return (
    <button type="button" onClick={start} disabled={busy || disabled} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1d4d41] text-[15px] font-semibold text-white transition-colors hover:bg-[#163e34] disabled:opacity-60">
      {busy ? 'A preparar as questões…' : <>{label}<ArrowRight size={18} aria-hidden /></>}
    </button>
  )
}
