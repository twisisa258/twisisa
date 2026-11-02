import Link from 'next/link'
import { ArrowRight, Check, Circle } from 'lucide-react'
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

// O cartão mostra o que falta hoje, com um toque até à ação. Todos feitos: uma linha de confirmação, sem confete.
export function PlanoHoje({ items }: { items: PlanItem[] }) {
  const open = items.filter((i) => !i.done)
  return (
    <section aria-label="Plano de hoje" className="rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)]">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">Plano de hoje</h2>
        <span className="text-[12px] text-texto-2">{open.length === 0 ? 'Tudo feito' : `${items.length - open.length} de ${items.length}`}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className={`flex min-h-[56px] items-center gap-3 rounded-2xl px-3 no-underline ${item.done ? 'bg-sucesso-suave' : 'bg-fundo hover:bg-[#f0f2ea]'}`}>
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${item.done ? 'bg-sucesso text-white' : 'text-texto-2'}`}>{item.done ? <Check size={14} aria-hidden /> : <Circle size={20} aria-hidden />}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[14px] font-semibold ${item.done ? 'text-sucesso-texto' : 'text-texto'}`}>{item.label}</span>
                {item.detail && <span className="block text-[12px] text-texto-2">{item.detail}</span>}
              </span>
              {!item.done && <ArrowRight size={16} className="shrink-0 text-marca" aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
