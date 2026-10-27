'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Check, Trash2 } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import type { ActionResult } from '@/lib/action-result'

export function QuestionBulkForm({ status, action, children }: { status: string; action: (formData: FormData) => Promise<ActionResult>; children: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([])
  const [allSelected, setAllSelected] = useState(false)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const feedback = useFeedback()
  const actionLabel = status === 'rascunho' ? 'Publicar' : status === 'publicada' ? 'Arquivar' : 'Restaurar'

  function syncSelection() {
    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-question-select]'))
    const next = boxes.filter((box) => box.checked).map((box) => box.value)
    setSelected(next)
    setAllSelected(boxes.length > 0 && next.length === boxes.length)
  }

  function toggleAll(checked: boolean) {
    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-question-select]'))
    setSelected(checked ? boxes.map((box) => box.value) : [])
    setAllSelected(checked)
  }

  async function submit(mode: string) {
    if (!selected.length || pending) return
    if (mode === 'eliminar' && !window.confirm(`Eliminar ${selected.length} rascunho(s)? Esta ação não pode ser desfeita.`)) return
    if (mode !== 'eliminar' && !window.confirm(`${actionLabel} ${selected.length} questão(ões) selecionada(s)?`)) return
    const data = new FormData()
    selected.forEach((id) => data.append('id', id))
    data.set('mode', mode)
    setPending(true)
    try {
      const result = await action(data)
      if (result.ok) feedback.success(result.message ?? 'Operação concluída.')
      else feedback.error(result.message)
      if (result.ok) { setSelected([]); setAllSelected(false) }
      router.refresh()
    } catch {
      feedback.error('Não foi possível concluir a operação. Tenta novamente.')
    } finally { setPending(false) }
  }

  return <section className="min-h-0 flex flex-1 flex-col">
    <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0e9] px-4 py-2.5 sm:px-5">
      <label className="flex items-center gap-2 text-xs text-[#526057]">
        <input type="checkbox" aria-label="Selecionar todas as questões visíveis" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} className="size-4 accent-[#1d4d41]" />
        Selecionar todos
      </label>
      {selected.length > 0 && <span className="text-xs text-[#737c75]">{selected.length} selecionada(s)</span>}
      <div className="ml-auto flex flex-wrap gap-1.5">
        {status === 'rascunho' && <button type="button" disabled={!selected.length || pending} onClick={() => submit('publicada')} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d4d41] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Check size={14}/> Publicar</button>}
        {status === 'publicada' && <button type="button" disabled={!selected.length || pending} onClick={() => submit('arquivada')} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe3d9] px-3 py-2 text-xs font-semibold text-[#2f3a33] disabled:opacity-40"><Archive size={14}/> Arquivar</button>}
        {status === 'arquivada' && <button type="button" disabled={!selected.length || pending} onClick={() => submit('rascunho')} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dfe3d9] px-3 py-2 text-xs font-semibold text-[#2f3a33] disabled:opacity-40"><ArchiveRestore size={14}/> Restaurar</button>}
        {status === 'rascunho' && <button type="button" disabled={!selected.length || pending} onClick={() => submit('eliminar')} className="inline-flex items-center gap-1.5 rounded-lg border border-[#efd8d8] px-3 py-2 text-xs font-semibold text-[#9a3030] disabled:opacity-40"><Trash2 size={14}/> Eliminar</button>}
      </div>
    </div>
    <div onChange={(event) => { if ((event.target as HTMLElement).matches('input[data-question-select]')) syncSelection() }}>{children}</div>
  </section>
}
