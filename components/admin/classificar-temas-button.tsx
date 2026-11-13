'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { ActionResult } from '@/lib/action-result'

// «Classificar temas»: o Jonas escolhe o tema das questões sem tema, um lote de cada vez.
export function ClassificarTemasButton({ action }: { action: () => Promise<ActionResult> }) {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  async function run() {
    if (pending) return
    setPending(true)
    setMessage('')
    try {
      const result = await action()
      setMessage(result.ok ? result.message ?? 'Feito.' : result.message)
    } catch {
      setMessage('Não foi possível classificar. Tenta outra vez.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid gap-2">
      <button type="button" onClick={run} disabled={pending} aria-busy={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-marca px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-marca-escura disabled:cursor-not-allowed disabled:opacity-60">
        <Sparkles size={16} aria-hidden="true" className={pending ? 'animate-pulse' : ''} />
        {pending ? 'O Jonas está a classificar…' : 'Classificar temas com o Jonas'}
      </button>
      <p role="status" aria-live="polite" className="text-xs text-texto-2">{message}</p>
    </div>
  )
}
