import { Skeleton } from './skeleton'

/** Menu lateral do estudante (5 + 1 ligações), igual em todas as páginas: /aluno e as que usam StudentFeatureShell. */
export function StudentSidebarSkeleton() {
  return (
    <aside aria-hidden="true" className="hidden w-[252px] shrink-0 flex-col border-r border-[#eceee7] bg-[#f3f4ef] px-4 py-5 lg:flex">
      <Skeleton className="mx-3 h-6 w-24" />
      <div className="mt-10 flex flex-1 flex-col gap-8">
        {[5, 1].map((count, group) => (
          <div key={group}>
            <Skeleton className="mx-3 h-2.5 w-20" />
            <div className="mt-3 flex flex-col gap-1">
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="size-[17px] rounded-md" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 border-t border-[#e3e6dc] pt-4">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </aside>
  )
}

/**
 * Esqueleto do StudentFeatureShell (menu lateral + cabeçalho + título). Mantém as mesmas medidas do shell real
 * (252px de menu, conteúdo até 1050px) para a página não saltar quando os dados chegam.
 * Usado pelas páginas que usam StudentFeatureShell; o conteúdo próprio de cada página vai em children.
 */
export function StudentShellSkeleton({ children, hideBackLink = false, hideTitle = false }: { children: React.ReactNode; hideBackLink?: boolean; hideTitle?: boolean }) {
  return (
    <main role="status" aria-live="polite" aria-busy="true" aria-label="A carregar" className="min-h-screen overflow-x-hidden bg-[#f8f8f5]">
      <div className="flex min-h-screen">
        <StudentSidebarSkeleton />
        <div className="min-w-0 flex-1">
          <div aria-hidden="true" className="border-b border-[#eceee7] px-5 py-3 sm:px-8">
            <div className="mx-auto flex min-h-10 max-w-[1050px] items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full lg:hidden" />
                <Skeleton className="h-5 w-24 lg:hidden" />
                <div className="hidden lg:block">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="mt-1.5 h-3.5 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="size-10 rounded-full" />
                <Skeleton className="hidden h-3 w-16 sm:block" />
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-[1050px] px-5 py-6 sm:px-8 sm:py-10">
            {!hideBackLink && <Skeleton aria-hidden="true" className="h-4 w-40" />}
            {!hideTitle && <Skeleton className="mt-3 h-9 w-2/3 max-w-sm sm:h-10" />}
            <div className={hideTitle && hideBackLink ? '' : 'mt-5'}>{children}</div>
          </div>
        </div>
      </div>
    </main>
  )
}
