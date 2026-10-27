import { Skeleton } from './skeleton'
import { StudentSidebarSkeleton } from './student-shell'

/** /aluno usa o mesmo menu das outras páginas do estudante, mas o seu próprio cabeçalho. O cartão «Continuar» só existe quando há o que continuar, por isso não aparece aqui. */
export function AlunoSkeleton() {
  return (
    <main role="status" aria-live="polite" aria-busy="true" aria-label="A carregar o teu painel" className="min-h-screen max-w-full overflow-x-hidden bg-[#f8f8f5]">
      <div className="flex min-h-screen">
        <StudentSidebarSkeleton />
        <div className="w-0 min-w-0 flex-1 overflow-x-clip">
          <div aria-hidden="true" className="flex h-[60px] items-center justify-between border-b border-[#eceee7] px-[16px] lg:px-8">
            <div className="flex items-center gap-[8px] lg:hidden">
              <Skeleton className="size-[44px] rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="ml-auto size-[24px] rounded-full" />
          </div>
          <div aria-hidden="true" className="mx-auto flex w-full max-w-[560px] flex-col gap-[16px] px-[16px] pb-[24px] pt-[12px] lg:grid lg:max-w-[1040px] lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:px-8 lg:pb-12 lg:pt-8">
            <div className="flex min-w-0 flex-col gap-[16px]">
              {/* Saudação + percurso */}
              <div className="flex h-[32px] items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-[32px] w-28 rounded-full" />
              </div>
              {/* O que queres fazer? */}
              <div className="rounded-[20px] bg-white p-[14px] shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)]">
                <Skeleton className="mb-[12px] ml-[4px] h-3 w-40" />
                <div className="flex flex-col gap-[10px]">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[64px] rounded-[16px]" />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-[16px]">
              {/* Resumo: 4 mosaicos */}
              <div className="grid grid-cols-2 gap-[10px]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[76px] rounded-[16px]" />
                ))}
              </div>
              {/* Recentes e Guardados */}
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="mb-[8px] ml-[4px] h-3 w-24" />
                  <Skeleton className="h-[96px] rounded-[18px]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
