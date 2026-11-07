'use client'

import { useEffect, useState } from 'react'
import { Link2, Share2 } from 'lucide-react'

// Partilhar: navigator.share no telemóvel (o WhatsApp é o canal principal) e «Copiar ligação» como alternativa.
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [canShare, setCanShare] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function') }, [])

  async function share() {
    try { await navigator.share({ title, url }) } catch { /* partilha cancelada */ }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Ligação copiada.')
    } catch {
      setMessage('Não foi possível copiar. Copia o endereço da barra do browser.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {canShare && <button type="button" onClick={share} className="btn btn-terciario"><Share2 size={17} aria-hidden="true" />Partilhar</button>}
      <button type="button" onClick={copy} className="btn btn-terciario"><Link2 size={17} aria-hidden="true" />Copiar ligação</button>
      <span role="status" aria-live="polite" className="text-[14px] text-texto-2">{message}</span>
    </div>
  )
}
