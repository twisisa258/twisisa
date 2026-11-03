'use client'

import { useState } from 'react'
import { ativarPush, desativarPush, suportaPush } from '@/lib/push-client'
import { setReminders } from '@/app/aluno/perfil/actions'

// Interruptor único dos lembretes (e-mail e notificações no telemóvel). Vem ligado por defeito; aqui desliga-se.
export function LembretesSwitch({ initialOn, publicKey }: { initialOn: boolean; publicKey: string }) {
  const [ligado, setLigado] = useState(initialOn)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  async function mudar() {
    if (ocupado) return
    const novo = !ligado
    setOcupado(true)
    setAviso(null)
    try {
      const res = await setReminders(novo)
      if (!res.ok) { setAviso(res.message); return }
      setLigado(novo)
      if (!novo) {
        await desativarPush()
      } else if (suportaPush() && publicKey.trim()) {
        const push = await ativarPush(publicKey.trim())
        if (!push.ok && push.motivo === 'bloqueado') setAviso('As notificações do navegador estão bloqueadas. Os lembretes seguem por e-mail.')
      }
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-texto">Lembretes de estudo</p>
          <p className="text-xs text-texto-2">Um aviso curto, no máximo um por dia. No e-mail e, se permitires, no telemóvel.</p>
        </div>
        <button type="button" role="switch" aria-checked={ligado} aria-label="Lembretes de estudo" disabled={ocupado} onClick={mudar} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${ligado ? 'bg-marca' : 'bg-[#cfd6cb]'}`}>
          <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] ${ligado ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {aviso && <p role="status" className="text-xs text-aviso-texto">{aviso}</p>}
    </div>
  )
}
