'use client'

// [twisisa-ux] cartão claro para todos os anúncios (sem o cartão escuro). «Ver detalhes» abre a página do anúncio.
import Link from 'next/link'
import { ArrowRight, CalendarDays, Info, Sparkles, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import type { Anuncio, AnuncioTom } from '@/lib/anuncios'
import { cn } from '@/lib/utils'

// Não importar valores de lib/anuncios aqui: esse ficheiro usa a base de dados e não pode ir para o navegador.
const TIPOS: Record<AnuncioTom, { tom: string; icon: LucideIcon; rotulo: string }> = {
  novidade: { tom: 'tom-assistente', icon: Sparkles, rotulo: 'Novidade' },
  info: { tom: 'tom-ajuda', icon: Info, rotulo: 'Informação' },
  evento: { tom: 'tom-conquista', icon: CalendarDays, rotulo: 'Evento' },
  aviso: { tom: 'tom-aviso', icon: TriangleAlert, rotulo: 'Aviso' },
}

function Ligacao({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return href.startsWith('https://') ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  ) : (
    <Link href={href} className={className}>{children}</Link>
  )
}

export function AnuncioCard({ anuncio, onClose }: { anuncio: Anuncio; onClose?: () => void }) {
  const tipo = TIPOS[anuncio.tone]
  const Icon = tipo.icon
  const cta = anuncio.ctaHref && anuncio.ctaLabel ? { href: anuncio.ctaHref, label: anuncio.ctaLabel } : null

  return (
    <article className={cn('sf-tom relative flex gap-3 p-3.5', onClose && 'pr-11', tipo.tom)}>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Fechar anúncio" className="btn btn-icone absolute right-1 top-1">
          <X size={18} aria-hidden="true" />
        </button>
      )}
      <span className="ic-tom"><Icon size={19} aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--tom-texto)]">{tipo.rotulo}</p>
        <h2 className="mt-0.5 text-[15px] font-semibold leading-5 text-texto">{anuncio.title}</h2>
        {anuncio.body && <p className="mt-1 line-clamp-3 text-[13px] leading-5 text-texto-2">{anuncio.body}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {cta && (
            <Ligacao href={cta.href} className="inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-[color:var(--tom-texto)] no-underline">
              {cta.label}
              <ArrowRight size={14} aria-hidden="true" />
            </Ligacao>
          )}
          <Link href={`/aluno/anuncios/${anuncio.id}`} className="inline-flex min-h-9 items-center text-[13px] font-semibold text-marca no-underline">
            Ver detalhes
          </Link>
        </div>
      </div>
    </article>
  )
}
