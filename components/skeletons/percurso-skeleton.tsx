import { InstitutionCardSkeleton, Skeleton } from './index'
import { StudentShellSkeleton } from './student-shell'

/** /aluno/percurso: título e frase, 3 cartões de percurso, título e grelha de instituições, botão. */
export function PercursoSkeleton() {
  return (
    <StudentShellSkeleton hideBackLink>
      <div className="flex flex-col gap-6">
        <section>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-3xl border border-[#e3e5dc] bg-white p-4">
                <Skeleton className="size-11 shrink-0 rounded-2xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-full" />
                  <Skeleton className="mt-1.5 h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section>
          <Skeleton className="h-5 w-64 max-w-full" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <InstitutionCardSkeleton key={i} />
            ))}
          </div>
        </section>
        <Skeleton className="h-12 w-full rounded-xl sm:w-52" />
      </div>
    </StudentShellSkeleton>
  )
}
