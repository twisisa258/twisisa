'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { MiniModal } from '@/components/aluno/mini-modal'
import { EscolherCursoFlow } from '@/components/aluno/escolher-curso-flow'
import type { ItemEscolha } from '@/components/ui/lista-escolha'
import { reservarModalHoje } from '@/lib/dispensar'

// Quem ainda não escolheu o curso vê um cartão simples e um modal grande, que se pode fechar. Nada de prática antes de escolher.
export function CursoGate({ courses, initialCourseId, initialCombos, orientacaoHref, next, forcarAbrir }: { courses: ItemEscolha[]; initialCourseId: string | null; initialCombos: { optionId: string; label: string }[]; orientacaoHref: string | null; next: string | null; forcarAbrir: boolean }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)

  // Abre sozinho: sempre que o aluno foi mandado para aqui (tentou praticar) e, senão, uma vez por dia (tem prioridade sobre os outros modais).
  useEffect(() => {
    if (forcarAbrir || reservarModalHoje()) setAberto(true)
  }, [forcarAbrir])

  const fechar = useCallback(() => setAberto(false), [])
  const concluir = useCallback(() => {
    setAberto(false)
    if (next) router.replace(next)
    else router.refresh()
  }, [next, router])

  return (
    <>
      <section aria-label="Escolhe o teu curso" className="flex items-center gap-3 rounded-2xl border border-linha bg-white p-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-marca-suave text-marca"><GraduationCap size={19} aria-hidden /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-5">{initialCourseId ? 'Escolhe a tua combinação de provas' : 'Escolhe o teu curso'}</span>
          <span className="block text-[12px] leading-4 text-texto-2">Falta só isto para começares a praticar.</span>
        </span>
        <button type="button" onClick={() => setAberto(true)} className="btn btn-primario shrink-0">Escolher</button>
      </section>
      <MiniModal open={aberto} onClose={fechar} title={initialCourseId && initialCombos.length > 1 ? 'Que provas vais fazer?' : 'A que curso te candidatas?'} size="grande">
        <EscolherCursoFlow courses={courses} initialCourseId={initialCourseId} initialCombos={initialCombos} onConcluido={concluir} orientacaoHref={orientacaoHref} />
      </MiniModal>
    </>
  )
}
