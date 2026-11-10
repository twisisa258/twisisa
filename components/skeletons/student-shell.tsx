import { Skeleton } from './skeleton'

/** Menu lateral do aluno (6 + 2 + 1 ligações), com as mesmas medidas do real (232 px). */
export function StudentSidebarSkeleton() {
  return (
    <aside aria-hidden="true" className="sh-aside">
      <Skeleton className="mx-2 mb-4 h-6 w-24" />
      {[6, 2, 1].map((count, group) => (
        <div key={group} className="mt-3">
          <Skeleton className="mx-2.5 mb-2 h-2.5 w-16" />
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2.5">
              <Skeleton className="size-[18px] rounded-md" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ))}
    </aside>
  )
}

/**
 * Esqueleto do StudentFeatureShell (menu lateral + cabeçalho + título). Mantém as medidas do shell real
 * (232 px de menu, cabeçalho de 52 px, conteúdo até 1050 px) para a página não saltar quando os dados chegam.
 */
export function StudentShellSkeleton({ children, hideBackLink = false, hideTitle = false }: { children: React.ReactNode; hideBackLink?: boolean; hideTitle?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label="A carregar" className="sh-app">
      <StudentSidebarSkeleton />
      <div className="sh-main min-w-0 overflow-x-clip">
        <div aria-hidden="true" className="sh-head">
          <div className="sh-bar">
            <Skeleton className="size-9 rounded-lg min-[900px]:hidden" />
            <span className="sh-sp" />
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
        <div className="mx-auto max-w-[1050px] px-5 py-6 sm:px-8 sm:py-10">
          {!hideBackLink && <Skeleton aria-hidden="true" className="h-4 w-40" />}
          {!hideTitle && <Skeleton className="mt-3 h-9 w-2/3 max-w-sm sm:h-10" />}
          <div className={hideTitle && hideBackLink ? '' : 'mt-5'}>{children}</div>
        </div>
      </div>
    </div>
  )
}
