'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

// Janela pequena: ocupa o mínimo do ecrã, fecha com o X, com Esc ou ao tocar fora.
export function MiniModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const painel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const aoFechar = useRef(onClose)
  useEffect(() => { aoFechar.current = onClose })

  useEffect(() => {
    if (!open) return
    const antes = document.activeElement as HTMLElement | null
    painel.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') aoFechar.current() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      antes?.focus?.()
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose}>
      <div ref={painel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={(event) => event.stopPropagation()} className="w-full max-w-[380px] rounded-3xl bg-white p-5 shadow-xl outline-none">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-[17px] font-semibold leading-6">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="btn btn-icone -mr-2 -mt-2 shrink-0"><X size={20} aria-hidden /></button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}
