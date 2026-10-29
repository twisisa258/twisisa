import { Skeleton } from './skeleton'
import { StudentShellSkeleton } from './student-shell'

/** /aluno/perfil: foto + nome + barra de completude, e 5 linhas recolhidas (mesmas medidas da página real). */
export function PerfilSkeleton() {
  return (
    <StudentShellSkeleton hideTitle hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <Skeleton className="size-20 shrink-0 rounded-full sm:size-24" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-7 w-2/3 sm:h-8" />
            <Skeleton className="mt-2 h-4 w-1/3" />
            <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        </div>
        <div className="divide-y divide-[#eceee7] overflow-hidden rounded-2xl border border-[#e3e6dc] bg-white">
          {['w-3/5', 'w-2/5', 'w-4/5', 'w-1/3', 'w-1/4'].map((width, index) => (
            <div key={index} className="flex min-h-[68px] items-center gap-3 px-4 py-3 sm:px-5">
              <Skeleton className="size-9 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className={`mt-1.5 h-3 ${width}`} />
              </div>
              <Skeleton className="size-5 shrink-0 rounded-full" />
              <Skeleton className="size-[18px] shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </StudentShellSkeleton>
  )
}
