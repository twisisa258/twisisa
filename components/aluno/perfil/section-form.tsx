'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { useAccordion } from './profile-accordion'
import type { ActionResult } from '@/lib/action-result'

// Formulário de uma secção do perfil: guarda sozinho, mostra «A guardar…» no botão,
// e no sucesso fecha a secção (a linha mostra «Guardado» e o visto atualiza).
export function SectionForm({
  sectionId,
  action,
  submitLabel = 'Guardar',
  resetOnSuccess = false,
  children,
}: {
  sectionId: string
  action: (formData: FormData) => Promise<ActionResult>
  submitLabel?: string
  resetOnSuccess?: boolean
  children: React.ReactNode
}) {
  const feedback = useFeedback()
  const router = useRouter()
  const accordion = useAccordion()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = event.currentTarget
    const data = new FormData(form)
    setPending(true)
    try {
      const result = await action(data)
      if (result.ok) {
        if (resetOnSuccess) form.reset()
        accordion?.saved(sectionId)
        router.refresh()
      } else {
        feedback.error(result.message)
      }
    } catch {
      feedback.error('Não foi possível guardar. Tenta outra vez.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} aria-busy={pending} className="grid gap-4">
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      <button
        type="submit"
        disabled={pending}
        className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1d4d41] text-sm font-semibold text-white transition-colors hover:bg-[#173f35] disabled:opacity-80 sm:w-auto sm:min-w-40 sm:justify-self-end sm:px-6"
      >
        {pending ? (
          <>
            <Spinner />A guardar…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  )
}
