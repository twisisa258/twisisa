import Link from 'next/link'
import { Bookmark, RotateCcw } from 'lucide-react'
import { plural } from '@/lib/desafios-regras'

export type PlanItem = { id: string; label: string; detail: string | null; done: boolean; href: string }

/** Itens do dia a partir de dados reais: meta de questões, questões guardadas para hoje e erros por rever. */
export function buildPlan(input: { goal: number; answered: number; marksDue: number; errorCount: number; errorsHref: string | null }): PlanItem[] {
  const { goal, answered, marksDue, errorCount, errorsHref } = input
  const items: PlanItem[] = [
    {
      id: 'meta',
      label: `Responder a ${goal} questões`,
      detail: answered >= goal ? 'Meta cumprida' : `${answered} de ${goal}. Faltam ${plural(goal - answered, 'questão', 'questões')}`,
      done: answered >= goal,
      href: '/aluno/simulador',
    },
  ]
  if (marksDue > 0) items.push({ id: 'guardadas', label: `Rever ${plural(marksDue, 'questão guardada', 'questões guardadas')}`, detail: 'Guardaste-as para hoje', done: false, href: '/aluno/estudar-depois' })
  if (errorCount > 0 && errorsHref) items.push({ id: 'erros', label: 'Refazer os teus erros', detail: plural(errorCount, 'questão por rever', 'questões por rever'), done: false, href: errorsHref })
  return items
}

// As tarefas extra do dia (a meta fica no destaque «Hoje»): fichas que se deslizam, uma forma diferente dos cartões.
export function ParaHoje({ items }: { items: PlanItem[] }) {
  const extra = items.filter((item) => item.id !== 'meta' && !item.done)
  if (extra.length === 0) return null
  return (
    <section aria-label="Para hoje">
      <h2 className="mb-2 ml-1 text-[11px] font-bold uppercase tracking-[0.12em] text-texto">Para hoje</h2>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {extra.map((item) => {
          const Icon = item.id === 'erros' ? RotateCcw : Bookmark
          return (
            <li key={item.id} className="shrink-0">
              <Link href={item.href} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-linha bg-white px-4 text-[13px] font-semibold text-texto no-underline hover:bg-[#f4f7f2]">
                <Icon size={15} className={item.id === 'erros' ? 'text-erro' : 'text-aviso'} aria-hidden />
                {item.label}
                {item.id === 'erros' && item.detail && <span className="font-normal text-texto-2">· {item.detail}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
