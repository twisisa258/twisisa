'use client'

import { ChevronDown, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ListaEscolha } from '@/components/ui/lista-escolha'

const VAZIO = '__vazio'

// Seletor personalizado e controlado (sem o menu nativo do sistema): um botão que mostra o valor e abre uma folha com a lista,
// com procura quando há muitas opções. A primeira linha («Não definir») limpa o valor. Para formulários com `name` usa-se o SelectField.
export function Seletor({
  rotulo,
  valor,
  onChange,
  opcoes,
  vazio = 'Não definir',
  desativado = false,
}: {
  rotulo: string
  valor: string
  onChange: (valor: string) => void
  opcoes: { value: string; label: string }[]
  vazio?: string
  desativado?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const atual = opcoes.find((opcao) => opcao.value === valor)

  useEffect(() => {
    if (!aberto) return
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', fechar)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', fechar)
      document.body.style.overflow = antes
    }
  }, [aberto])

  return (
    <div className="grid gap-1 text-xs font-semibold text-[#526057]">
      <span>{rotulo}</span>
      <button
        type="button"
        disabled={desativado}
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        aria-label={`${rotulo}: ${atual?.label ?? vazio}`}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#dfe3d9] bg-white px-3 text-left text-sm font-normal outline-none transition-colors focus-visible:border-marca focus-visible:ring-2 focus-visible:ring-marca/10 disabled:opacity-60"
      >
        <span className={`truncate ${atual ? 'text-texto' : 'text-texto-2'}`}>{atual?.label ?? vazio}</span>
        <ChevronDown size={16} aria-hidden className="shrink-0 text-texto-2" />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={rotulo}>
          <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} />
          <div className="relative z-10 flex max-h-[85dvh] w-full max-w-md flex-col gap-3 rounded-t-3xl bg-white p-4 text-texto sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{rotulo}</h2>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="grid size-10 place-items-center rounded-full text-texto-2 hover:bg-[#f1f4ef]"><X size={18} aria-hidden /></button>
            </div>
            <div className="min-h-0 overflow-y-auto">
              <ListaEscolha
                rotulo={rotulo}
                itens={[{ id: VAZIO, label: vazio }, ...opcoes.map((opcao) => ({ id: opcao.value, label: opcao.label }))]}
                valor={valor || VAZIO}
                onChange={(id) => { onChange(id === VAZIO ? '' : id); setAberto(false) }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
