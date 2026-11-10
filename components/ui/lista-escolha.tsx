'use client'

import { useState } from 'react'
import { Check, Search } from 'lucide-react'

export type ItemEscolha = { id: string; label: string; detail?: string | null; soon?: boolean }

const simples = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Escolha por botões. Poucas opções: lista direta. Muitas (mais de `procuraDepois`): aparece a procura.
// Nada de seletores nativos: cada opção é um botão com estado (role="radio").
export function ListaEscolha({ itens, valor, onChange, rotulo, procuraDepois = 8, vazio = 'Nada para escolher.' }: { itens: ItemEscolha[]; valor: string | null; onChange: (id: string) => void; rotulo: string; procuraDepois?: number; vazio?: string }) {
  const [texto, setTexto] = useState('')
  const agulha = simples(texto.trim())
  const visiveis = itens.filter((item) => !agulha || simples(`${item.label} ${item.detail ?? ''}`).includes(agulha))

  if (itens.length === 0) return <p className="rounded-xl border border-dashed border-linha bg-white p-3 text-[13px] text-texto-2">{vazio}</p>
  return (
    <div className="grid gap-2">
      {itens.length > procuraDepois && (
        <div className="relative">
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-texto-2" />
          <input type="search" value={texto} onChange={(event) => setTexto(event.target.value)} placeholder="Procurar" aria-label={`Procurar: ${rotulo}`} className="h-11 w-full rounded-xl border border-linha bg-white pl-10 pr-3.5 text-sm outline-none transition-colors placeholder:text-texto-2 focus:border-marca focus:ring-2 focus:ring-marca/10" />
        </div>
      )}
      <div role="radiogroup" aria-label={rotulo} className={`flex flex-col gap-2 ${itens.length > procuraDepois ? 'max-h-[44dvh] overflow-y-auto pr-0.5' : ''}`}>
        {visiveis.map((item) => {
          const marcado = valor === item.id
          return (
            <button key={item.id} type="button" role="radio" aria-checked={marcado} onClick={() => onChange(item.id)} className={`flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border px-4 py-2 text-left transition ${marcado ? 'border-2 border-marca bg-marca-suave text-marca' : 'border-linha bg-white'}`}>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-5">{item.label}</span>
                {(item.detail || item.soon) && <span className="block truncate text-[12px] font-normal text-texto-2">{item.soon ? 'Em breve' : item.detail}</span>}
              </span>
              {marcado && <Check size={18} className="shrink-0" aria-hidden />}
            </button>
          )
        })}
        {visiveis.length === 0 && <p className="px-1 py-3 text-sm text-texto-2">Nada encontrado.</p>}
      </div>
    </div>
  )
}
