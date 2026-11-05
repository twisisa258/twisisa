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

// A capa é a 1.ª página do documento, quase inteira (proporção de folha); por baixo só o título e o contexto, sem espaço sobrando.
// Toque em qualquer parte abre a pré-visualização. `showCategory` só se usa em listas que misturam tipos.
export function MaterialCard({ item, showCategory = false, hideYear = false }: { item: LibraryItem; showCategory?: boolean; hideYear?: boolean }) {
  const library = useLibrary()
  const [coverFailed, setCoverFailed] = useState(false)
  const Icon = icons[item.categorySlug] ?? FileText
  const saved = library.isSaved(item.id)
  const meta = (item.categorySlug === 'exames' ? [item.institution, item.subject, item.year && !hideYear ? String(item.year) : ''] : [item.subject, item.level, item.institution])
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="sf sf-toque tom-ajuda relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-[4/5] shrink-0 overflow-hidden border-b border-linha bg-[color:var(--tom-suave)]">
        <span className="absolute inset-0 flex items-center justify-center text-[color:var(--tom-texto)]/55" aria-hidden="true">
          <Icon size={34} />
        </span>
        {item.coverUrl && !coverFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverUrl} alt="" loading="lazy" onError={() => setCoverFailed(true)} className="absolute inset-0 size-full bg-white object-cover object-top" />
        )}
      </div>
      <div className="flex flex-1 flex-col px-3 py-2.5">
        {showCategory && <p className="mb-0.5 truncate text-[11px] font-semibold text-[color:var(--tom-texto)]">{item.category}</p>}
        <h3 className="line-clamp-2 text-[14px] font-semibold leading-[18px] text-texto">{item.title}</h3>
        {meta && <p className="mt-0.5 truncate text-[12px] leading-4 text-texto-2">{meta}</p>}
      </div>
      <button type="button" onClick={() => library.open(item)} aria-label={`Abrir ${item.title}`} className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca" />
      <button
        type="button"
        onClick={() => library.toggleSaved(item)}
        disabled={library.savingId === item.id}
        aria-pressed={saved}
        aria-label={saved ? 'Remover dos guardados' : 'Guardar'}
        className={`absolute right-2 top-2 z-10 flex size-10 items-center justify-center rounded-full bg-white/95 transition-colors disabled:opacity-60 ${saved ? 'text-[color:var(--tom-texto)]' : 'text-texto-2'}`}
        style={{ boxShadow: 'inset 0 0 0 1px var(--linha)' }}
      >
        <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </article>
  )
}
