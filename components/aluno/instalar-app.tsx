'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Plus, Share } from 'lucide-react'
import { MiniModal } from '@/components/aluno/mini-modal'
import { fechar, foiFechado, reservarModalHoje } from '@/lib/dispensar'

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const ID = 'instalar-app'

// Modal próprio para instalar a app. Nunca duas janelas no mesmo dia (ver reservarModalHoje).
export function InstalarApp() {
  const [modo, setModo] = useState<'android' | 'ios' | null>(null)
  const [aberto, setAberto] = useState(false)
  const evento = useRef<EventoInstalar | null>(null)

  const tentar = useCallback((m: 'android' | 'ios') => {
    if (foiFechado(ID) || !reservarModalHoje()) return
    setModo(m)
    setAberto(true)
  }, [])

  useEffect(() => {
    const instalada = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (instalada) return
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
    let atraso: number | undefined
    if (ios) atraso = window.setTimeout(() => tentar('ios'), 2000)

    const onPrompt = (event: Event) => {
      event.preventDefault()
      evento.current = event as EventoInstalar
      atraso = window.setTimeout(() => tentar('android'), 2000)
    }
    const onInstalada = () => { fechar(ID); setAberto(false) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalada)
    return () => {
      window.clearTimeout(atraso)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalada)
    }
  }, [tentar])

  const fecharModal = useCallback(() => { fechar(ID, 14); setAberto(false) }, [])

  async function instalar() {
    const e = evento.current
    if (!e) return fecharModal()
    await e.prompt()
    const { outcome } = await e.userChoice
    evento.current = null
    if (outcome === 'accepted') fechar(ID)
    else fechar(ID, 30)
    setAberto(false)
  }

  if (!modo) return null
  return (
    <MiniModal open={aberto} onClose={fecharModal} title="Instala a Twisisa no telemóvel">
      {modo === 'android' ? (
        <>
          <p className="text-[14px] leading-5 text-texto-2">Abre mais depressa, a partir do ecrã principal, e recebe os lembretes de estudo.</p>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={instalar} className="btn btn-primario flex-1"><Download size={17} aria-hidden />Instalar</button>
            <button type="button" onClick={fecharModal} className="btn btn-terciario">Agora não</button>
          </div>
        </>
      ) : (
        <>
          <ol className="space-y-3 text-[14px] leading-5">
            <li className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ajuda-suave text-ajuda"><Share size={17} aria-hidden /></span>Toca em <strong className="font-semibold">Partilhar</strong>, na barra do Safari.</li>
            <li className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-marca-suave text-marca"><Plus size={17} aria-hidden /></span>Escolhe <strong className="font-semibold">Adicionar ao ecrã principal</strong>.</li>
          </ol>
          <p className="mt-3 text-[13px] text-texto-2">Depois abre a Twisisa pelo ícone. É assim que as notificações funcionam no iPhone.</p>
          <button type="button" onClick={fecharModal} className="btn btn-secundario mt-5 w-full">Percebi</button>
        </>
      )}
    </MiniModal>
  )
}
