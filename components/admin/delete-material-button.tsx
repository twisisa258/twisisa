'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import type { ActionResult } from '@/lib/action-result'

// Eliminação em dois passos: o primeiro toque pede confirmação, o segundo elimina.
export function DeleteMaterialButton({ id, title, action }: { id: string; title: string; action: (formData: FormData) => Promise<ActionResult> }) {
  const feedback = useFeedback()
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  async function remove() {
    if (pending) return
    setPending(true)
    try {
      const data = new FormData()
      data.set('id', id)
      const result = await action(data)
      if (result.ok) feedback.success(result.message ?? 'Material eliminado.')
      else feedback.error(result.message)
      setConfirming(false)
      router.refresh()
    } catch {
      feedback.error('Não foi possível eliminar o material. Tenta outra vez.')
    } finally {
      setPending(false)
    }
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} aria-label={`Eliminar ${title}`} className="rounded-lg p-2 text-[#9a3030] hover:bg-[#fbeeee]">
        <Trash2 size={17} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={remove} disabled={pending} className="rounded-lg bg-[#9a3030] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#7f2626] disabled:opacity-60">{pending ? 'A eliminar…' : 'Eliminar'}</button>
      <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#526057] hover:bg-[#f1f4ef] disabled:opacity-60">Cancelar</button>
    </div>
  )
}
