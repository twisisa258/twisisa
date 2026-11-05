import Link from 'next/link'
import { BookMarked, BookOpen, ChevronRight, FileText, GraduationCap, Library, TrendingUp, type LucideIcon } from 'lucide-react'
import type { LibraryItem } from '@/lib/library-shared'
import { MaterialCard } from '@/components/biblioteca/material-card'

const ICONES: Record<string, LucideIcon> = { exames: FileText, apontamentos: BookOpen, resumos: BookMarked, fichas: GraduationCap, guias: GraduationCap, livros: Library, populares: TrendingUp }

// Uma secção da página inicial: ícone, título, «Ver mais» e uma fila curta de cartões (desliza no telemóvel, grelha no computador).
export function SectionRow({ title, href, slug, items }: { title: string; href?: string; slug?: string; items: LibraryItem[] }) {
  const Icon = ICONES[slug ?? ''] ?? FileText
  return (
    <section aria-label={title} className="tom-ajuda">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[16px] font-semibold tracking-[-0.01em] text-texto">
          <span className="ic-tom ic-tom-sm"><Icon size={16} aria-hidden="true" /></span>
          <span className="truncate">{title}</span>
        </h2>
        {href && (
          <Link href={href} className="btn btn-tom shrink-0 whitespace-nowrap !min-h-9 gap-0.5 !py-0 pl-3.5 pr-2.5 text-[13px]">
            Ver mais
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
      <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.id} className="w-[148px] shrink-0 snap-start lg:w-auto">
            <MaterialCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}
