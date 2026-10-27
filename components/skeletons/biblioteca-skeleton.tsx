import { Skeleton } from './skeleton'
import { StudentShellSkeleton } from './student-shell'

function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton className="aspect-[3/4] rounded-2xl" />
      <Skeleton className="mt-2 h-3.5 w-full" />
      <Skeleton className="mt-1.5 h-3 w-2/3" />
    </div>
  )
}

/** /biblioteca (início): cabeçalho com ícone, pesquisa e secções com uma fila de cartões com capa. */
export function BibliotecaSkeleton() {
  return (
    <StudentShellSkeleton hideBackLink hideTitle>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-12 rounded-2xl" />
        {Array.from({ length: 3 }).map((_, section) => (
          <div key={section}>
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
            <div className="-mx-5 flex gap-3 overflow-hidden px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <CardSkeleton key={i} className="w-[142px] shrink-0 lg:w-auto" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </StudentShellSkeleton>
  )
}

/** Listas da Biblioteca (secção, pesquisa): pesquisa, filas de botões, filtros e grelha de cartões. */
export function BibliotecaListSkeleton() {
  return (
    <StudentShellSkeleton>
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-2xl" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-44 rounded-xl" />
          <Skeleton className="h-11 w-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </StudentShellSkeleton>
  )
}

/** /biblioteca/explorar: mosaicos das categorias. */
export function BibliotecaExplorarSkeleton() {
  return (
    <StudentShellSkeleton>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-2xl" />
        ))}
      </div>
    </StudentShellSkeleton>
  )
}
