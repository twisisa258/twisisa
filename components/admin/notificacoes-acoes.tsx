'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck } from 'lucide-react'
import { marcarLida, marcarTodasLidas } from '@/app/admin/notificacoes/actions'

const botao = 'inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold disabled:opacity-40'

export function MarcarTodasLidas({ desativado }: { desativado: boolean }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  return (
    <button
      type="button"
      disabled={desativado || pendente}
      onClick={() => iniciar(async () => { await marcarTodasLidas(); router.refresh() })}
      className={`${botao} border border-[#c9d7cd] bg-white text-marca hover:bg-[#f1f4ef]`}
    >
      <CheckCheck size={14} aria-hidden="true" /> Marcar tudo como lido
    </button>
  )
}

export function MarcarLida({ id }: { id: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  return (
    <button type="button" disabled={pendente} onClick={() => iniciar(async () => { await marcarLida(id); router.refresh() })} className={`${botao} text-[#526057] hover:bg-[#eef0ea]`}>
      Marcar lida
    </button>
  )
}
