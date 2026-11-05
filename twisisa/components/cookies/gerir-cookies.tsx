'use client'

import { Cookie } from 'lucide-react'
import { EVENTO_ABRIR_COOKIES } from '@/lib/cookies-consent'

// Volta a abrir o cartão de cookies, para o aluno mudar de ideias quando quiser.
export function GerirCookies({ className = 'btn btn-secundario' }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_COOKIES))} className={className}>
      <Cookie size={16} aria-hidden="true" />
      Gerir cookies
    </button>
  )
}
