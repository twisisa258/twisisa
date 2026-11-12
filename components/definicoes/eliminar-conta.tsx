'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useFeedback } from '@/components/feedback-provider'
import { Spinner } from '@/components/ui/spinner'
import { FRASE_ELIMINAR, fraseConfere } from '@/lib/plano'
import { eliminarConta } from '@/app/aluno/definicoes/actions'

// Zona de perigo, separada do resto e fechada: tem de se abrir, ler o que se perde e escrever a frase certa.
// O botão só se ativa com a frase exata (e o servidor volta a conferir).
export function EliminarConta({ plus }: { plus: boolean }) {
  const feedback = useFeedback()
  const [frase, setFrase] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const pode = fraseConfere(frase) && !ocupado

  async function eliminar() {
    if (!pode) return
    setOcupado(true)
    try {
      const resultado = await eliminarConta(frase)
      if (!resultado.ok) {
        feedback.error(resultado.message, 'Não foi possível eliminar')
        setOcupado(false)
        return
      }
      await authClient.signOut().catch(() => undefined)
      window.location.assign('/')
    } catch {
      feedback.error('Sem ligação. Nada foi apagado. Tenta outra vez.', 'Não foi possível eliminar')
      setOcupado(false)
    }
  }

  return (
    <details className="df-perigo">
      <summary>Eliminar a minha conta</summary>
      <div className="df-perigo-corpo">
        <p>Isto apaga a tua conta e tudo o que é teu. <strong>Não dá para desfazer.</strong></p>
        <ul>
          <li>O teu progresso, os pontos e o lugar no ranking</li>
          <li>Os materiais guardados e as conversas com o Jonas</li>
          {plus && <li>O teu plano Plus e o selo</li>}
        </ul>
        <label htmlFor="df-frase">Para confirmar, escreve <strong>{FRASE_ELIMINAR}</strong></label>
        <input id="df-frase" value={frase} onChange={(event) => setFrase(event.target.value)} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder={FRASE_ELIMINAR} disabled={ocupado} />
        <button type="button" onClick={eliminar} disabled={!pode} aria-busy={ocupado} className="df-perigo-btn">
          {ocupado ? <><Spinner className="size-4" />A eliminar…</> : 'Eliminar a conta'}
        </button>
      </div>
    </details>
  )
}
