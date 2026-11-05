'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { MiniModal } from '@/components/aluno/mini-modal'

// Como se ganham pontos: fica atrás do «i», em vez de texto fixo no fim da página.
export function RegrasRanking() {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} aria-label="Como funcionam os pontos" className="btn btn-icone shrink-0">
        <Info size={20} aria-hidden="true" />
      </button>
      <MiniModal open={aberto} onClose={() => setAberto(false)} title="Como funcionam os pontos">
        <ul className="space-y-2.5 text-[14px] leading-6 text-texto-2">
          <li>Ganhas pontos por cada questão que acertas no Simulador.</li>
          <li>Questões repetidas valem menos.</li>
          <li>A semana vai de segunda a domingo, hora de Maputo. «Geral» conta tudo.</li>
          <li>Só aparece o teu nome abreviado e o @nickname. Podes sair do ranking no perfil.</li>
        </ul>
        <button type="button" onClick={() => setAberto(false)} className="btn btn-secundario mt-5 w-full">Percebi</button>
      </MiniModal>
    </>
  )
}
