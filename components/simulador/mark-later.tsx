'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { markForLater, unmarkForLater } from '@/app/aluno/simulador/ferramentas-actions'

export function MarkLater({ questionId, initial }: { questionId: string; initial: boolean }) {
  const [marked, setMarked] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function toggle() {
    if (busy) return
    setBusy(true)
    setError(null)
    const res = await (marked ? unmarkForLater({ questionId }) : markForLater({ questionId, remind: 'amanha' })).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setError(res?.message ?? 'Sem ligação. Tenta de novo.')
    setMarked(!marked)
  }
  return (
    <div>
      <button type="button" disabled={busy} onClick={() => void toggle()} aria-pressed={marked} className={`btn ${marked ? 'btn-secundario' : 'btn-terciario'}`}>
        {marked ? <BookmarkCheck size={17} aria-hidden /> : <Bookmark size={17} aria-hidden />}
        {marked ? 'Guardada para amanhã' : 'Estudar depois'}
      </button>
      {error && <p role="alert" className="text-xs text-erro-texto">{error}</p>}
    </div>
  )
}
