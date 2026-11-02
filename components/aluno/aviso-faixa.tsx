'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import type { Aviso } from '@/lib/avisos'
import { ICONS, TONES } from '@/components/aluno/avisos'
import { MiniModal } from '@/components/aluno/mini-modal'
import { fechar, foiFechado, hoje } from '@/lib/dispensar'

const chave = (aviso: Aviso) => `aviso:${aviso.id}:${hoje()}`

// Um só aviso de cada vez, numa faixa fina que se fecha. Se houver mais, «+N» abre uma janela pequena com a lista.
export function AvisoFaixa({ items }: { items: Aviso[] }) {
  const [fechados, setFechados] = useState<string[] | null>(null)
  const [lista, setLista] = useState(false)
  const fecharLista = useCallback(() => setLista(false), [])

  useEffect(() => {
    setFechados(items.filter((aviso) => foiFechado(chave(aviso))).map((aviso) => aviso.id))
  }, [items])

  if (fechados === null) return null
  const visiveis = items.filter((aviso) => !fechados.includes(aviso.id))
  if (visiveis.length === 0) return null
  const [primeiro, ...resto] = visiveis
  const tom = TONES[primeiro.tone]
  const Icon = ICONS[primeiro.icon]

  return (
    <>
      <section aria-label="Aviso" role={primeiro.tone === 'urgent' ? 'alert' : undefined} className="flex items-center gap-1 rounded-2xl border border-linha bg-white py-1 pl-3 pr-1">
        <Link href={primeiro.href} className="flex min-w-0 flex-1 items-center gap-3 py-1.5 text-texto no-underline">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tom.icon}`}><Icon size={17} aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold leading-5">{primeiro.title}</span>
            <span className="block truncate text-[12px] leading-4 text-texto-2">{primeiro.text}</span>
          </span>
        </Link>
        {resto.length > 0 && <button type="button" onClick={() => setLista(true)} className="btn btn-terciario shrink-0 px-2 text-[13px]" aria-label={`Ver mais ${resto.length} avisos`}>+{resto.length}</button>}
        <button type="button" onClick={() => { fechar(chave(primeiro), 1); setFechados((atual) => [...(atual ?? []), primeiro.id]) }} aria-label="Fechar aviso" className="btn btn-icone shrink-0"><X size={18} aria-hidden /></button>
      </section>
      <MiniModal open={lista} onClose={fecharLista} title="Avisos de hoje">
        <ul className="divide-y divide-linha">
          {visiveis.map((aviso) => (
            <li key={aviso.id}>
              <Link href={aviso.href} onClick={fecharLista} className="flex items-center gap-3 py-3 text-texto no-underline">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold leading-5">{aviso.title}</span>
                  <span className="block text-[12px] leading-4 text-texto-2">{aviso.text}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-marca" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </MiniModal>
    </>
  )
}
