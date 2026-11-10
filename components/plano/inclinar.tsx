'use client'

import { useRef } from 'react'

// Inclinação suave do cartão Plus a seguir o dedo ou o rato, com um brilho. Só mexe em variáveis CSS (sem re-desenhar o React).
// Quem prefere menos movimento não vê nada (o CSS também desliga a transição).
export function Inclinar({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  function mover(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const caixa = el.getBoundingClientRect()
    const x = (event.clientX - caixa.left) / caixa.width
    const y = (event.clientY - caixa.top) / caixa.height
    el.style.setProperty('--ry', `${((x - 0.5) * 10).toFixed(1)}deg`)
    el.style.setProperty('--rx', `${((0.5 - y) * 8).toFixed(1)}deg`)
    el.style.setProperty('--mx', `${(x * 100).toFixed(0)}%`)
    el.style.setProperty('--my', `${(y * 100).toFixed(0)}%`)
  }

  function largar() {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--rx', '0deg')
  }

  return (
    <div ref={ref} className="pc-pal" onPointerMove={mover} onPointerLeave={largar} onPointerCancel={largar}>
      {children}
    </div>
  )
}
