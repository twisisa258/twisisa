import Link from 'next/link'
import { examPath } from '@/lib/exames-pure'
import type { ExamListItem } from '@/lib/exames'

// Uma linha da lista de exames: título (pensado para o Google), ano e botão «Ler».
export function ExamRow({ exam }: { exam: ExamListItem }) {
  return (
    <Link href={examPath(exam)} className="tw5-row">
      <b>{exam.heading}</b>
      {exam.year && <em>{exam.year}</em>}
      <u>Ler</u>
    </Link>
  )
}
