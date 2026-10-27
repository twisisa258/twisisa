'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, X } from 'lucide-react'

const ModalCloseContext = createContext<(() => void) | null>(null)

/** Dentro de um modal devolve a função que o fecha; fora dele devolve null. */
export function useModalClose() {
  return useContext(ModalCloseContext)
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Moldura do modal: bloqueia o scroll de fundo, prende o foco, fecha com Esc e devolve o foco ao fechar.
// Não fecha ao clicar fora (evita perder o que foi escrito ou o ficheiro já carregado).
function ModalFrame({ title, description, onClose, returnFocusRef, children }: { title: string; description?: string; onClose: () => void; returnFocusRef?: RefObject<HTMLElement | null>; children: React.ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        // O aviso de erro (por cima) trata o seu próprio Escape.
        if (document.querySelector('[role="alertdialog"]')) return
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      const target = returnFocusRef?.current ?? opener
      if (target && document.contains(target)) target.focus()
    }
  }, [onClose, returnFocusRef])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
        tabIndex={-1}
        className="flex max-h-[94dvh] w-full flex-col rounded-t-3xl bg-white shadow-xl outline-none sm:max-h-[90dvh] sm:max-w-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#edf0e9] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="form-modal-title" className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-[#737c75]">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-[#526057] hover:bg-[#f1f4ef]">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <ModalCloseContext.Provider value={onClose}>{children}</ModalCloseContext.Provider>
        </div>
      </div>
    </div>
  )
}

// Botão que abre um formulário num modal: uma coisa de cada vez. O conteúdo só existe enquanto o modal está aberto,
// por isso fechar limpa os campos e cancela um carregamento em curso.
// `variant="secondary"` + `icon="upload"` dá um botão discreto (só ícone, com `label` como nome acessível).
// O ícone passa-se pelo NOME: nunca se passam componentes de uma página de servidor para um componente de cliente.
export function FormModal({
  label,
  title,
  description,
  variant = 'primary',
  icon = 'plus',
  children,
}: {
  label: string
  title: string
  description?: string
  variant?: 'primary' | 'secondary'
  icon?: 'plus' | 'upload'
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={variant === 'secondary' ? label : undefined}
        className={
          variant === 'secondary'
            ? 'inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#c9d7cd] bg-white/80 text-[#1d4d41] shadow-sm hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4d41]'
            : 'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1d4d41] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#163e34] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4d41]'
        }
      >
        {icon === 'upload' ? <Upload size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
        {variant === 'primary' && label}
      </button>
      {open && (
        <ModalFrame title={title} description={description} onClose={close} returnFocusRef={triggerRef}>
          {children}
        </ModalFrame>
      )}
    </>
  )
}

// Modal aberto por um endereço (ex.: ?editar=id). Fechar volta a `closeHref`.
export function RouteModal({ title, description, closeHref, children }: { title: string; description?: string; closeHref: string; children: React.ReactNode }) {
  const router = useRouter()
  const close = useCallback(() => router.replace(closeHref, { scroll: false }), [router, closeHref])
  return (
    <ModalFrame title={title} description={description} onClose={close}>
      {children}
    </ModalFrame>
  )
}
