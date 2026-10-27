import { Skeleton, SkeletonRegion } from './skeleton'
import { AdminHeaderSkeleton, AdminPanelSkeleton, AdminTabsSkeleton, AdminToolbarSkeleton, adminPageSkeletonClass } from './admin-page-parts'

/** /admin/questoes: faixa com "Adicionar", separadores de estado, pesquisa + contagem e lista (enunciado, metadados, marcas, menu ⋯) com paginação. */
export function AdminQuestoesSkeleton() {
  return (
    <SkeletonRegion label="A carregar as questões" className={adminPageSkeletonClass}>
      <AdminHeaderSkeleton />
      <AdminTabsSkeleton count={3} />
      <AdminToolbarSkeleton />
      <AdminPanelSkeleton>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <div className="mt-2 flex gap-1.5">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-full" />
              </div>
            </div>
            <Skeleton className="size-9 shrink-0 rounded-full" />
          </div>
        ))}
      </AdminPanelSkeleton>
    </SkeletonRegion>
  )
}
