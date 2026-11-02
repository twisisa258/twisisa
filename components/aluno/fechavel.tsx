'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useFechado } from '@/components/aluno/use-fechado'

// Cartão que o aluno pode fechar; volta a aparecer ao fim de `days` dias.
export function Fechavel({ id, days = 14, label = 'Fechar', children }: { id: string; days?: number; label?: string; children: ReactNode }) {
  const { aberto, close } = useFechado(id, days)
  if (!aberto) return null
  return (
    <div className="relative">
      {children}
      <button type="button" onClick={close} aria-label={label} className="btn btn-icone absolute right-1 top-1 z-10 bg-white/80"><X size={18} aria-hidden /></button>
    </div>
  )
}
