import { Skeleton, SkeletonRegion } from './skeleton'
import { AdminHeaderSkeleton, AdminPanelSkeleton, adminPageSkeletonClass } from './admin-page-parts'

/** /admin/modulos: faixa (sem botão) e lista de módulos: nome, três estados por percurso e seta. */
export function AdminModulosSkeleton() {
  return (
    <SkeletonRegion label="A carregar os módulos" className={adminPageSkeletonClass}>
      <AdminHeaderSkeleton withAction={false} />
      <AdminPanelSkeleton pager={false}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-40 max-w-full" />
              <div className="mt-2 flex gap-1.5">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="size-5 shrink-0 rounded-full" />
          </div>
        ))}
      </AdminPanelSkeleton>
    </SkeletonRegion>
  )
}
