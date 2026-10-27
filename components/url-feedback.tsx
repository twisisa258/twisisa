'use client'

import { useEffect } from 'react'
import { useFeedback } from '@/components/feedback-provider'

const MESSAGES: Record<string, { title: string; message: string }> = {
  documento: { title: 'Documento indisponível', message: 'Não foi possível obter o documento. Tenta outra vez mais tarde.' },
  'nao-encontrado': { title: 'Documento indisponível', message: 'Este material já não está disponível.' },
  servidor: { title: 'Documento indisponível', message: 'Não foi possível consultar o material. Tenta outra vez.' },
  sessao: { title: 'Sessão expirada', message: 'Inicia sessão para aceder ao material.' },
}

// Mostra no modal o erro que o servidor devolveu em ?erro= (ex.: ao abrir um link de documento) e limpa o endereço.
export function UrlFeedback() {
  const feedback = useFeedback()

  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('erro')
    if (!code) return
    const detail = url.searchParams.get('d') ?? ''
    const known = MESSAGES[code]
    if (known) {
      const safeDetail = /^[\w .:;\-]{1,400}$/.test(detail) ? ` (${detail})` : ''
      feedback.error(known.message + safeDetail, known.title)
    }
    url.searchParams.delete('erro')
    url.searchParams.delete('d')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }, [feedback])

  return null
}
