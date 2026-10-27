'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowRight, Check, RotateCcw, Target, Timer } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { startSession } from '@/app/aluno/simulador/actions'
import { MODE_META, type AttemptMode } from '@/lib/simulator-shared'

const ICONS = { pratica: Target, rapido: Timer, revisao: RotateCcw } as const

export function StartPanel({ subjects, errorCount, enabled }: { subjects: { id: string; name: string; count: number }[]; errorCount: number; enabled: AttemptMode[] }) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<AttemptMode>(enabled[0] ?? 'pratica')
  const [subjectId, setSubjectId] = useState<string | null>(null)

  const noErrors = (item: AttemptMode) => item === 'revisao' && errorCount === 0

  function begin() {
    startTransition(async () => {
      try {
        const result = await startSession({ mode, subjectId })
        if (!result.ok) return feedback.error(result.message)
        router.push(`/aluno/simulador/sessao/${result.data.id}`)
      } catch {
        feedback.error('Sem ligação. Verifica a internet e tenta de novo.')
      }
    })
  }

  return (
    <section className="rounded-3xl border border-[#e3e5dc] bg-white p-4 sm:p-6" aria-label="Começar uma sessão">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4d41]">1 · Como queres treinar?</p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Modo">
        {enabled.map((item) => {
          const Icon = ICONS[item]
          const meta = MODE_META[item]
          const blocked = noErrors(item)
          const selected = mode === item && !blocked
          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={blocked}
              onClick={() => setMode(item)}
              className={`relative flex items-center gap-3 rounded-2xl border-[1.5px] p-3.5 text-left transition-colors sm:flex-col sm:items-start sm:gap-2 ${selected ? 'border-[#1d4d41] bg-[#f3f8f4]' : 'border-[#e3e5dc] bg-white hover:border-[#c6d3c9]'} ${blocked ? 'cursor-not-allowed opacity-55' : ''}`}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-[#1d4d41] text-white' : 'bg-[#edf3ee] text-[#1d4d41]'}`}><Icon size={20} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-5">{meta.label}</span>
                <span className="mt-0.5 block text-xs leading-5 text-[#7d857e]">{blocked ? 'Ainda não tens erros para rever' : item === 'revisao' ? `${errorCount} ${errorCount === 1 ? 'questão para rever' : 'questões para rever'}` : meta.meta}</span>
              </span>
              {selected && <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-[#1d4d41] text-white sm:right-3.5 sm:top-3.5"><Check size={12} aria-hidden /></span>}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-[#7d857e]">{MODE_META[mode].tagline}.</p>

      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4d41]">2 · Que disciplina?</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Disciplina">
        {[{ id: null, name: 'Todas', count: subjects.reduce((s, i) => s + i.count, 0) }, ...subjects].map((item) => {
          const selected = subjectId === item.id
          return (
            <button
              key={item.id ?? 'todas'}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSubjectId(item.id)}
              className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${selected ? 'border-[#1d4d41] bg-[#1d4d41] text-white' : 'border-[#dfe3d9] bg-white text-[#48534b] hover:border-[#c6d3c9]'}`}
            >
              {item.name}
              <span className={`text-xs ${selected ? 'text-white/70' : 'text-[#9aa29b]'}`}>{item.count}</span>
            </button>
          )
        })}
      </div>

      <button type="button" onClick={begin} disabled={pending || noErrors(mode)} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1d4d41] text-sm font-semibold text-white transition-colors hover:bg-[#163e34] disabled:opacity-60">
        {pending ? 'A preparar as questões…' : <>{MODE_META[mode].cta}<ArrowRight size={18} aria-hidden /></>}
      </button>
    </section>
  )
}
