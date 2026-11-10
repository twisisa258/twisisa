import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { MODE_META, type AttemptMode } from '@/lib/simulator-shared'
import { MODO_UI } from '@/components/simulador/modos'
import { cn } from '@/lib/utils'

// Atalho do painel para começar a estudar sem passar pela página do Simulador: cada linha abre o modo e pede a disciplina.
export function TreinarAgora({ modes, errorCount }: { modes: AttemptMode[]; errorCount: number }) {
  // «Revisar erros» só aparece quando há erros para rever.
  const itens = modes.filter((mode) => mode !== 'revisao' || errorCount > 0)
  if (itens.length === 0) return null
  return (
    <section aria-label="Treinar agora">
      <h2 className="mb-2 ml-1 text-[11px] font-bold uppercase tracking-[0.12em] text-texto-2">Treinar agora</h2>
      <ul className="sf divide-y divide-linha overflow-hidden">
        {itens.map((mode) => {
          const meta = MODE_META[mode]
          const { icon: Icon, tom } = MODO_UI[mode]
          return (
            <li key={mode}>
              <Link href={`/aluno/simulador?m=${mode}`} className={cn('flex items-center gap-3 px-3.5 py-3 no-underline transition-colors active:bg-superficie-2', `tom-${tom}`)}>
                <span className="ic-tom"><Icon size={19} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold leading-5 text-texto">{meta.label}</span>
                  <span className="block truncate text-[12px] leading-4 text-texto-2">{mode === 'revisao' ? `${errorCount} ${errorCount === 1 ? 'questão' : 'questões'} para rever` : meta.meta}</span>
                </span>
                <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-texto-2" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
