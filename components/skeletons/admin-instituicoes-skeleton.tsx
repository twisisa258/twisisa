import { Skeleton, SkeletonRegion } from './skeleton'
import { AdminHeaderSkeleton, AdminPanelSkeleton, AdminToolbarSkeleton, adminPageSkeletonClass } from './admin-page-parts'

/** /admin/instituicoes: faixa com "Adicionar", pesquisa + contagem e lista (logótipo, texto, estado, menu ⋯). */
export function AdminInstituicoesSkeleton() {
  return (
    <SkeletonRegion label="A carregar as instituições" className={adminPageSkeletonClass}>
      <AdminHeaderSkeleton />
      <AdminToolbarSkeleton />
      <AdminPanelSkeleton pager={false}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
            <Skeleton className="size-9 shrink-0 rounded-full" />
          </div>
        ))}
      </AdminPanelSkeleton>
    </SkeletonRegion>
  )
}
