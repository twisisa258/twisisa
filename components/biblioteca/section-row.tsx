import Link from 'next/link'
import { BookMarked, BookOpen, ChevronRight, FileText, GraduationCap, Library, TrendingUp, type LucideIcon } from 'lucide-react'
import type { LibraryItem } from '@/lib/library-shared'
import { MaterialGrid } from '@/components/biblioteca/material-grid'

export const ICONES_SECCAO: Record<string, LucideIcon> = { exames: FileText, apontamentos: BookOpen, resumos: BookMarked, fichas: GraduationCap, guias: GraduationCap, livros: Library, populares: TrendingUp }

// Uma secção da página inicial: ícone, título, «Ver mais» e os materiais em grelha de duas colunas (sem scroll para o lado).
export function SectionRow({ title, href, slug, items, byYear = false }: { title: string; href?: string; slug?: string; items: LibraryItem[]; byYear?: boolean }) {
  const Icon = ICONES_SECCAO[slug ?? ''] ?? FileText
  return (
    <section aria-label={title} className="tom-ajuda">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[17px] font-semibold tracking-[-0.01em] text-texto">
          <span className="ic-tom ic-tom-sm"><Icon size={16} aria-hidden="true" /></span>
          <span className="truncate">{title}</span>
        </h2>
        {href && (
          <Link href={href} className="btn btn-tom shrink-0 whitespace-nowrap !min-h-9 gap-0.5 !py-0 pl-3.5 pr-2.5 text-[13px]">
            Ver tudo
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
      <MaterialGrid items={items} byYear={byYear} />
    </section>
  )
}
