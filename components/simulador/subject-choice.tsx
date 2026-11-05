import Link from 'next/link'
import { cn } from '@/lib/utils'
import { iconeDaDisciplina } from '@/components/simulador/subject-icon'
import type { Tom } from '@/components/simulador/modos'

// Disciplinas como cartões (ícone, nome, quantas questões). O modo já foi escolhido antes: a cor segue o modo.
export function SubjectChoice({ subjects, mode, tom }: { subjects: { id: string; name: string; count: number }[]; mode: string; tom: Tom }) {
  return (
    <div role="group" aria-label="Disciplina" className={cn('grid gap-3', subjects.length > 1 && 'grid-cols-2')}>
      {subjects.map((item) => {
        const Icon = iconeDaDisciplina(item.name)
        return (
          <Link key={item.id} href={`/aluno/simulador?m=${mode}&d=${encodeURIComponent(item.id)}`} className={cn('sf sf-toque flex min-h-[116px] flex-col justify-between p-4 no-underline', `tom-${tom}`)}>
            <span className="ic-tom"><Icon size={20} aria-hidden="true" /></span>
            <span className="mt-4 block">
              <span className="block text-[16px] font-semibold leading-5 tracking-[-0.01em] text-texto">{item.name}</span>
              <span className="mt-0.5 block text-[12px] leading-4 text-texto-2">{item.count} {item.count === 1 ? 'questão' : 'questões'}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
