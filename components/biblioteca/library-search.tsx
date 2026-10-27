'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, FileText, Search, TrendingUp, X } from 'lucide-react'
import { withParams } from '@/lib/library-shared'
import { clearSearchHistory, saveSearch } from '@/app/biblioteca/(catalogo)/actions'

type Suggestion = { id: string; title: string; meta: string; categorySlug: string }
type Payload = { recent: string[]; popular: string[]; items: Suggestion[] }
type Row = { key: string; label: string; meta?: string; kind: 'recent' | 'popular' | 'item' | 'all'; term: string }

const EMPTY: Payload = { recent: [], popular: [], items: [] }

// Pesquisa em tempo real. Enquanto escreves aparecem sugestões; o que pesquisas fica guardado no histórico.
// `scope`: slug da categoria (ex.: exames) para pesquisar só dentro dela.
export function LibrarySearch({ scope, initialQuery = '', placeholder = 'Pesquisar na biblioteca' }: { scope?: string; initialQuery?: string; placeholder?: string }) {
  const router = useRouter()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<Payload>(EMPTY)
  const [active, setActive] = useState(-1)
  const base = scope ? `/biblioteca/${scope}` : '/biblioteca/pesquisa'
  const term = value.trim()

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const timer = window.setTimeout(
      async () => {
        try {
          const params = new URLSearchParams({ q: term })
          if (scope) params.set('scope', scope)
          const response = await fetch(`/api/biblioteca/sugestoes?${params.toString()}`, { signal: controller.signal })
          if (response.ok) {
            setData((await response.json()) as Payload)
            setActive(-1)
          }
        } catch {
          // Sem ligação ou pedido cancelado: mantém as sugestões anteriores.
        }
      },
      term ? 180 : 0,
    )
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [term, open, scope])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function run(text: string) {
    const clean = text.trim()
    setOpen(false)
    setValue(clean)
    if (clean.length >= 2) void saveSearch(clean).catch(() => undefined)
    router.push(withParams(base, { q: clean }))
  }

  async function clearHistory() {
    setData((current) => ({ ...current, recent: [] }))
    await clearSearchHistory().catch(() => undefined)
  }

  const rows: Row[] = []
  for (const text of data.recent) rows.push({ key: `r-${text}`, label: text, kind: 'recent', term: text })
  if (!term) for (const text of data.popular) rows.push({ key: `p-${text}`, label: text, kind: 'popular', term: text })
  for (const item of data.items) rows.push({ key: `i-${item.id}`, label: item.title, meta: item.meta, kind: 'item', term: item.title })
  if (term) rows.push({ key: 'all', label: `Ver todos os resultados para «${term}»`, kind: 'all', term })

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
    } else if (event.key === 'ArrowDown' && rows.length > 0) {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, rows.length - 1))
    } else if (event.key === 'ArrowUp' && rows.length > 0) {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, -1))
    } else if (event.key === 'Enter' && active >= 0 && rows[active]) {
      event.preventDefault()
      run(rows[active].term)
    }
  }

  const showPanel = open && rows.length > 0

  return (
    <div ref={rootRef} className="relative z-30">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          run(value)
        }}
        className="flex h-12 items-center gap-3 rounded-2xl bg-white px-3.5 shadow-[0_1px_2px_rgba(20,50,40,0.05),0_10px_26px_-14px_rgba(20,50,40,0.22)] focus-within:ring-2 focus-within:ring-[#1d4d41]/25"
      >
        <Search size={18} className="shrink-0 text-[#5f6a63]" aria-hidden="true" />
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={80}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#929b94]"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              setValue('')
              setOpen(true)
            }}
            aria-label="Limpar pesquisa"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#788178] hover:bg-[#f1f4ef]"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+8px)] max-h-[min(60vh,420px)] overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_18px_44px_-12px_rgba(20,50,40,0.32)]"
        >
          {rows.map((row, index) => {
            const previous = rows[index - 1]
            const heading = !previous || previous.kind !== row.kind ? row.kind : null
            return (
              <li key={row.key} role="presentation">
                {heading === 'recent' && (
                  <div className="flex items-center justify-between px-3 pb-1 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#929991]">Recentes</span>
                    {!term && (
                      <button type="button" onClick={() => void clearHistory()} className="text-[11px] font-semibold text-[#1d4d41]">
                        Limpar
                      </button>
                    )}
                  </div>
                )}
                {heading === 'popular' && <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#929991]">Em alta</p>}
                {heading === 'item' && <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#929991]">Materiais</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onClick={() => run(row.term)}
                  onPointerMove={() => setActive(index)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${index === active ? 'bg-[#f1f4ef]' : ''} ${row.kind === 'all' ? 'font-semibold text-[#1d4d41]' : 'text-[#202321]'}`}
                >
                  {row.kind === 'recent' && <Clock size={16} className="shrink-0 text-[#788178]" />}
                  {row.kind === 'popular' && <TrendingUp size={16} className="shrink-0 text-[#788178]" />}
                  {row.kind === 'item' && <FileText size={16} className="shrink-0 text-[#788178]" />}
                  {row.kind === 'all' && <Search size={16} className="shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{row.label}</span>
                    {row.meta && <span className="block truncate text-xs text-[#788178]">{row.meta}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
