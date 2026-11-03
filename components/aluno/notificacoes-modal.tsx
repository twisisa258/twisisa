'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { MiniModal } from '@/components/aluno/mini-modal'
import { ativarPush, suportaPush } from '@/lib/push-client'
import { fechar, foiFechado, reservarModalHoje } from '@/lib/dispensar'

const ID = 'notificacoes'

// Modal simples: um botão para permitir. Só aparece se o navegador ainda não decidiu (nem permitiu nem bloqueou).
export function NotificacoesModal({ publicKey }: { publicKey: string }) {
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!publicKey.trim() || !suportaPush() || Notification.permission !== 'default' || foiFechado(ID)) return
    if (reservarModalHoje()) setAberto(true)
  }, [publicKey])

  const agoraNao = useCallback(() => { fechar(ID, 7); setAberto(false) }, [])

  async function permitir() {
    setOcupado(true)
    setAviso(null)
    const resultado = await ativarPush(publicKey.trim())
    setOcupado(false)
    if (resultado.ok) { fechar(ID); setAberto(false); return }
    if (resultado.motivo === 'bloqueado' || resultado.motivo === 'negado') { fechar(ID, 30); setAberto(false); return }
    setAviso(resultado.mensagem)
  }

  return (
    <MiniModal open={aberto} onClose={agoraNao} title="Receber lembretes de estudo?">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-marca-suave text-marca"><Bell size={19} aria-hidden /></span>
        <p className="text-[14px] leading-5 text-texto-2">Um aviso curto no ecrã quando fizer falta praticar, no máximo um por dia. Podes desligar quando quiseres, no perfil.</p>
      </div>
      {aviso && <p role="status" className="mt-3 text-[13px] text-aviso-texto">{aviso}</p>}
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={permitir} disabled={ocupado} aria-busy={ocupado} className="btn btn-primario flex-1">{ocupado ? 'A ligar…' : 'Permitir notificações'}</button>
        <button type="button" onClick={agoraNao} disabled={ocupado} className="btn btn-terciario">Agora não</button>
      </div>
    </MiniModal>
  )
}
