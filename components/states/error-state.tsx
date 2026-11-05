'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, RotateCw } from 'lucide-react'

/**
 * Estado de erro dentro de um ecrã: o que falhou + «Tentar de novo».
 * Sem `onRetry`, volta a pedir a página ao servidor (router.refresh): assim nenhuma página de servidor fica sem saída.
 * Para erros de ações (guardar, enviar) usa-se o modal useFeedback().error; este bloco é para falhas de carregamento.
 */
export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Verifica a ligação e tenta de novo.',
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()
  const tentar = onRetry ?? (() => startTransition(() => router.refresh()))
  return (
    <div role="alert" className="sf px-5 py-10 text-center" style={{ borderColor: '#f0d6d6' }}>
      <span aria-hidden="true" className="relative mx-auto flex size-[88px] items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-[#f0d6d6] opacity-50" />
        <span className="absolute inset-[10px] rounded-full border border-[#f0d6d6]" />
        <span className="flex size-[52px] items-center justify-center rounded-full bg-erro-suave text-erro-texto" style={{ boxShadow: 'inset 0 0 0 1px #f0d6d6' }}><CircleAlert size={24} /></span>
      </span>
      <h2 className="mt-5 text-[17px] font-semibold leading-6 tracking-[-0.01em] text-texto">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-[32ch] text-[14px] leading-6 text-texto-2">{description}</p>
      <button type="button" onClick={tentar} disabled={pendente} className="btn btn-secundario btn-grande mt-6 px-6">
        <RotateCw size={16} aria-hidden="true" className={pendente ? 'animate-spin' : undefined} />
        {pendente ? 'A tentar…' : 'Tentar de novo'}
      </button>
    </div>
  )
}
