'use client'

// [twisisa-ux] cartão na página para quem ainda não ativou as notificações. Some quando este aparelho já está registado.
// O popup (NotificacoesModal) continua a aparecer como antes; este cartão é o lembrete permanente.
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { ativarPush, pushLigado, suportaPush } from '@/lib/push-client'

export function PushCard({ publicKey }: { publicKey: string }) {
  const chave = publicKey.trim()
  const [estado, setEstado] = useState<'a-ver' | 'mostrar' | 'ligado'>('a-ver')
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!chave || !suportaPush()) {
      setEstado('ligado')
      return
    }
    let vivo = true
    pushLigado(chave)
      .then((ligado) => { if (vivo) setEstado(ligado ? 'ligado' : 'mostrar') })
      .catch(() => { if (vivo) setEstado('mostrar') })
    return () => { vivo = false }
  }, [chave])

  if (estado !== 'mostrar') return null

  async function ativar() {
    setOcupado(true)
    setAviso(null)
    const resultado = await ativarPush(chave)
    setOcupado(false)
    if (resultado.ok) setEstado('ligado')
    else setAviso(resultado.mensagem)
  }

  return (
    <section aria-label="Notificações" className="flex items-center gap-3 rounded-2xl border border-linha bg-white p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-marca-suave text-marca">
        <Bell size={19} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold text-texto">Ativa os lembretes de estudo</h2>
        <p className="mt-0.5 text-[13px] leading-5 text-texto-2">Recebe um aviso no telemóvel quando fizer falta praticar.</p>
        {aviso && <p role="status" className="mt-1.5 text-[12px] text-aviso-texto">{aviso}</p>}
      </div>
      <button type="button" onClick={ativar} disabled={ocupado} aria-busy={ocupado} className="btn btn-primario shrink-0 px-3 py-2 text-[13px]">
        {ocupado ? 'A ligar…' : 'Ativar'}
      </button>
    </section>
  )
}
