'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFeedback } from '@/components/feedback-provider'
import { useModalClose } from '@/components/admin/form-modal'
import type { ActionResult } from '@/lib/action-result'

// Formulário que chama uma acção de servidor e mostra o resultado no modal de feedback.
// Mantém a validação nativa (required, etc.) porque só envia depois de o browser a aprovar.
export function FeedbackForm({
  action,
  successMessage,
  errorMessage = 'Não foi possível concluir. Tenta outra vez.',
  resetOnSuccess = false,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult>
  successMessage: string
  errorMessage?: string
  resetOnSuccess?: boolean
  className?: string
  children: React.ReactNode
}) {
  const feedback = useFeedback()
  const router = useRouter()
  const closeModal = useModalClose()
  const [pending, setPending] = useState(false)
  const [version, setVersion] = useState(0)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    setPending(true)
    try {
      const result = await action(data)
      if (result.ok) {
        feedback.success(result.message ?? successMessage)
        if (resetOnSuccess) setVersion((value) => value + 1)
        // Dentro de um modal, o sucesso fecha-o.
        closeModal?.()
        router.refresh()
      } else {
        feedback.error(result.message)
      }
    } catch {
      feedback.error(errorMessage)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className={className} aria-busy={pending}>
      {/* A chave recria os campos (inclui o carregamento do documento) depois de um sucesso, para limpar o formulário. */}
      <fieldset key={version} disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  )
}
