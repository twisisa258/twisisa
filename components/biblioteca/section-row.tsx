import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { LibraryItem } from '@/lib/library-shared'
import { MaterialCard } from '@/components/biblioteca/material-card'

// Uma secção da página inicial: título, «Ver mais» e uma fila curta de cartões (desliza no telemóvel, grelha no computador).
export function SectionRow({ title, href, items }: { title: string; href?: string; items: LibraryItem[] }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[#202321]">{title}</h2>
        {href && (
          <Link href={href} className="inline-flex h-8 items-center gap-0.5 rounded-full bg-gradient-to-br from-[#eaf1ec] to-[#d9e8de] pl-3 pr-2 text-xs font-semibold text-[#1d4d41]">
            Ver mais
            <ChevronRight size={14} />
          </Link>
        )}
      </div>
      <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.id} className="w-[142px] shrink-0 snap-start lg:w-auto">
            <MaterialCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}
