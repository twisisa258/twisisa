import { Skeleton, SkeletonRegion } from './skeleton'
import { AdminHeaderSkeleton, AdminPanelSkeleton, AdminTabsSkeleton, AdminToolbarSkeleton, adminPageSkeletonClass } from './admin-page-parts'

/** /admin (visão geral): faixa (sem botão), separadores Actividade | Catálogo, três números e painel com o registo recente. */
export function AdminHomeSkeleton() {
  return (
    <SkeletonRegion label="A carregar a administração" className={adminPageSkeletonClass}>
      <AdminHeaderSkeleton withAction={false} />
      <AdminTabsSkeleton count={2} />
      <div className="grid shrink-0 grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#e3e5dc] bg-white p-3.5 sm:p-5">
            <Skeleton className="h-6 w-12 sm:h-9 sm:w-16" />
            <Skeleton className="mt-2 h-3 w-full" />
          </div>
        ))}
      </div>
      <AdminPanelSkeleton pager={false}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </AdminPanelSkeleton>
    </SkeletonRegion>
  )
}

function FieldSkeleton({ labelWidth = 'w-24' }: { labelWidth?: string }) {
  return (
    <div>
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className="mt-1 h-[42px] w-full" />
    </div>
  )
}

/** /admin/materiais: faixa com "Adicionar", pesquisa + contagem e painel de lista (título, metadados, abrir/eliminar) com paginação. */
export function AdminMateriaisSkeleton() {
  return (
    <SkeletonRegion label="A carregar os materiais" className={adminPageSkeletonClass}>
      <AdminHeaderSkeleton />
      <AdminToolbarSkeleton />
      <AdminPanelSkeleton>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
            <div className="flex shrink-0 gap-1">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="size-9 rounded-lg" />
            </div>
          </div>
        ))}
      </AdminPanelSkeleton>
    </SkeletonRegion>
  )
}
