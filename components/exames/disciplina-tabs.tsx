'use client'

import { useCallback, useEffect, useState } from 'react'

export type DisciplinaTab = { id: string; label: string; count: number; panel: React.ReactNode }

// Separadores com números (Exames · Temas · Cursos). Todos os painéis vêm no HTML do servidor (o Google lê tudo); só um fica visível.
// O endereço #temas ou #cursos abre o separador certo.
export function DisciplinaTabs({ tabs, label }: { tabs: DisciplinaTab[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')

  const fromHash = useCallback(() => {
    const id = window.location.hash.replace('#', '')
    if (tabs.some((tab) => tab.id === id)) setActive(id)
  }, [tabs])

  useEffect(() => {
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [fromHash])

  function choose(id: string) {
    setActive(id)
    try { window.history.replaceState(null, '', `#${id}`) } catch { /* sem histórico: o separador muda na mesma */ }
  }

  function onKey(event: React.KeyboardEvent, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
    choose(next.id)
    document.getElementById(`ex2-tab-${next.id}`)?.focus()
  }

  if (tabs.length === 0) return null
  return (
    <>
      {tabs.length > 1 && (
        <div className="ex2-tabs">
          <div className="ex2-tl" role="tablist" aria-label={label} style={{ '--n': tabs.length } as React.CSSProperties}>
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                id={`ex2-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active === tab.id}
                aria-controls={`ex2-panel-${tab.id}`}
                tabIndex={active === tab.id ? 0 : -1}
                onClick={() => choose(tab.id)}
                onKeyDown={(event) => onKey(event, index)}
              >
                <b>{tab.count}</b><span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {tabs.map((tab) => (
        <section key={tab.id} id={`ex2-panel-${tab.id}`} role={tabs.length > 1 ? 'tabpanel' : undefined} aria-labelledby={tabs.length > 1 ? `ex2-tab-${tab.id}` : undefined} className="ex2-panel" hidden={tabs.length > 1 && active !== tab.id}>
          {tab.panel}
        </section>
      ))}
    </>
  )
}
