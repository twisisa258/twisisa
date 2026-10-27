import { cn } from '@/lib/utils'

/** Bloco base de skeleton. Decorativo: o contentor que o usa deve ter role="status" e aria-label. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-[#e8ece4] motion-reduce:animate-none', className)} />
}

/** Contentor acessível: anuncia "A carregar" uma só vez aos leitores de ecrã. */
export function SkeletonRegion({ label = 'A carregar', className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  )
}
