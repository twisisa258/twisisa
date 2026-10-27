import { Skeleton, SkeletonRegion } from './skeleton'
import { AdminHeaderSkeleton, AdminPanelSkeleton, AdminToolbarSkeleton, adminPageSkeletonClass } from './admin-page-parts'

/** /admin/disciplinas: faixa com "Adicionar", pesquisa + contagem e lista (nome, âmbito e contagens, menu ⋯). */
export function AdminDisciplinasSkeleton() {
  return (
    <SkeletonRegion label="A carregar as disciplinas" className={adminPageSkeletonClass}>
      <AdminHeaderSkeleton />
      <AdminToolbarSkeleton />
      <AdminPanelSkeleton pager={false}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
            <Skeleton className="size-9 shrink-0 rounded-full" />
          </div>
        ))}
      </AdminPanelSkeleton>
    </SkeletonRegion>
  )
}
