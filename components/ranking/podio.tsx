import { Crown, UserRound } from 'lucide-react'
import { Avatar } from '@/components/aluno/avatar'
import { Medalha } from '@/components/ranking/medalha'
import type { RankingRow } from '@/lib/ranking'
import { formatPoints } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'

// Pódio de verdade: três pedestais encostados, o 1.º ao centro e mais alto, medalha em cada lugar.
// A altura segue a ordem (1.º, 2.º, 3.º), não o número da posição: com empates a posição repete-se.
// Lugar sem ninguém aparece como «Livre»: mostra que ainda dá para entrar no pódio, sem inventar pessoas.
const LUGAR = [
  { alt: 'h-[124px]', frente: 'linear-gradient(180deg,#fff0b3 0%,#f2c14e 100%)', topo: '#fff8d6', texto: '#8a5a12', aro: 'linear-gradient(135deg,#fff0b3,#d99a06 60%,#f2c14e)' },
  { alt: 'h-[96px]', frente: 'linear-gradient(180deg,#f7f9fb 0%,#cfd6dd 100%)', topo: '#ffffff', texto: '#5f6b78', aro: 'linear-gradient(135deg,#ffffff,#aab4bf 60%,#e3e8ed)' },
  { alt: 'h-[76px]', frente: 'linear-gradient(180deg,#fbe0c4 0%,#dba06a 100%)', topo: '#fdeedd', texto: '#7a4515', aro: 'linear-gradient(135deg,#fbe0c4,#c9803f 60%,#e9b98c)' },
] as const

function Lugar({ row, index }: { row?: RankingRow; index: 0 | 1 | 2 }) {
  const t = LUGAR[index]
  const primeiro = index === 0
  const tamanho = primeiro ? 68 : 56
  return (
    <li className="flex min-w-0 flex-col items-center">
      <div className="relative flex flex-col items-center">
        {primeiro && row && <Crown size={22} fill="#f2c14e" className="mb-1 text-[#b7791f]" aria-hidden="true" />}
        <span className="rounded-full p-[3px]" style={{ background: row ? t.aro : '#e3e6dc' }}>
          <span className="block rounded-full bg-white p-[2px]">
            {row ? (
              <Avatar name={row.name} image={row.image} size={tamanho} />
            ) : (
              <span className="flex items-center justify-center rounded-full bg-[#f3f4ef] text-[#a3aaa4]" style={{ width: tamanho, height: tamanho }}><UserRound size={tamanho * 0.42} aria-hidden="true" /></span>
            )}
          </span>
        </span>
        {row && <span className="absolute -bottom-3 -right-1.5 drop-shadow-sm"><Medalha lugar={(index + 1) as 1 | 2 | 3} size={primeiro ? 30 : 26} /></span>}
      </div>
      <p className="mt-4 w-full truncate px-1 text-center text-[13px] font-semibold leading-4 text-texto">
        {row ? row.name : 'Livre'}
        {row?.isMe && <span className="font-medium text-marca"> (tu)</span>}
      </p>
      <p className="num mt-0.5 h-4 text-[12px] leading-4 text-texto-2">{row ? `${formatPoints(row.points)} pts` : 'à tua espera'}</p>
      <div
        className={cn('pilar mt-3 flex w-full items-start justify-center pt-3 text-[34px] font-extrabold leading-none num', t.alt, index === 0 && 'rounded-t-[14px]', index === 1 && 'rounded-tl-[14px]', index === 2 && 'rounded-tr-[14px]')}
        style={{ background: row ? t.frente : '#eef0ea', color: row ? t.texto : '#b9c0ba', boxShadow: row ? `inset 0 3px 0 ${t.topo}` : 'inset 0 3px 0 #f7f8f4', ['--atraso' as string]: `${[0.15, 0, 0.3][index]}s` }}
      >
        {row ? row.position : index + 1}
      </div>
    </li>
  )
}

export function Podio({ rows }: { rows: RankingRow[] }) {
  if (rows.length === 0) return null
  return (
    <ol aria-label="Pódio" className="sf grid grid-cols-3 items-end overflow-hidden px-2 pt-6" style={{ background: 'linear-gradient(180deg,#fffaea 0%,#ffffff 55%)' }}>
      <Lugar row={rows[1]} index={1} />
      <Lugar row={rows[0]} index={0} />
      <Lugar row={rows[2]} index={2} />
    </ol>
  )
}
