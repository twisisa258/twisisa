'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { filterConversations, groupConversations } from '@/lib/jonas-shared'
import type { ConversationSummary } from '@/lib/jonas'

// Histórico de conversas: pesquisa, grupos por data, abrir, mudar o nome e eliminar (com confirmação).
export function HistorySidebar({
  conversations,
  activeId,
  loadFailed,
  busyId,
  onNew,
  onOpen,
  onRename,
  onDelete,
  onClose,
}: {
  conversations: ConversationSummary[]
  activeId: string | null
  loadFailed: boolean
  busyId: string | null
  onNew: () => void
  onOpen: (id: string) => void
  onRename: (id: string, title: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  /** Só no telemóvel: fecha a gaveta. */
  onClose: () => void
}) {
  const [term, setTerm] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => groupConversations(filterConversations(conversations, term)), [conversations, term])

  useEffect(() => {
    if (!menuId) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !(event.target instanceof Element && event.target.closest('[data-row-menu]'))) setMenuId(null)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuId])

  async function commitRename(id: string) {
    const value = renameValue.trim()
    setRenamingId(null)
    if (value) await onRename(id, value)
  }

  return (
    <div ref={root} className="flex h-full min-h-0 flex-col bg-[#f2f4ee]">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={onNew}
          className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#2f7260] to-[#1d4d41] px-4 text-[14px] font-semibold text-white shadow-[0_2px_6px_rgba(29,77,65,0.25)] transition active:scale-[0.99] hover:from-[#2a6858] hover:to-[#183f35]"
        >
          <Plus size={17} aria-hidden="true" /> Nova conversa
        </button>
        <button type="button" onClick={onClose} aria-label="Fechar o histórico" className="flex size-11 shrink-0 items-center justify-center rounded-full text-[#5d675f] hover:bg-[#e6eae0] lg:hidden">
          <X size={19} aria-hidden="true" />
        </button>
      </div>

      <div className="px-3 pb-2">
        <label className="relative block">
          <span className="sr-only">Pesquisar conversas</span>
          <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a948c]" />
          <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Pesquisar conversas" className="h-10 w-full rounded-full bg-white/80 pl-9 pr-3 text-[14px] outline-none ring-1 ring-black/[0.05] placeholder:text-[#98a19a] focus:ring-2 focus:ring-[#1d4d41]/25" />
        </label>
      </div>

      <nav aria-label="Histórico de conversas" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
        {loadFailed && <p className="mx-2 mt-2 rounded-xl bg-[#fcefef] px-3 py-2 text-[13px] text-[#9a3030]">Não foi possível carregar o histórico.</p>}
        {!loadFailed && conversations.length === 0 && <p className="mx-3 mt-4 text-[13.5px] leading-6 text-[#6b756e]">As tuas conversas ficam guardadas aqui. Começa com a primeira pergunta.</p>}
        {!loadFailed && conversations.length > 0 && groups.length === 0 && <p className="mx-3 mt-4 text-[13.5px] text-[#6b756e]">Nenhuma conversa corresponde a «{term}».</p>}

        {groups.map((group) => (
          <section key={group.label} className="mt-3">
            <h2 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7d887f]">{group.label}</h2>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.id === activeId
                return (
                  <li key={item.id} className="relative">
                    {renamingId === item.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault()
                          void commitRename(item.id)
                        }}
                        className="px-1 py-0.5"
                      >
                        <input autoFocus value={renameValue} maxLength={120} onChange={(event) => setRenameValue(event.target.value)} onBlur={() => void commitRename(item.id)} onKeyDown={(event) => event.key === 'Escape' && setRenamingId(null)} aria-label="Novo nome da conversa" className="h-10 w-full rounded-xl bg-white px-3 text-[14px] outline-none ring-2 ring-[#1d4d41]/30" />
                      </form>
                    ) : confirmId === item.id ? (
                      <div className="flex items-center gap-2 rounded-xl bg-[#fbeceb] px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#8a3a33]">Eliminar esta conversa?</span>
                        <button type="button" disabled={busyId === item.id} onClick={async () => { await onDelete(item.id); setConfirmId(null) }} className="h-8 rounded-full bg-[#b5473d] px-3 text-[12px] font-semibold text-white disabled:opacity-60">Eliminar</button>
                        <button type="button" onClick={() => setConfirmId(null)} className="h-8 rounded-full px-2 text-[12px] font-semibold text-[#6b756e] hover:bg-white/70">Não</button>
                      </div>
                    ) : (
                      <div className={`group flex items-center rounded-xl transition-colors ${active ? 'bg-gradient-to-br from-[#e1ece5] to-[#d3e3d9]' : 'hover:bg-[#e8ece2]'}`}>
                        <button type="button" onClick={() => onOpen(item.id)} aria-current={active ? 'page' : undefined} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                          <span className={`block truncate text-[14px] leading-5 ${active ? 'font-semibold text-[#1d4d41]' : 'font-medium text-[#2b332d]'}`}>{item.title}</span>
                          {item.subjectName && <span className="mt-0.5 block truncate text-[11.5px] text-[#7d887f]">{item.subjectName}</span>}
                        </button>
                        <div data-row-menu className="relative shrink-0 pr-1">
                          <button type="button" onClick={() => setMenuId((current) => (current === item.id ? null : item.id))} aria-label={`Mais opções: ${item.title}`} aria-expanded={menuId === item.id} className="flex size-9 items-center justify-center rounded-full text-[#6b756e] opacity-100 hover:bg-white/70 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100">
                            <MoreHorizontal size={17} aria-hidden="true" />
                          </button>
                          {menuId === item.id && (
                            <div role="menu" className="absolute right-1 top-9 z-20 w-40 overflow-hidden rounded-xl bg-white py-1 shadow-[0_8px_24px_rgba(20,50,40,0.18)] ring-1 ring-black/[0.06]">
                              <button role="menuitem" type="button" onClick={() => { setMenuId(null); setRenameValue(item.title); setRenamingId(item.id) }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13.5px] hover:bg-[#f3f6f0]"><Pencil size={15} aria-hidden="true" />Mudar o nome</button>
                              <button role="menuitem" type="button" onClick={() => { setMenuId(null); setConfirmId(item.id) }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13.5px] text-[#a0443b] hover:bg-[#fbeceb]"><Trash2 size={15} aria-hidden="true" />Eliminar</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </nav>
    </div>
  )
}
