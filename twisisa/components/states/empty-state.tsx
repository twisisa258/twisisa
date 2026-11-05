import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export type EstadoTom = 'marca' | 'conquista' | 'ajuda' | 'assistente' | 'aviso'

/** Estado vazio: o que falta, porquê, e uma só ação (com aura). Nunca mostrar dados inventados. */
export function EmptyState({
  title = 'Ainda sem atividade',
  description,
  actionLabel,
  actionHref,
  icon: Icon = Inbox,
  tone = 'marca',
}: {
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  icon?: LucideIcon
  tone?: EstadoTom
}) {
  return (
    <div className={cn('sf px-5 py-10 text-center', `tom-${tone}`)}>
      <span aria-hidden="true" className="relative mx-auto flex size-[88px] items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-[color:var(--tom-linha)] opacity-50" />
        <span className="absolute inset-[10px] rounded-full border border-[color:var(--tom-linha)]" />
        <span className="ic-tom ic-tom-lg !rounded-full"><Icon size={24} /></span>
      </span>
      <h2 className="mt-5 text-[17px] font-semibold leading-6 tracking-[-0.01em] text-texto">{title}</h2>
      {description && <p className="mx-auto mt-1.5 max-w-[30ch] text-[14px] leading-6 text-texto-2">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn-aura btn-grande mt-6 px-6">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
