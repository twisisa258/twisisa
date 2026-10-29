import { Skeleton } from './skeleton'
import { StudentShellSkeleton } from './student-shell'

/** /aluno/ranking: linha do percurso + separadores, cartão da posição e 8 linhas de lista (mesmas medidas da página real). */
export function RankingSkeleton() {
  return (
    <StudentShellSkeleton hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-11 w-52 rounded-full" />
        </div>
        <Skeleton className="h-[116px] rounded-2xl" />
        <div className="divide-y divide-[#eceee7] overflow-hidden rounded-2xl border border-[#e3e6dc] bg-white">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1.5 h-3 w-20" />
              </div>
              <div className="flex flex-col items-end">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="mt-1.5 h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </StudentShellSkeleton>
  )
}
