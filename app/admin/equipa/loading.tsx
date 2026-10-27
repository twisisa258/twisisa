import { Skeleton } from '@/components/skeletons/skeleton'

export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="A carregar" className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="space-y-2 pt-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
    </div>
  )
}
