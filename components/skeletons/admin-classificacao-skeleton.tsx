import { Skeleton, SkeletonRegion } from './skeleton'
import { AdminHeaderSkeleton, AdminPanelSkeleton, AdminTabsSkeleton, AdminToolbarSkeleton, adminPageSkeletonClass } from './admin-page-parts'

/** /admin/classificacao: faixa com "Adicionar", separadores (Categorias | Níveis), pesquisa + contagem e lista com menu ⋯. */
export function AdminClassificacaoSkeleton() {
  return (
    <SkeletonRegion label="A carregar a classificação" className={adminPageSkeletonClass}>
      <AdminHeaderSkeleton />
      <AdminTabsSkeleton count={2} />
      <AdminToolbarSkeleton />
      <AdminPanelSkeleton pager={false}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="mt-2 h-3 w-1/4" />
            </div>
            <Skeleton className="size-9 shrink-0 rounded-full" />
          </div>
        ))}
      </AdminPanelSkeleton>
    </SkeletonRegion>
  )
}
