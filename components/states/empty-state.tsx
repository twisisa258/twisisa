import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

/** Estado vazio: mensagem clara e uma ação. Nunca mostrar dados inventados. */
export function EmptyState({
  title = 'Ainda sem atividade',
  description,
  actionLabel,
  actionHref,
  icon: Icon = Inbox,
}: {
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  icon?: LucideIcon
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#d5dacd] bg-white px-5 py-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#edf3ee] text-[#1d4d41]">
        <Icon size={24} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-[#202923]">{title}</h2>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-[#68736a]">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#1d4d41] px-5 text-sm font-semibold text-white hover:bg-[#163e34]">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
