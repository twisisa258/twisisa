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
    <article className="sf sf-toque tom-ajuda relative flex aspect-[3/4] min-w-0 flex-col overflow-hidden rounded-2xl">
      <div className="relative h-1/2 shrink-0 overflow-hidden border-b border-linha bg-[color:var(--tom-suave)]">
        <span className="absolute inset-0 flex items-center justify-center text-[color:var(--tom-texto)]/55" aria-hidden="true">
          <Icon size={30} />
        </span>
        {item.coverUrl && !coverFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverUrl} alt="" loading="lazy" onError={() => setCoverFailed(true)} className="absolute inset-0 size-full bg-white object-cover object-top" />
        )}
        <span className="absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--tom-texto)]" style={{ boxShadow: 'inset 0 0 0 1px var(--tom-linha)' }}>
          {item.category}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center px-2.5 py-2">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-[17px] text-texto">{item.title}</h3>
        {meta && <p className="mt-0.5 truncate text-[11px] text-texto-2">{meta}</p>}
      </div>
      <button type="button" onClick={() => library.open(item)} aria-label={`Abrir ${item.title}`} className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca" />
      <button
        type="button"
        onClick={() => library.toggleSaved(item)}
        disabled={library.savingId === item.id}
        aria-pressed={saved}
        aria-label={saved ? 'Remover dos guardados' : 'Guardar'}
        className={`absolute right-1.5 top-1.5 z-10 flex size-9 items-center justify-center rounded-full bg-white/95 transition-colors disabled:opacity-60 ${saved ? 'text-[color:var(--tom-texto)]' : 'text-texto-2'}`}
        style={{ boxShadow: 'inset 0 0 0 1px var(--linha)' }}
      >
        <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </article>
  )
}
