'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { useFechado } from '@/components/aluno/use-fechado'
import { SeloPlus } from '@/components/plano/selo-plus'
import { DESCONTO_PROMO_PCT, PLANO, POUPA_PROMO_MT, PRECO_PROMO_MT } from '@/lib/plano'

// A sugestão do Plus no painel. Ao entrar, antes de qualquer atividade do dia: o cartão (se o fechar, volta amanhã).
// Depois (ou se já houve atividade): só a faixa fina (se a fechar, volta em 3 dias). Fechar nunca bloqueia nada.
// Só é desenhada quando o servidor decide que há oferta (PAGAMENTO_ATIVO, sem Plus e com as sugestões ligadas em Definições).
export function SugestaoPlus({ comCartao }: { comCartao: boolean }) {
  const cartao = useFechado('plus:cartao', 1)
  const faixa = useFechado('plus:faixa', 3)

  if (comCartao && cartao.aberto) {
    return (
      <article className="of" aria-label={`Oferta ${PLANO.nome}`}>
        <SeloPlus decorativo className="of-agua" />
        <button type="button" onClick={cartao.close} aria-label="Fechar sugestão" className="of-x"><X size={18} aria-hidden /></button>
        <p className="of-t"><SeloPlus decorativo className="of-sel" />{PLANO.nome}</p>
        <p className="of-h">1.º mês por {PRECO_PROMO_MT} MT</p>
        <p className="of-p"><s>{PLANO.precoMt} MT</s> · poupas {POUPA_PROMO_MT} MT</p>
        <Link href="/aluno/plano" className="of-ir">Subscrever Plus</Link>
      </article>
    )
  }

  if (faixa.aberto) {
    return (
      <div className="of-faixa" role="region" aria-label={`Oferta ${PLANO.nome}`}>
        <SeloPlus decorativo className="of-sel" />
        <b>Plus: 1.º mês por {PRECO_PROMO_MT} MT</b>
        <Link href="/aluno/plano" className="of-ir of-ir-sm">Subscrever</Link>
        <button type="button" onClick={faixa.close} aria-label="Fechar sugestão" className="of-x2"><X size={16} aria-hidden /></button>
      </div>
    )
  }

  return null
}
