'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { generateTopics, setTopicsStatus } from '@/app/admin/temas-principais/actions'

// Gerar com o Jonas e publicar/despublicar os temas de uma disciplina.
export function TemasAcoes({ institutionId, subjectId, total, published }: { institutionId: string; subjectId: string; total: number; published: boolean }) {
  const router = useRouter()
  const feedback = useFeedback()
  const [pending, setPending] = useState<'gerar' | 'estado' | null>(null)

  async function run(kind: 'gerar' | 'estado') {
    if (pending) return
    setPending(kind)
    try {
      const data = new FormData()
      data.set('institutionId', institutionId)
      data.set('subjectId', subjectId)
      if (kind === 'estado') data.set('status', published ? 'rascunho' : 'publicado')
      const result = await (kind === 'gerar' ? generateTopics(data) : setTopicsStatus(data))
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
      <button type="button" onClick={() => run('gerar')} disabled={pending !== null} className="inline-flex h-11 items-center gap-2 rounded-full bg-marca px-5 text-sm font-semibold text-white transition-colors hover:bg-marca-escura disabled:opacity-60">
        {pending === 'gerar' ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Sparkles size={17} aria-hidden />}
        {pending === 'gerar' ? 'O Jonas está a escrever…' : total > 0 ? 'Gerar de novo (substitui os atuais)' : 'Gerar os 10 temas com o Jonas'}
      </button>
      {total > 0 && (
        <button type="button" onClick={() => run('estado')} disabled={pending !== null} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#dfe3d9] bg-white px-4 text-sm font-semibold text-[#526057] transition-colors hover:bg-[#f3f4ef] disabled:opacity-60">
          {pending === 'estado' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : published ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          {published ? 'Passar a rascunho' : 'Publicar para o público'}
        </button>
      )}
    </div>
  )
}
