import { Avatar } from '@/components/aluno/avatar'
import type { RankingRow } from '@/lib/ranking'
import { formatPoints } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'

// Os três primeiros. A altura do pilar segue a ordem da lista (1.º, 2.º, 3.º), não o número da posição: com empates, a posição repete-se.
// Só se usa com 3 ou mais pessoas; com menos, a lista normal chega (nada de lugares vazios a fingir).
const ALTURA = ['h-[92px]', 'h-[68px]', 'h-[52px]']
const PILAR = [
  'border-[#f3dc92] bg-conquista-suave text-conquista-texto',
  'border-linha bg-[#eef1ea] text-texto-2',
  'border-linha bg-[#f3f4ef] text-texto-2',
]

function Lugar({ row, index }: { row: RankingRow; index: number }) {
  const primeiro = index === 0
  return (
    <li className="flex min-w-0 flex-col items-center">
      <span className={cn('rounded-full p-[3px]', primeiro ? 'bg-[conic-gradient(from_200deg,#f3dc92,#d99a06,#f3dc92)]' : 'bg-linha')}>
        <span className="block rounded-full bg-white p-[2px]"><Avatar name={row.name} image={row.image} size={primeiro ? 60 : 48} /></span>
      </span>
      <p className="mt-2 w-full truncate text-center text-[13px] font-semibold leading-4 text-texto">
        {row.name}
        {row.isMe && <span className="font-medium text-marca"> (tu)</span>}
      </p>
      <p className="num mt-0.5 text-[12px] leading-4 text-texto-2">{formatPoints(row.points)} pts</p>
      <div
        className={cn('pilar mt-3 flex w-full items-start justify-center rounded-t-[14px] border border-b-0 pt-2 text-[20px] font-semibold num', ALTURA[index], PILAR[index])}
        style={{ ['--atraso' as string]: `${[0.15, 0, 0.3][index]}s` }}
      >
        {row.position}
      </div>
    </li>
  )
}

export function Podio({ rows }: { rows: RankingRow[] }) {
  const [um, dois, tres] = rows
  if (!um || !dois || !tres) return null
  return (
    <ol aria-label="Os três primeiros" className="sf grid grid-cols-3 items-end gap-2.5 overflow-hidden px-4 pt-6">
      <Lugar row={dois} index={1} />
      <Lugar row={um} index={0} />
      <Lugar row={tres} index={2} />
    </ol>
  )
}
