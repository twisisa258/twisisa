import { Skeleton } from './skeleton'
import { StudentShellSkeleton } from './student-shell'

function MissionsSkeleton({ rows }: { rows: number }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-[#eceee7] overflow-hidden rounded-2xl border border-[#e3e6dc] bg-white">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
            <Skeleton className="mt-0.5 size-6 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** /aluno/desafios: sequência, um aviso, missões de hoje e da semana, prontidão e regras (mesma ordem da página real). */
export function DesafiosSkeleton() {
  return (
    <StudentShellSkeleton hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <Skeleton className="h-[164px] rounded-2xl" />
        <Skeleton className="h-[68px] rounded-[18px]" />
        <MissionsSkeleton rows={3} />
        <MissionsSkeleton rows={3} />
        <Skeleton className="h-[260px] rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
    </StudentShellSkeleton>
  )
}
