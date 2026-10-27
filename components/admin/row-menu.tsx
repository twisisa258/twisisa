'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import type { ActionResult } from '@/lib/action-result'

export type RowMenuItem = {
  label: string
  icon?: React.ReactNode
  /** Liga a uma página (ex.: editar). */
  href?: string
  /** Ou chama uma acção de servidor com `fields`. */
  action?: (formData: FormData) => Promise<ActionResult>
  fields?: Record<string, string>
  /** Texto do botão de confirmação; sem isto a acção corre logo. */
  confirm?: string
  tone?: 'neutral' | 'danger'
  disabled?: boolean
}

// Menu ⋯ de um cartão ou linha: guarda as acções para o cartão ficar só com o essencial.
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const feedback = useFeedback()
  const router = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<number | null>(null)
  const [pending, setPending] = useState(false)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    // O menu é fixo ao ecrã (não é cortado por listas com scroll); fecha se a página rolar ou mudar de tamanho.
    function onScrollOrResize() {
      close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onScrollOrResize)
    document.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open])

  function close() {
    setOpen(false)
    setConfirming(null)
  }

  function toggle() {
    if (open) return close()
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const needed = items.length * 40 + 16
      const right = Math.max(8, window.innerWidth - rect.right)
      // Abre para cima quando não há espaço por baixo.
      setPos(rect.bottom + needed > window.innerHeight - 8 ? { bottom: window.innerHeight - rect.top + 4, right } : { top: rect.bottom + 4, right })
    }
    setOpen(true)
  }

  async function run(item: RowMenuItem) {
    if (!item.action || pending) return
    setPending(true)
    try {
      const data = new FormData()
      for (const [key, value] of Object.entries(item.fields ?? {})) data.set(key, value)
      const result = await item.action(data)
      if (result.ok) {
        if (result.message) feedback.success(result.message)
      } else {
        feedback.error(result.message)
      }
      close()
      router.refresh()
    } catch {
      feedback.error('Não foi possível concluir. Tenta outra vez.')
    } finally {
      setPending(false)
    }
  }

  const row = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40'
  const tone = (item: RowMenuItem) => (item.tone === 'danger' ? 'text-[#9a3030] hover:bg-[#fbeeee]' : 'text-[#2f3a33] hover:bg-[#f1f4ef]')

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="flex size-9 items-center justify-center rounded-full text-[#526057] hover:bg-[#f1f4ef]"
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {open && pos && (
        <div role="menu" aria-label={label} style={pos} className="fixed z-30 w-52 rounded-xl border border-[#e3e5dc] bg-white p-1 shadow-lg">
          {items.map((item, index) =>
            confirming === index ? (
              <div key={item.label} className="p-2">
                <p className="text-xs font-medium text-[#2f3a33]">{item.label}?</p>
                <div className="mt-2 flex gap-1.5">
                  <button type="button" onClick={() => run(item)} disabled={pending} className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${item.tone === 'danger' ? 'bg-[#9a3030] hover:bg-[#7f2626]' : 'bg-[#1d4d41] hover:bg-[#163e34]'}`}>{pending ? 'A processar…' : item.confirm}</button>
                  <button type="button" onClick={() => setConfirming(null)} disabled={pending} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#526057] hover:bg-[#f1f4ef]">Cancelar</button>
                </div>
              </div>
            ) : item.href ? (
              <Link key={item.label} href={item.href} role="menuitem" onClick={close} className={`${row} ${tone(item)}`}>{item.icon}{item.label}</Link>
            ) : (
              <button key={item.label} type="button" role="menuitem" disabled={item.disabled || pending} onClick={() => (item.confirm ? setConfirming(index) : run(item))} className={`${row} ${tone(item)}`}>{item.icon}{item.label}</button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
