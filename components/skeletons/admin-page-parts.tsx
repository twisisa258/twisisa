import { Skeleton } from './skeleton'

// Peças comuns do esqueleto das páginas de lista do admin (espelham components/admin/page-parts.tsx).
// Cada página compõe-nas com as suas próprias linhas: nunca há um skeleton genérico para a lista.

export const adminPageSkeletonClass = 'flex min-h-[28rem] flex-1 flex-col gap-4'

export function AdminHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-[#d5e5da] bg-gradient-to-br from-[#d9eadf] via-[#e9f3ec] to-[#f6f8f3] px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="size-11 shrink-0 rounded-2xl bg-white/80" />
        <div>
          <Skeleton className="h-6 w-40 max-w-full bg-white/80 sm:h-7 sm:w-56" />
          <Skeleton className="mt-2 hidden h-4 w-64 bg-white/80 sm:block" />
        </div>
      </div>
      {withAction && <Skeleton className="h-11 w-28 shrink-0 rounded-xl" />}
    </div>
  )
}

export function AdminToolbarSkeleton() {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <Skeleton className="h-[46px] flex-1 rounded-xl" />
      <Skeleton className="h-3 w-16 shrink-0" />
    </div>
  )
}

export function AdminTabsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid shrink-0 gap-1 rounded-xl bg-[#eceee8] p-1" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded-lg bg-white/70" />
      ))}
    </div>
  )
}

export function AdminPanelSkeleton({ children, pager = true }: { children: React.ReactNode; pager?: boolean }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e3e5dc] bg-white">
      <div className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-hidden px-4 sm:px-5">{children}</div>
      {pager && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#edf0e9] px-4 py-3 sm:px-5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      )}
    </section>
  )
}
