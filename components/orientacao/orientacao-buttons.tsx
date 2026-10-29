'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { iniciarOrientacao } from '@/app/aluno/descobrir-curso/actions'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const base = 'inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold no-underline disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4d41] sm:w-auto'
const styles = {
  primary: 'bg-[#1d4d41] text-white',
  secondary: 'bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]',
}

/** «Começar» (primeira vez) e «Refazer»: abrem uma tentativa nova no servidor e levam ao teste. */
export function OrientacaoStartButton({ label, variant = 'primary' }: { label: string; variant?: keyof typeof styles }) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, setPending] = useState(false)

  async function start() {
    if (pending) return
    setPending(true)
    const result = await iniciarOrientacao()
    if (!result.ok) {
      setPending(false)
      feedback.error(result.message, 'Não foi possível começar')
      return
    }
    router.push('/aluno/descobrir-curso')
    router.refresh()
  }

  return (
    <button type="button" onClick={start} disabled={pending} aria-busy={pending} className={cn(base, styles[variant])}>
      {pending ? (
        <>
          <Spinner />A preparar…
        </>
      ) : (
        label
      )}
    </button>
  )
}
