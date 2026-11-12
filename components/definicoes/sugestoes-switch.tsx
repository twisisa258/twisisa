'use client'

import { useState } from 'react'
import { useFeedback } from '@/components/feedback-provider'
import { setSugestoesPlus } from '@/app/aluno/definicoes/actions'

// Interruptor «Mostrar sugestões do Plus». Desligado: o cartão e a faixa deixam de aparecer no painel.
export function SugestoesSwitch({ initialOn }: { initialOn: boolean }) {
  const feedback = useFeedback()
  const [ligado, setLigado] = useState(initialOn)
  const [ocupado, setOcupado] = useState(false)

  async function mudar() {
    if (ocupado) return
    const novo = !ligado
    setOcupado(true)
    try {
      const resultado = await setSugestoesPlus(novo)
      if (resultado.ok) setLigado(novo)
      else feedback.error(resultado.message)
    } catch {
      feedback.error('Não foi possível guardar. Tenta outra vez.')
    } finally {
      setOcupado(false)
    }
  }

  return <button type="button" role="switch" aria-checked={ligado} aria-label="Mostrar sugestões do Plus" disabled={ocupado} onClick={mudar} className="df-tg" />
}
