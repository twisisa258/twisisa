'use client'

import { useEffect, useState } from 'react'

const KEY = 'tw-tema'
type Modo = 'auto' | 'light' | 'dark'
const OPCOES: { valor: Modo; rotulo: string }[] = [
  { valor: 'auto', rotulo: 'Sistema' },
  { valor: 'light', rotulo: 'Claro' },
  { valor: 'dark', rotulo: 'Escuro' },
]

// Escolha do modo: Sistema (segue o telemóvel), Claro ou Escuro. Guardada neste aparelho, como o botão do cabeçalho.
export function ModoTema() {
  const [modo, setModo] = useState<Modo>('auto')

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(KEY)
      setModo(guardado === 'light' || guardado === 'dark' ? guardado : 'auto')
    } catch { /* sem armazenamento: fica em Sistema */ }
  }, [])

  function escolher(novo: Modo) {
    setModo(novo)
    const raiz = document.documentElement
    try {
      if (novo === 'auto') {
        delete raiz.dataset.theme
        window.localStorage.removeItem(KEY)
      } else {
        raiz.dataset.theme = novo
        window.localStorage.setItem(KEY, novo)
      }
    } catch { /* vale só nesta visita */ }
  }

  return (
    <div role="radiogroup" aria-label="Modo" className="df-seg">
      {OPCOES.map((opcao) => (
        <button key={opcao.valor} type="button" role="radio" aria-checked={modo === opcao.valor} onClick={() => escolher(opcao.valor)}>
          {opcao.rotulo}
        </button>
      ))}
    </div>
  )
}
