'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFeedback } from '@/components/feedback-provider'
import type { ActionResult } from '@/lib/action-result'

type Props = {
  action: (formData: FormData) => Promise<ActionResult>
  fields: Record<string, string>
  ariaLabel: string
  children: React.ReactNode
  /** Com `confirm`, o primeiro toque pede confirmação e o segundo executa. */
  confirm?: { label: string }
  tone?: 'neutral' | 'danger'
  disabled?: boolean
  fallbackError?: string
}

// Botão de acção do admin: chama uma acção de servidor, mostra o resultado no modal e actualiza a página.
export function AdminActionButton({ action, fields, ariaLabel, children, confirm, tone = 'neutral', disabled = false, fallbackError = 'Não foi possível concluir. Tenta outra vez.' }: Props) {
  const feedback = useFeedback()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  async function run() {
    if (pending) return
    setPending(true)
    try {
      const data = new FormData()
      for (const [key, value] of Object.entries(fields)) data.set(key, value)
      const result = await action(data)
      if (result.ok) {
        if (result.message) feedback.success(result.message)
      } else {
        feedback.error(result.message)
      }
      setConfirming(false)
      router.refresh()
    } catch {
      feedback.error(fallbackError)
    } finally {
      setPending(false)
    }
  }

  const color = tone === 'danger' ? 'text-[#9a3030] hover:bg-[#fbeeee]' : 'text-[#1d4d41] hover:bg-[#f1f4ef]'

  if (confirm && confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={run} disabled={pending} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${tone === 'danger' ? 'bg-[#9a3030] hover:bg-[#7f2626]' : 'bg-[#1d4d41] hover:bg-[#163e34]'}`}>
          {pending ? 'A processar…' : confirm.label}
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#526057] hover:bg-[#f1f4ef] disabled:opacity-60">Cancelar</button>
      </div>
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled || pending}
      onClick={confirm ? () => setConfirming(true) : run}
      className={`rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-35 ${color}`}
    >
      {children}
    </button>
  )
}
