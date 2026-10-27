import { Skeleton, SkeletonRegion } from './skeleton'

export { Skeleton, SkeletonRegion }

/** Cartão de módulo (página Exames). */
export function ModuleCardSkeleton() {
  return (
    <div className="rounded-3xl border border-[#e3e5dc] bg-white p-4">
      <Skeleton className="size-11 rounded-2xl" />
      <Skeleton className="mt-4 h-4 w-2/3" />
      <Skeleton className="mt-2 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-4/5" />
    </div>
  )
}

/** Cartão de instituição: logótipo + sigla. */
export function InstitutionCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-[#e3e5dc] bg-white p-4">
      <Skeleton className="size-14 shrink-0 rounded-2xl" />
      <div className="flex-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="mt-2 h-3 w-3/4" />
      </div>
      <Skeleton className="size-5 rounded-full" />
    </div>
  )
}

/** Linha de lista genérica (histórico, erros, materiais). */
export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e3e5dc] bg-white p-3">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="mt-2 h-3 w-2/5" />
      </div>
      <Skeleton className="h-6 w-12 rounded-full" />
    </div>
  )
}

/** Linha de ranking: posição, nome e pontos. */
export function RankingRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e3e5dc] bg-white p-3">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-2 h-3 w-1/4" />
      </div>
      <Skeleton className="h-5 w-12" />
    </div>
  )
}

/** Questão com quatro opções. */
export function QuestionSkeleton({ options = 4 }: { options?: number }) {
  return (
    <div className="rounded-3xl border border-[#e3e5dc] bg-white p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-5 w-full" />
      <Skeleton className="mt-2 h-5 w-5/6" />
      <div className="mt-5 space-y-2.5">
        {Array.from({ length: options }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

/** Tabela do admin. */
export function AdminTableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e3e5dc] bg-white">
      <div className="flex gap-4 border-b border-[#e3e5dc] bg-[#f8f8f5] p-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-[#eef0e8] p-3 last:border-b-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Grelhas e listas prontas a usar em loading.tsx. */
export function CardGridSkeleton({ count = 6, kind = 'module', label }: { count?: number; kind?: 'module' | 'institution'; label?: string }) {
  const Card = kind === 'institution' ? InstitutionCardSkeleton : ModuleCardSkeleton
  return (
    <SkeletonRegion label={label} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </SkeletonRegion>
  )
}

export function ListSkeleton({ count = 6, kind = 'list', label }: { count?: number; kind?: 'list' | 'ranking'; label?: string }) {
  const Row = kind === 'ranking' ? RankingRowSkeleton : ListRowSkeleton
  return (
    <SkeletonRegion label={label} className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <Row key={i} />
      ))}
    </SkeletonRegion>
  )
}
