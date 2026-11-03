import Link from 'next/link'

// Disciplinas como botões (duas lado a lado; mais, em coluna). Sem seletor.
export function SubjectChoice({ subjects, current, mode }: { subjects: { id: string; name: string }[]; current: string | null; mode?: string }) {
  return (
    <div role="group" aria-label="Disciplina" className={`grid gap-2.5 ${subjects.length === 2 ? 'grid-cols-2' : ''}`}>
      {subjects.map((item) => {
        const active = item.id === current
        return (
          <Link
            key={item.id}
            href={`/aluno/simulador?d=${encodeURIComponent(item.id)}${mode ? `&m=${mode}` : ''}`}
            replace
            scroll={false}
            aria-current={active ? 'true' : undefined}
            className={`flex min-h-[64px] items-center justify-center rounded-2xl px-4 text-center text-[16px] font-semibold no-underline transition ${active ? 'bg-marca text-white' : 'bg-white text-texto shadow-[0_1px_3px_rgba(20,50,40,0.10)] active:scale-[0.99]'}`}
          >
            {item.name}
          </Link>
        )
      })}
    </div>
  )
}
