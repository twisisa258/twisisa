import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SeloPlus } from '@/components/plano/selo-plus'
import { DESCONTO_PROMO_PCT, PLANO, PRECO_PROMO_MT, type BlocoMenu } from '@/lib/plano'

// O bloco do topo do menu (lateral e gaveta do telemóvel): sempre o primeiro, sempre com o selo, e leva a /aluno/plano.
// A = cartão (primeira semana da conta) · B = faixa (depois) · ativo = estado de quem já tem Plus.
// Quem decide qual mostrar é `varianteDoBloco` (lib/plano.ts); e nada aparece enquanto `PAGAMENTO_ATIVO` for false.
export function BlocoPlus({ bloco, onNavigate }: { bloco: BlocoMenu; onNavigate?: () => void }) {
  if (bloco.variante === 'ativo') {
    return (
      <Link href="/aluno/plano" onClick={onNavigate} className="bp bp-on">
        <SeloPlus decorativo className="bp-selo" />
        <span className="bp-x"><b>Plus ativo</b>{bloco.ate && <small>Válido até {bloco.ate}</small>}</span>
        <ChevronRight size={16} aria-hidden />
      </Link>
    )
  }
  if (bloco.variante === 'a') {
    return (
      <Link href="/aluno/plano" onClick={onNavigate} className="bp bp-a">
        <span className="bp-t"><SeloPlus decorativo className="bp-sel" />{PLANO.nome}<em>−{DESCONTO_PROMO_PCT}%</em></span>
        <span className="bp-p">1.º mês por {PRECO_PROMO_MT} MT <s>{PLANO.precoMt}</s><ChevronRight size={16} aria-hidden /></span>
      </Link>
    )
  }
  return (
    <Link href="/aluno/plano" onClick={onNavigate} className="bp bp-b">
      <SeloPlus decorativo className="bp-selo" />
      <span className="bp-x"><b>Torna-te Plus</b><small>1.º mês a {PRECO_PROMO_MT} MT</small></span>
      <ChevronRight size={16} aria-hidden />
    </Link>
  )
}
