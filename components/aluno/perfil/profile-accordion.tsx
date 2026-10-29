'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export type AccordionItem = {
  id: string
  icon: React.ReactNode
  title: string
  summary: string
  /** true: completo (visto verde); false: por completar; sem valor: sem estado (ex.: segurança). */
  done?: boolean
  content: React.ReactNode
}

type AccordionApi = { saved: (id: string) => void }
const AccordionContext = createContext<AccordionApi | null>(null)

// Chamado pelos formulários das secções: fecha a secção e mostra «Guardado» na linha.
export function useAccordion() {
  return useContext(AccordionContext)
}

const FLASH_MS = 2500

// Lista de secções recolhíveis (uma aberta de cada vez). O conteúdo fica montado para não perder o que se escreveu.
export function ProfileAccordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const saved = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : current))
    setSavedId(id)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSavedId(null), FLASH_MS)
  }, [])

  return (
    <AccordionContext.Provider value={{ saved }}>
      <div className="divide-y divide-[#eceee7] overflow-hidden rounded-2xl border border-[#e3e6dc] bg-white">
        {items.map((item) => {
          const open = openId === item.id
          const flash = savedId === item.id
          return (
            <section key={item.id}>
              <h2>
                <button
                  type="button"
                  id={`perfil-${item.id}-botao`}
                  aria-expanded={open}
                  aria-controls={`perfil-${item.id}-painel`}
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f8f8f5] focus-visible:bg-[#f8f8f5] focus-visible:outline-none sm:px-5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3ee] text-[#1d4d41] [&>svg]:size-[18px]">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#202321]">{item.title}</span>
                    <span className={`block truncate text-xs ${flash ? 'font-semibold text-[#1d4d41]' : 'text-[#68716a]'}`}>{flash ? 'Guardado' : item.summary}</span>
                  </span>
                  {item.done === true && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1d4d41] text-white" role="img" aria-label="Completo"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                  )}
                  {item.done === false && <span className="size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-[#b9c0b4]" role="img" aria-label="Por completar" />}
                  <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-[#9aa29c] transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
                </button>
              </h2>
              <div
                id={`perfil-${item.id}-painel`}
                role="region"
                aria-labelledby={`perfil-${item.id}-botao`}
                inert={!open}
                className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-5 pt-1 sm:px-5">{item.content}</div>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </AccordionContext.Provider>
  )
}
