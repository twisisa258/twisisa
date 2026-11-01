'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { chooseCourse } from '@/app/aluno/descobrir-curso/resultado/actions'

// «Escolher este curso»: guarda o curso e leva o aluno aos Desafios, já com as disciplinas das provas dele.
export function ChooseCourseButton({ courseId, chosen }: { courseId: string; chosen: boolean }) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, setPending] = useState(false)

  if (chosen) {
    return <p className="inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-[#1d4d41]"><Check size={16} aria-hidden="true" />O teu curso</p>
  }

  async function choose() {
    if (pending) return
    setPending(true)
    try {
      const result = await chooseCourse(courseId)
      if (result.ok) {
        router.push('/aluno/desafios')
        return
      }
      feedback.error(result.message)
    } catch {
      feedback.error('Não foi possível guardar o curso. Tenta outra vez.')
    }
    setPending(false)
  }

  return (
    <button type="button" onClick={choose} disabled={pending} aria-busy={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1d4d41] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#173f35] disabled:opacity-80">
      {pending ? <><Spinner />A guardar…</> : 'Escolher este curso'}
    </button>
  )
}
