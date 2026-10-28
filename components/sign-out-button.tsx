'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'

export function SignOutButton() {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, setPending] = useState(false)

  async function signOut() {
    if (pending) return
    setPending(true)
    try {
      await authClient.signOut()
      router.push('/')
      router.refresh()
    } catch {
      setPending(false)
      feedback.error('Sem ligação. Verifica a internet e tenta de novo.', 'Não foi possível sair')
    }
  }

  return (
    <button type="button" onClick={signOut} disabled={pending} aria-busy={pending} className="inline-flex items-center gap-2 rounded-full border border-[#d7d9d0] bg-white px-4 py-2 text-xs font-semibold text-[#39433e] disabled:opacity-60">
      {pending ? <><Spinner className="size-3.5" />A sair…</> : 'Sair'}
    </button>
  )
}
