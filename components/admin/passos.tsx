'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'

export type Passo = {
  id: string
  titulo: string
  ajuda?: string
  /** O «Seguinte» só se abre quando este passo tem a escolha feita. */
  pronto: boolean
  conteudo: React.ReactNode
}

const botao = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40'

// Formulário em passos simples: um passo por ecrã, uma pergunta de cada vez. Quem usa decide o passo atual (`indice`).
export function Passos({
  passos,
  indice,
  onIndice,
  onConcluir,
  rotuloFinal = 'Concluir',
  ocupado = false,
  final,
}: {
  passos: Passo[]
  indice: number
  onIndice: (indice: number) => void
  onConcluir?: () => void
  rotuloFinal?: string
  ocupado?: boolean
  /** No último passo, no lugar do botão final (ex.: «Guardar rascunho» e «Publicar»). */
  final?: React.ReactNode
}) {
  const total = passos.length
  const atual = Math.min(Math.max(indice, 0), total - 1)
  const passo = passos[atual]
  const ultimo = atual === total - 1

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <ol aria-label="Progresso" className="flex gap-1.5">
          {passos.map((item, i) => (
            <li key={item.id} className={`h-1.5 flex-1 rounded-full ${i <= atual ? 'bg-marca' : 'bg-linha'}`} />
          ))}
        </ol>
        <p className="text-xs font-semibold text-texto-2">Passo {atual + 1} de {total}</p>
      </div>

      <div className="grid gap-1">
        <h2 className="text-xl font-semibold leading-7 tracking-tight">{passo.titulo}</h2>
        {passo.ajuda && <p className="text-sm leading-6 text-texto-2">{passo.ajuda}</p>}
      </div>

      <div>{passo.conteudo}</div>

      <div className="flex flex-wrap gap-2 pt-1">
        {atual > 0 && (
          <button type="button" onClick={() => onIndice(atual - 1)} className={`${botao} border border-[#dfe3d9] bg-white text-marca hover:bg-[#f1f4ef]`}>
            <ArrowLeft size={16} aria-hidden="true" /> Anterior
          </button>
        )}
        {!ultimo && (
          <button type="button" disabled={!passo.pronto} onClick={() => onIndice(atual + 1)} className={`${botao} bg-marca text-white hover:bg-marca-escura`}>
            Seguinte <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
        {ultimo && final}
        {ultimo && !final && onConcluir && (
          <button type="button" disabled={!passo.pronto || ocupado} onClick={onConcluir} className={`${botao} bg-marca text-white hover:bg-marca-escura`}>
            {ocupado ? 'A processar…' : rotuloFinal}
          </button>
        )}
      </div>
    </div>
  )
}
