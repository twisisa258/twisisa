'use client'

import { useState } from 'react'

// Escolha por botões dentro de formulários: guarda o valor num campo escondido (name). Para poucas opções.
export function EscolhaBotoes({ name, options, defaultValue, rotulo, vazioPermitido = false }: { name: string; options: { value: string; label: string }[]; defaultValue: string | null; rotulo: string; vazioPermitido?: boolean }) {
  const [valor, setValor] = useState(defaultValue ?? '')
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={valor} />
      {options.map((option) => {
        const marcado = valor === option.value
        return (
          <button key={option.value} type="button" role="radio" aria-checked={marcado} onClick={() => setValor(marcado && vazioPermitido ? '' : option.value)} className={`min-h-10 rounded-xl border px-3.5 text-sm font-medium transition ${marcado ? 'border-2 border-marca bg-marca-suave text-marca' : 'border-linha bg-white text-texto'}`}>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
