import { Skeleton, SkeletonRegion } from './skeleton'
import { AdminHeaderSkeleton, AdminTabsSkeleton, adminPageSkeletonClass } from './admin-page-parts'

/** /admin/jonas e /admin/jonas/modelo: faixa (sem botão), dois separadores e cartões. */
export function AdminJonasSkeleton() {
  return (
    <SkeletonRegion label="A carregar o Jonas" className={adminPageSkeletonClass}>
      <AdminHeaderSkeleton withAction={false} />
      <AdminTabsSkeleton count={2} />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-[#e3e5dc] bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-9 rounded-xl" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-[#e3e5dc] bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="mt-4 h-10 w-full" />
        <Skeleton className="mt-2 h-10 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-[#e3e5dc] bg-white p-4">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="mt-3 h-6 w-12" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  )
}
