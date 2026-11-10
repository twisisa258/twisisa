'use client'

// [twisisa-ux] faixa discreta no topo do painel para instalar a app (não é janela).
// Android/Chrome: botão «Instalar» (usa o evento do navegador). iPhone/Safari: instruções curtas.
import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'
import { fechar, foiFechado } from '@/lib/dispensar'

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const ID = 'instalar-barra'

export function InstalarBarra() {
  const [modo, setModo] = useState<'android' | 'ios' | null>(null)
  const evento = useRef<EventoInstalar | null>(null)

  useEffect(() => {
    const instalada = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (instalada || foiFechado(ID)) return
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) setModo('ios')

    const onPrompt = (event: Event) => {
      event.preventDefault()
      evento.current = event as EventoInstalar
      setModo('android')
    }
    const onInstalada = () => {
      fechar(ID)
      setModo(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalada)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalada)
    }
  }, [])

  if (!modo) return null

  async function instalar() {
    const e = evento.current
    if (!e) return
    await e.prompt()
    const { outcome } = await e.userChoice
    evento.current = null
    if (outcome === 'accepted') fechar(ID)
    else fechar(ID, 30)
    setModo(null)
  }

  return (
    <div role="region" aria-label="Instalar a app" className="flex items-center gap-3 border-b border-linha bg-marca-suave px-4 py-2 text-[13px] leading-5 text-texto">
      <p className="min-w-0 flex-1">
        {modo === 'android'
          ? 'Instala a Twisisa no ecrã principal para abrir mais depressa.'
          : 'No iPhone: toca em Partilhar e depois em «Adicionar ao ecrã principal».'}
      </p>
      {modo === 'android' && (
        <button type="button" onClick={instalar} className="btn btn-primario px-3 py-2 text-[13px]">
          <Download size={15} aria-hidden="true" />
          Instalar
        </button>
      )}
      <button type="button" aria-label="Fechar aviso de instalação" onClick={() => { fechar(ID, 14); setModo(null) }} className="btn btn-icone size-9 min-h-9">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
