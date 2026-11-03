'use client'

import { useEffect, useState } from 'react'
import { ListaEscolha, type ItemEscolha } from '@/components/ui/lista-escolha'
import { listCourseCombos } from '@/app/aluno/bem-vindo/actions'

type Combo = { optionId: string; label: string }

// Curso alvo e, se o curso aceitar mais de uma combinação de provas, a combinação. Tudo por botões.
export function CursoCombinacao({ courses, defaultCourseId, defaultOptionId }: { courses: ItemEscolha[]; defaultCourseId: string | null; defaultOptionId: string | null }) {
  const [courseId, setCourseId] = useState(defaultCourseId)
  const [optionId, setOptionId] = useState(defaultOptionId)
  const [combos, setCombos] = useState<Combo[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) { setCombos([]); return }
    let vivo = true
    listCourseCombos(courseId).then((res) => {
      if (!vivo) return
      if (!res.ok) { setErro(res.message); return }
      setErro(null)
      setCombos(res.combos)
      if (res.combos.length === 1) setOptionId(res.combos[0].optionId)
      else setOptionId((atual) => (res.combos.some((combo) => combo.optionId === atual) ? atual : null))
    })
    return () => { vivo = false }
  }, [courseId])

  return (
    <div className="grid gap-4">
      <input type="hidden" name="targetCourseId" value={courseId ?? ''} />
      <input type="hidden" name="targetOptionId" value={optionId ?? ''} />
      <ListaEscolha rotulo="Curso alvo" valor={courseId} onChange={(id) => { setCourseId(id); setOptionId(null) }} itens={courses} vazio="Ainda não há cursos desta instituição na plataforma." />
      {erro && <p role="status" className="text-xs text-aviso-texto">{erro}</p>}
      {combos.length > 1 && (
        <div className="grid gap-2">
          <p className="text-sm font-medium">Que provas vais fazer?</p>
          <ListaEscolha rotulo="Combinação de provas" valor={optionId} onChange={setOptionId} itens={combos.map((combo) => ({ id: combo.optionId, label: combo.label }))} />
        </div>
      )}
    </div>
  )
}
