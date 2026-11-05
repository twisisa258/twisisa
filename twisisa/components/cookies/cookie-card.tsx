'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Cookie } from 'lucide-react'
import { EVENTO_ABRIR_COOKIES, guardarEscolhaCookies, lerEscolhaCookies, type EscolhaCookies } from '@/lib/cookies-consent'

// Zonas onde o cartão nunca aparece: equipa interna e a sessão de questões (o aluno está concentrado).
const SEM_CARTAO = ['/admin', '/aluno/simulador/sessao']

// Cartão de cookies: pergunta uma vez, com «Recusar» e «Aceitar» do mesmo tamanho. Não bloqueia a página.
export function CookieCard() {
  const pathname = usePathname()
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const atraso = lerEscolhaCookies() === null ? window.setTimeout(() => setVisivel(true), 1400) : undefined
    const abrir = () => setVisivel(true)
    window.addEventListener(EVENTO_ABRIR_COOKIES, abrir)
    return () => {
      if (atraso) window.clearTimeout(atraso)
      window.removeEventListener(EVENTO_ABRIR_COOKIES, abrir)
    }
  }, [])

  const escolher = useCallback((escolha: EscolhaCookies) => {
    guardarEscolhaCookies(escolha)
    setVisivel(false)
  }, [])

  if (!visivel || SEM_CARTAO.some((prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`))) return null

  return (
    <div role="dialog" aria-label="Cookies" aria-describedby="cookies-texto" className="cartao-entra tom-marca fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 mx-auto max-w-[440px] sm:inset-x-auto sm:left-4 sm:mx-0">
      <div className="sf sf-flutua p-4">
        <div className="flex items-start gap-3">
          <span className="ic-tom"><Cookie size={20} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold leading-5 text-texto">Cookies de estatísticas</h2>
            <p id="cookies-texto" className="mt-1 text-[13px] leading-5 text-texto-2">
              Medimos, de forma agregada, como o Twisisa é usado para o melhorar. Não servem para publicidade e o site funciona igual se recusares.{' '}
              <Link href="/privacidade" className="font-medium text-marca underline underline-offset-2">Saber mais</Link>
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => escolher('recusado')} className="btn btn-secundario">Recusar</button>
          <button type="button" onClick={() => escolher('aceite')} className="btn btn-primario">Aceitar</button>
        </div>
      </div>
    </div>
  )
}
