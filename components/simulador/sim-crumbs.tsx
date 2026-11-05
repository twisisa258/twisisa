import Link from 'next/link'
import { ChevronLeft, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tom } from '@/components/simulador/modos'

// Onde o aluno está no fluxo (Modo > Disciplina) e como voltar um passo. O cartão resume o que já escolheu.
export function SimCrumbs({ backHref, backLabel, icon: Icon, tom, title, caption }: { backHref: string; backLabel: string; icon: LucideIcon; tom: Tom; title: string; caption?: string }) {
  return (
    <div className="space-y-3">
      <Link href={backHref} className="-ml-1 inline-flex min-h-9 items-center gap-0.5 rounded-lg pr-2 text-[14px] font-medium text-texto-2 no-underline hover:text-marca">
        <ChevronLeft size={18} aria-hidden="true" />
        {backLabel}
      </Link>
      <div className={cn('sf-tom flex items-center gap-3 p-3.5', `tom-${tom}`)}>
        <span className="ic-tom"><Icon size={20} aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold leading-5 text-texto">{title}</p>
          {caption && <p className="truncate text-[12px] leading-4 text-texto-2">{caption}</p>}
        </div>
      </div>
    </div>
  )
}
