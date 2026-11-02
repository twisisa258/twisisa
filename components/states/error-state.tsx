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
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#fbeeee] text-erro-texto">
        <CircleAlert size={24} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-[#202923]">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-texto-2">{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-marca px-5 text-sm font-semibold text-white hover:bg-marca-escura">
          Tentar de novo
        </button>
      )}
    </div>
  )
}
