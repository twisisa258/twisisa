import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tom } from '@/components/simulador/modos'

// Cartão de um modo do Simulador. Com `href` abre o modo; sem `href` fica parado (em breve, ou sem nada para fazer).
export function ModeCard({ icon: Icon, tom, title, tagline, meta, href, badge }: { icon: LucideIcon; tom: Tom; title: string; tagline: string; meta?: string; href?: string; badge?: string }) {
  const conteudo = (
    <>
      <span className="ic-tom ic-tom-lg"><Icon size={24} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[16px] font-semibold leading-5 text-texto">{title}</span>
          {badge && <span className="rounded-full bg-linha px-2 py-0.5 text-[11px] font-semibold text-texto-2">{badge}</span>}
        </span>
        <span className="mt-0.5 block text-[13px] leading-[18px] text-texto-2">{tagline}</span>
        {meta && <span className="mt-2 inline-block rounded-full bg-[color:var(--tom-suave)] px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--tom-texto)]" style={{ boxShadow: 'inset 0 0 0 1px var(--tom-linha)' }}>{meta}</span>}
      </span>
      {href && <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-texto-2" />}
    </>
  )
  const base = cn('sf flex items-center gap-3.5 p-4', `tom-${tom}`)
  return href ? <Link href={href} className={cn(base, 'sf-toque no-underline')}>{conteudo}</Link> : <div className={base}>{conteudo}</div>
}
