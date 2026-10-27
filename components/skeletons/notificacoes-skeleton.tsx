import { Skeleton } from './skeleton'
import { StudentShellSkeleton } from './student-shell'

/** /aluno/notificacoes: lista de cartões grandes (tipo, título, texto, estado). */
export function NotificacoesSkeleton() {
  return (
    <StudentShellSkeleton>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-[#e3e5dc] bg-white p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-5 w-2/3" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-3 h-3 w-24" />
          </div>
        ))}
      </div>
    </StudentShellSkeleton>
  )
}
