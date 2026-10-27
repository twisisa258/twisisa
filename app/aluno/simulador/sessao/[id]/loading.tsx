import { Skeleton } from '@/components/skeletons/skeleton'

export default function Loading() {
  return (
    <main role="status" aria-live="polite" aria-busy="true" aria-label="A carregar" className="min-h-screen bg-[#f8f8f5]">
      <div className="px-4 py-3"><div className="mx-auto flex max-w-2xl items-center gap-3"><Skeleton className="size-10 rounded-full" /><Skeleton className="h-3 flex-1" /></div></div>
      <div className="mx-auto max-w-2xl space-y-3 px-4 pt-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-2.5 pt-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
      </div>
    </main>
  )
}
