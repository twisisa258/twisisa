'use client'

import { useState } from 'react'
import { OperadoraLogo } from '@/components/plano/operadoras'
import { OPERADORAS, PLANO, formatarNumero, operadoraDoNumero, operadoraPorId, soDigitos, type OperadoraId } from '@/lib/plano'

// Escolha do meio de pagamento e do número. O operador é reconhecido pelo prefixo e escolhe-se sozinho.
// O botão fica desativado até existir o serviço que faz o pedido no telemóvel (ver State.md): nada finge cobrar.
export function PagarForm({ titulo = 'Pagar com' }: { titulo?: string }) {
  const [operadora, setOperadora] = useState<OperadoraId>('mpesa')
  const [digitos, setDigitos] = useState('')
  const detetada = operadoraDoNumero(digitos)

  function escrever(texto: string) {
    const novos = soDigitos(texto)
    setDigitos(novos)
    const nova = operadoraDoNumero(novos)
    if (nova) setOperadora(nova)
  }

  const aviso =
    digitos.length >= 2 && !detetada
      ? 'Este número não é M-Pesa, e-Mola nem mKesh.'
      : detetada && detetada !== operadora
        ? `Este número é ${operadoraPorId(detetada)?.nome}.`
        : detetada
          ? `Número ${operadoraPorId(detetada)?.nome}.`
          : ''

  return (
    <div className="pl-caixa">
      <fieldset className="pl-campo">
        <legend>{titulo}</legend>
        <div className="pl-meios">
          {OPERADORAS.map((item) => (
            <label key={item.id} className="pl-meio">
              <input type="radio" name="meio" value={item.id} checked={operadora === item.id} onChange={() => setOperadora(item.id)} />
              <OperadoraLogo id={item.id} tamanho="g" />
              <small>{item.prefixos.join(' · ')}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="pl-campo">
        <label htmlFor="pl-numero">Número</label>
        <div className="pl-tel">
          <span aria-hidden="true">+258</span>
          <input id="pl-numero" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={11} placeholder="84 000 0000" value={formatarNumero(digitos)} onChange={(event) => escrever(event.target.value)} aria-describedby="pl-aviso" />
        </div>
        <p id="pl-aviso" className="pl-aviso" aria-live="polite">{aviso}</p>
      </div>

      <button type="button" className="btn btn-primario w-full" disabled>Pagar {PLANO.precoMt} MT</button>
      <p className="pl-nota">Pagamento por meios locais disponível em breve.</p>
    </div>
  )
}
