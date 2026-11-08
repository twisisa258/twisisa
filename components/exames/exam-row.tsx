import Link from 'next/link'
import { FileText } from 'lucide-react'
import { examPath } from '@/lib/exames-pure'
import type { ExamListItem } from '@/lib/exames'

// Uma linha da lista de exames: título pensado para o Google («Exame de admissão de Matemática UEM 2023 (II)»).
export function ExamRow({ exam }: { exam: ExamListItem }) {
  return (
    <Link href={examPath(exam)} className="ex-card flex items-center gap-3 rounded-2xl border border-linha bg-white px-4 py-3.5 text-texto no-underline">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><FileText size={19} aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-snug">{exam.heading}</span>
        <span className="mt-0.5 block text-xs text-texto-2">{exam.institutionShort} · {exam.subjectName}{exam.year ? ` · ${exam.year}` : ''}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-marca">Ler</span>
    </Link>
  )
}
