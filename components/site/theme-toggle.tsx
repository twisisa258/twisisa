'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const KEY = 'tw-tema'

// Modo claro / escuro de toda a plataforma. Segue o sistema até a pessoa escolher; a escolha fica guardada neste aparelho.
export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    setDark(root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  function toggle() {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setDark(!dark)
    try { window.localStorage.setItem(KEY, next) } catch { /* sem armazenamento: vale só nesta visita */ }
  }

  return (
    <button type="button" className="sh-ic" onClick={toggle} aria-label={dark ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}>
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
