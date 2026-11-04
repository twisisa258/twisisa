'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { ListaEscolha, type ItemEscolha } from '@/components/ui/lista-escolha'
import { listCourseCombos, saveCourse } from '@/app/aluno/bem-vindo/actions'

type Combo = { optionId: string; label: string }

// Curso e, se o curso aceitar mais de uma combinação, a combinação de provas. Só botões. Guardado, segue para onde o aluno ia.
export function EscolherCursoFlow({ courses, initialCourseId, initialCombos, onConcluido, orientacaoHref }: { courses: ItemEscolha[]; initialCourseId: string | null; initialCombos: Combo[]; onConcluido: () => void; orientacaoHref: string | null }) {
  const feedback = useFeedback()
  const [courseId, setCourseId] = useState<string | null>(initialCourseId)
  const [combos, setCombos] = useState<Combo[]>(initialCombos)
  const [optionId, setOptionId] = useState<string | null>(null)
  const [etapa, setEtapa] = useState<'curso' | 'combo'>(initialCourseId && initialCombos.length > 1 ? 'combo' : 'curso')
  const [pending, setPending] = useState(false)

  const concluir = onConcluido

  async function continuar() {
    if (pending || !courseId) return
    setPending(true)
    try {
      if (etapa === 'combo') {
        const res = await saveCourse({ courseId, optionId })
        if (res.ok) return concluir()
        return feedback.error(res.message)
      }
      const list = await listCourseCombos(courseId)
      if (!list.ok) return feedback.error(list.message)
      if (list.combos.length > 1) {
        setCombos(list.combos)
        setOptionId(null)
        return setEtapa('combo')
      }
      const res = await saveCourse({ courseId, optionId: list.combos[0]?.optionId ?? null })
      if (res.ok) return concluir()
      feedback.error(res.message)
    } catch {
      feedback.error('Não foi possível guardar. Tenta outra vez.')
    } finally {
      setPending(false)
    }
  }

  if (etapa === 'combo') {
    return (
      <div className="grid gap-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Que provas vais fazer?</h2>
          <p className="mt-1 text-[14px] leading-5 text-texto-2">Este curso aceita mais do que uma combinação. O Simulador passa a mostrar só as disciplinas que escolheres.</p>
        </div>
        <ListaEscolha rotulo="Combinação de provas" valor={optionId} onChange={setOptionId} itens={combos.map((combo) => ({ id: combo.optionId, label: combo.label }))} />
        <button type="button" onClick={continuar} disabled={pending || !optionId} aria-busy={pending} className="btn btn-primario btn-grande w-full">{pending ? <><Spinner />A guardar…</> : 'Continuar'}</button>
        <button type="button" onClick={() => setEtapa('curso')} disabled={pending} className="btn btn-terciario w-full">Mudar de curso</button>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <p className="text-[14px] leading-5 text-texto-2">Assim treinas só as disciplinas das provas dele.</p>
      <ListaEscolha rotulo="Curso" valor={courseId} onChange={setCourseId} itens={courses} vazio="Ainda não há cursos desta instituição na plataforma." />
      <button type="button" onClick={continuar} disabled={pending || !courseId} aria-busy={pending} className="btn btn-primario btn-grande w-full">{pending ? <><Spinner />A guardar…</> : 'Continuar'}</button>
      {orientacaoHref && <Link href={orientacaoHref} className="btn btn-secundario w-full">Não sei o curso: fazer o teste vocacional</Link>}
    </div>
  )
}
