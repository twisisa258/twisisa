import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { examPath } from '@/lib/exames-pure'
import type { ExamListItem } from '@/lib/exames'

/** «2023 (I)»: o ano e, se o exame tiver, a variante (I, II…). */
export function examYearLabel(exam: { heading: string; year: number | null }) {
  const variant = /\((IV|III|II|I)\)$/.exec(exam.heading)?.[1]
  if (!exam.year) return variant ? `(${variant})` : ''
  return variant ? `${exam.year} (${variant})` : String(exam.year)
}

// Uma linha da lista de exames: disciplina, universidade e ano. O título completo (pensado para o Google) fica no título da ligação.
export function ExamRow({ exam }: { exam: ExamListItem }) {
  return (
    <Link href={examPath(exam)} className="tw5-row" title={exam.heading} aria-label={exam.heading}>
      <b>{exam.subjectName}</b>
      <span>{exam.institutionShort}</span>
      <em>{examYearLabel(exam)}</em>
      <ChevronRight size={16} aria-hidden />
    </Link>
  )
}
