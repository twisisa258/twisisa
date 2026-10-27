'use client'

import { CircleAlert } from 'lucide-react'

/**
 * Estado de erro dentro de um ecrã: mensagem + "Tentar de novo".
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
  return (
    <div role="alert" className="rounded-3xl border border-[#f0d6d6] bg-white px-5 py-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fbeeee] text-[#9a3030]">
        <CircleAlert size={24} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-[#202923]">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-[#68736a]">{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#1d4d41] px-5 text-sm font-semibold text-white hover:bg-[#163e34]">
          Tentar de novo
        </button>
      )}
    </div>
  )
}
