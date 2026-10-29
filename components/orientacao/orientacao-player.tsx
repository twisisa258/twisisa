'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Check, X } from 'lucide-react'
import { guardarResposta, terminarOrientacao } from '@/app/aluno/descobrir-curso/actions'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { ANSWER_OPTIONS } from '@/lib/orientacao-shared'
import { cn } from '@/lib/utils'

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4d41]'

// Uma pergunta por ecrã, três respostas. Cada resposta é guardada no servidor ao tocar: fechar o separador não perde nada
// e o Início mostra «Continuar». Voltar atrás mantém as respostas e deixa mudar.
export function OrientacaoPlayer({ attemptId, questions, initial }: { attemptId: string; questions: { id: string; body: string }[]; initial: Record<string, number> }) {
  const router = useRouter()
  const feedback = useFeedback()
  const total = questions.length
  const [answers, setAnswers] = useState<Record<string, number>>(initial)
  const firstOpen = questions.findIndex((question) => answers[question.id] === undefined)
  // `total` é o passo final («Terminaste»): só se chega lá com todas as perguntas respondidas.
  const [index, setIndex] = useState(firstOpen === -1 ? total : firstOpen)
  const [saving, setSaving] = useState<number | null>(null)
  const [finishing, setFinishing] = useState(false)

  const answered = questions.filter((question) => answers[question.id] !== undefined).length
  const question = questions[index]
  const busy = saving !== null || finishing

  async function pick(value: number) {
    if (!question || busy) return
    setSaving(value)
    const result = await guardarResposta({ attemptId, questionId: question.id, value })
    setSaving(null)
    if (!result.ok) {
      feedback.error(result.message, 'Resposta não guardada')
      return
    }
    const next = { ...answers, [question.id]: value }
    setAnswers(next)
    // Em frente: a próxima pergunta; depois da última (e se todas estão respondidas) o passo final.
    if (index < total - 1) setIndex(index + 1)
    else if (questions.every((item) => next[item.id] !== undefined)) setIndex(total)
  }

  async function finish() {
    if (busy) return
    setFinishing(true)
    const result = await terminarOrientacao({ attemptId })
    if (!result.ok) {
      setFinishing(false)
      feedback.error(result.message, 'Não foi possível terminar')
      return
    }
    router.push('/aluno/descobrir-curso/resultado')
  }

  return (
    <main className="fixed inset-0 flex flex-col bg-[#f8f8f5] text-[#202321]">
      <header className="flex-none px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-[560px] items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0 || busy}
            aria-label="Pergunta anterior"
            className={cn('flex size-11 flex-none items-center justify-center rounded-full text-[#39433e] disabled:opacity-30', focusRing)}
          >
            <ArrowLeft size={20} aria-hidden />
          </button>
          <p className="flex-1 text-center text-[13px] font-medium text-[#5f6962]" aria-live="polite">
            {index < total ? `${index + 1} de ${total}` : 'Terminaste'}
          </p>
          <Link href="/aluno" aria-label="Sair. Podes continuar mais tarde" className={cn('flex size-11 flex-none items-center justify-center rounded-full text-[#39433e]', focusRing)}>
            <X size={20} aria-hidden />
          </Link>
        </div>
        <div role="progressbar" aria-label="Respondidas" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} className="mx-auto mt-1 h-[6px] w-full max-w-[560px] overflow-hidden rounded-[3px] bg-[#e3e9df]">
          <div className="h-full rounded-[3px] bg-[#1d4d41] transition-[width]" style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }} />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-center px-4 py-6">
          {question ? (
            <>
              <p className="text-[14px] text-[#6b756e]">Gostas de…</p>
              <h1 className="mt-2 text-[24px] font-semibold leading-[1.25] tracking-[-0.02em]">{question.body}</h1>
              <div className="mt-8 flex flex-col gap-3" role="group" aria-label="Resposta">
                {ANSWER_OPTIONS.map((option) => {
                  const selected = answers[question.id] === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => pick(option.value)}
                      disabled={busy}
                      aria-pressed={selected}
                      className={cn(
                        'flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl px-5 text-left text-[16px] font-semibold transition active:scale-[0.99] disabled:opacity-70',
                        selected ? 'bg-[#1d4d41] text-white' : 'bg-white text-[#202321] shadow-[0_1px_2px_rgba(20,50,40,0.08)] ring-1 ring-[#1d4d41]/10',
                        focusRing,
                      )}
                    >
                      {option.label}
                      {saving === option.value ? <Spinner /> : selected ? <Check size={18} aria-hidden /> : null}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#d6e6dc] text-[#1d4d41]">
                <Check size={26} aria-hidden />
              </span>
              <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.02em]">Terminaste</h1>
              <p className="mt-2 text-[15px] text-[#5f6962]">Vê os cursos que combinam contigo.</p>
              <button
                type="button"
                onClick={finish}
                disabled={busy}
                aria-busy={finishing}
                className={cn('mt-8 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#1d4d41] px-6 text-[16px] font-semibold text-white disabled:opacity-70', focusRing)}
              >
                {finishing ? (
                  <>
                    <Spinner />A calcular…
                  </>
                ) : (
                  'Ver os meus cursos'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-none pb-[max(0.75rem,env(safe-area-inset-bottom))]" />
    </main>
  )
}
