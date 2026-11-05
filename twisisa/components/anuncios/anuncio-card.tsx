'use client'

import Link from 'next/link'
import { ArrowRight, CalendarDays, Info, Sparkles, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import type { Anuncio, AnuncioTom } from '@/lib/anuncios'
import { cn } from '@/lib/utils'

// Cada tipo de anúncio tem a sua cor e o seu ícone (a cor nunca vai sozinha: o ícone e o texto dizem o mesmo).
const TIPOS: Record<AnuncioTom, { tom: string; icon: LucideIcon }> = {
  novidade: { tom: 'tom-assistente', icon: Sparkles },
  info: { tom: 'tom-ajuda', icon: Info },
  evento: { tom: 'tom-conquista', icon: CalendarDays },
  aviso: { tom: 'tom-aviso', icon: TriangleAlert },
}

function Ligacao({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return href.startsWith('https://') ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  ) : (
    <Link href={href} className={className}>{children}</Link>
  )
}

// Cartão de anúncio. «Faixa» é discreta; «destaque» (escuro, com aura) fica para o que a equipa quer mesmo que se veja: um por vez.
export function AnuncioCard({ anuncio, onClose }: { anuncio: Anuncio; onClose?: () => void }) {
  const tipo = TIPOS[anuncio.tone]
  const Icon = tipo.icon
  const cta = anuncio.ctaHref && anuncio.ctaLabel ? { href: anuncio.ctaHref, label: anuncio.ctaLabel } : null
  const fechar = onClose && (
    <button type="button" onClick={onClose} aria-label="Fechar anúncio" className={cn('btn btn-icone absolute right-1 top-1', anuncio.featured && '!text-white/80 hover:!bg-white/10')}>
      <X size={18} aria-hidden="true" />
    </button>
  )

  if (anuncio.featured) {
    return (
      <article className={cn('sf-noite relative p-5 pr-12', tipo.tom)}>
        {fechar}
        <span className="flex size-10 items-center justify-center rounded-xl bg-white/12 text-white" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
          <Icon size={20} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-[19px] font-semibold leading-6 tracking-[-0.02em]">{anuncio.title}</h2>
        {anuncio.body && <p className="mt-1.5 text-[14px] leading-6 text-white/80">{anuncio.body}</p>}
        {cta && <Ligacao href={cta.href} className="btn btn-aura mt-5 px-5">{cta.label}<ArrowRight size={16} aria-hidden="true" /></Ligacao>}
      </article>
    )
  }

  return (
    <article className={cn('sf-tom relative flex gap-3 p-3.5', onClose && 'pr-11', tipo.tom)}>
      {fechar}
      <span className="ic-tom"><Icon size={19} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold leading-5 text-texto">{anuncio.title}</h2>
        {anuncio.body && <p className="mt-0.5 line-clamp-3 text-[13px] leading-5 text-texto-2">{anuncio.body}</p>}
        {cta && (
          <Ligacao href={cta.href} className="mt-1.5 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-[color:var(--tom-texto)] no-underline">
            {cta.label}
            <ArrowRight size={14} aria-hidden="true" />
          </Ligacao>
        )}
      </div>
    </article>
  )
}
