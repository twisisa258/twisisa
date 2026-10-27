import { Skeleton } from './skeleton'
import { StudentShellSkeleton } from './student-shell'

function InputSkeleton({ labelWidth = 'w-28' }: { labelWidth?: string }) {
  return (
    <div className="grid gap-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className="h-10 rounded-lg" />
    </div>
  )
}

function SectionHeader() {
  return (
    <>
      <div className="flex items-center gap-2">
        <Skeleton className="size-6 rounded-md" />
        <Skeleton className="h-5 w-44" />
      </div>
      <Skeleton className="mt-2 h-3.5 w-3/4" />
    </>
  )
}

/** /aluno/perfil: informações pessoais (4 campos), percurso (texto e botão), candidato (2 campos) e botão de guardar. */
export function PerfilSkeleton() {
  return (
    <StudentShellSkeleton hideBackLink>
      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <SectionHeader />
          <div className="mt-6 grid gap-4">
            <InputSkeleton />
            <InputSkeleton labelWidth="w-12" />
            <InputSkeleton labelWidth="w-32" />
            <InputSkeleton labelWidth="w-24" />
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <SectionHeader />
          <Skeleton className="mt-4 h-10 w-40 rounded-lg" />
        </section>
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <SectionHeader />
          <div className="mt-5 grid gap-4">
            <InputSkeleton labelWidth="w-20" />
            <InputSkeleton labelWidth="w-24" />
          </div>
        </section>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </StudentShellSkeleton>
  )
}
