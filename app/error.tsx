'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { CircleAlert } from 'lucide-react'

// Último recurso: erro inesperado ao desenhar uma página. As acções e pedidos tratam os seus erros no modal de feedback.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[PÁGINA]', error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-fundo px-5 text-texto">
      <div className="w-full max-w-sm rounded-3xl border border-linha bg-white p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-erro-suave text-erro-texto"><CircleAlert size={26} /></span>
        <h1 className="mt-4 text-lg font-semibold">Não foi possível abrir esta página</h1>
        <p className="mt-1.5 text-sm leading-6 text-texto-2">Tenta outra vez. Se continuar, volta ao início e tenta mais tarde.</p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={reset} className="inline-flex h-11 items-center justify-center rounded-full bg-marca px-5 text-sm font-semibold text-white hover:bg-marca-escura">Tentar outra vez</button>
          <Link href="/" className="inline-flex h-11 items-center justify-center rounded-full border border-linha px-5 text-sm font-semibold text-marca hover:bg-superficie-2">Voltar ao início</Link>
        </div>
      </div>
    </main>
  )
}
