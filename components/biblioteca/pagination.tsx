import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function windowOf(page: number, pages: number) {
  const wanted = new Set([1, pages, page - 1, page, page + 1])
  const list = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  list.forEach((n, index) => {
    if (index > 0 && n - list[index - 1] > 1) out.push('gap')
    out.push(n)
  })
  return out
}

// Páginas em vez de scroll infinito: a lista nunca cresce, por maior que seja o catálogo.
export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null
  const base = 'flex size-10 items-center justify-center rounded-full text-sm font-semibold'
  return (
    <nav aria-label="Páginas" className="flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} aria-label="Página anterior" className={`${base} bg-white text-[#1d4d41] shadow-[0_1px_2px_rgba(20,50,40,0.05)]`}><ChevronLeft size={18} /></Link>
      ) : (
        <span aria-hidden="true" className={`${base} text-[#c3c9c1]`}><ChevronLeft size={18} /></span>
      )}
      {windowOf(page, pages).map((item, index) =>
        item === 'gap' ? (
          <span key={`g-${index}`} aria-hidden="true" className="px-1 text-[#929b94]">…</span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Página ${item}`}
            className={`${base} ${item === page ? 'bg-gradient-to-br from-[#2a6a57] to-[#1d4d41] text-white' : 'text-[#465249] hover:bg-white'}`}
          >
            {item}
          </Link>
        ),
      )}
      {page < pages ? (
        <Link href={hrefFor(page + 1)} aria-label="Página seguinte" className={`${base} bg-white text-[#1d4d41] shadow-[0_1px_2px_rgba(20,50,40,0.05)]`}><ChevronRight size={18} /></Link>
      ) : (
        <span aria-hidden="true" className={`${base} text-[#c3c9c1]`}><ChevronRight size={18} /></span>
      )}
    </nav>
  )
}
