import { Skeleton } from './skeleton'
import { StudentShellSkeleton } from './student-shell'

/** /aluno/simulador: cartões de disciplinas, cartões de modos e progresso, sem bordas. */
export function SimuladorSkeleton() {
  return (
    <StudentShellSkeleton>
      <div className="max-w-[720px] space-y-9">
        <div className="space-y-3">
          <Skeleton className="h-3 w-44" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-[18px]" />)}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[76px] rounded-[18px]" />)}
        </div>
        <Skeleton className="h-24 rounded-[20px]" />
      </div>
    </StudentShellSkeleton>
  )
}
