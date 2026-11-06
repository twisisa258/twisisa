'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Undo2 } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { importBatch, undoBatch } from '@/app/admin/importar/actions'

// Botões do Jonas: ler as próximas 10 questões, ou desfazer o último lote. A leitura demora (meio minuto ou mais), por isso mostra o estado.
export function ImportarLote({ materialId, concluida, nextNumber, temLote }: { materialId: string; concluida: boolean; nextNumber: number; temLote: boolean }) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, setPending] = useState<'ler' | 'desfazer' | null>(null)

  async function run(kind: 'ler' | 'desfazer') {
    if (pending) return
    setPending(kind)
    try {
      const data = new FormData()
      data.set('materialId', materialId)
      const result = await (kind === 'ler' ? importBatch(data) : undoBatch(data))
      if (result.ok) feedback.success(result.message ?? 'Feito.')
      else feedback.error(result.message)
      router.refresh()
    } catch {
      feedback.error('Não foi possível concluir. Tenta outra vez.')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending !== null}>
      <button type="button" onClick={() => run('ler')} disabled={pending !== null || concluida} className="inline-flex h-11 items-center gap-2 rounded-full bg-marca px-5 text-sm font-semibold text-white transition-colors hover:bg-marca-escura disabled:opacity-60">
        {pending === 'ler' ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Sparkles size={17} aria-hidden />}
        {pending === 'ler' ? 'O Jonas está a ler…' : concluida ? 'Leitura concluída' : nextNumber > 1 ? `Ler as próximas 10 (a partir da ${nextNumber})` : 'Ler as primeiras 10 questões'}
      </button>
      {temLote && (
        <button type="button" onClick={() => run('desfazer')} disabled={pending !== null} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#dfe3d9] bg-white px-4 text-sm font-semibold text-[#526057] transition-colors hover:bg-[#f3f4ef] disabled:opacity-60">
          {pending === 'desfazer' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Undo2 size={16} aria-hidden />}
          Desfazer o último lote
        </button>
      )}
    </div>
  )
}
