'use client'

import { useState } from 'react'
import { Bookmark, BookMarked, BookOpen, FileText, GraduationCap } from 'lucide-react'
import type { LibraryItem } from '@/lib/library-shared'
import { useLibrary } from '@/components/biblioteca/library-provider'

const icons: Record<string, typeof BookOpen> = {
  exames: FileText,
  apontamentos: BookOpen,
  resumos: BookMarked,
  fichas: GraduationCap,
  guias: GraduationCap,
  livros: BookMarked,
}

// Cobertura externa única: a metade de cima mostra o início do documento (1.ª página, cortada),
// a metade de baixo leva o título e o contexto. Toque em qualquer parte: abre a pré-visualização.
export function MaterialCard({ item }: { item: LibraryItem }) {
  const library = useLibrary()
  const [coverFailed, setCoverFailed] = useState(false)
  const Icon = icons[item.categorySlug] ?? FileText
  const saved = library.isSaved(item.id)
  const meta = (item.categorySlug === 'exames' ? [item.institution, item.subject, item.year ? String(item.year) : ''] : [item.subject, item.level, item.institution])
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="relative flex aspect-[3/4] min-w-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-white to-[#eef3ec] shadow-[0_1px_2px_rgba(20,50,40,0.05),0_10px_24px_-14px_rgba(20,50,40,0.3)]">
      <div className="relative h-1/2 shrink-0 overflow-hidden bg-gradient-to-br from-[#e4eee8] to-[#cbddd2]">
        <span className="absolute inset-0 flex items-center justify-center text-[#1d4d41]/45" aria-hidden="true">
          <Icon size={30} />
        </span>
        {item.coverUrl && !coverFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverUrl} alt="" loading="lazy" onError={() => setCoverFailed(true)} className="absolute inset-0 size-full bg-white object-cover object-top" />
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center px-2.5 py-2">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-[17px] text-[#202923]">{item.title}</h3>
        {meta && <p className="mt-0.5 truncate text-[11px] text-[#788178]">{meta}</p>}
      </div>
      <button type="button" onClick={() => library.open(item)} aria-label={`Abrir ${item.title}`} className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1d4d41]" />
      <button
        type="button"
        onClick={() => library.toggleSaved(item)}
        disabled={library.savingId === item.id}
        aria-pressed={saved}
        aria-label={saved ? 'Remover dos guardados' : 'Guardar'}
        className={`absolute right-1.5 top-1.5 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 backdrop-blur transition-colors disabled:opacity-60 ${saved ? 'text-[#1d4d41]' : 'text-[#68716a]'}`}
      >
        <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </article>
  )
}
