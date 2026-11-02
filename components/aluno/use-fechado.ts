'use client'

import { useCallback, useEffect, useState } from 'react'
import { fechar, foiFechado } from '@/lib/dispensar'

/** Estado de um cartão que o aluno pode fechar. Só decide depois de ler o aparelho (evita piscar). */
export function useFechado(id: string, days?: number) {
  const [estado, setEstado] = useState<'pendente' | 'aberto' | 'fechado'>('pendente')
  useEffect(() => {
    setEstado(foiFechado(id) ? 'fechado' : 'aberto')
  }, [id])
  const close = useCallback(() => {
    fechar(id, days)
    setEstado('fechado')
  }, [id, days])
  return { aberto: estado === 'aberto', close }
}
