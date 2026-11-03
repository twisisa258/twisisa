'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Bookmark, Lightbulb, Sparkles } from 'lucide-react'
import { MiniModal } from '@/components/aluno/mini-modal'
import { fechar, foiFechado, reservarModalHoje } from '@/lib/dispensar'

const ID = 'novidade:kit-v2'

// Novidade que aparece uma só vez por aparelho. Para anunciar outra, muda o ID e o conteúdo.
export function NovidadeModal() {
  const [aberto, setAberto] = useState(false)
  useEffect(() => {
    // Espera um pouco: o modal de notificações (mais importante) tem prioridade e só um aparece por dia.
    const atraso = window.setTimeout(() => { if (!foiFechado(ID) && reservarModalHoje()) setAberto(true) }, 2500)
    return () => window.clearTimeout(atraso)
  }, [])
  const close = useCallback(() => { fechar(ID); setAberto(false) }, [])

  return (
    <MiniModal open={aberto} onClose={close} title="Novo nas questões: o Kit de ferramentas">
      <ul className="space-y-3">
        <li className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ajuda-suave text-ajuda"><Lightbulb size={17} aria-hidden /></span>
          <span className="text-[14px] leading-5"><strong className="font-semibold">Dicas sem spoiler.</strong> Pede uma pista e a resposta não é revelada.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-assistente-suave text-assistente"><Sparkles size={17} aria-hidden /></span>
          <span className="text-[14px] leading-5"><strong className="font-semibold">Questão parecida.</strong> A IA cria outra do mesmo tema para treinares.</span>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-aviso-suave text-aviso"><Bookmark size={17} aria-hidden /></span>
          <span className="text-[14px] leading-5"><strong className="font-semibold">Estudar depois.</strong> Guarda a questão e escolhe quando queres o lembrete.</span>
        </li>
      </ul>
      <div className="mt-5 flex gap-2">
        <Link href="/aluno/simulador" onClick={close} className="btn btn-primario flex-1">Experimentar</Link>
        <button type="button" onClick={close} className="btn btn-terciario">Agora não</button>
      </div>
    </MiniModal>
  )
}
