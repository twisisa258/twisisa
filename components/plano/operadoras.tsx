import { operadoraPorId, type OperadoraId } from '@/lib/plano'

// Logos das operadoras (M-Pesa, e-Mola, mKesh). Um só sítio.
// PROVISÓRIOS: o nome em letras, na cor de cada operadora. Para pôr os logos oficiais, guardar os SVG em `public/operadoras/`
// (mpesa.svg, emola.svg, mkesh.svg) e trocar o conteúdo de `OperadoraLogo` por <img src={`/operadoras/${id}.svg`} alt={nome} />.
const ROTULO: Record<OperadoraId, string> = { mpesa: 'M-PESA', emola: 'e-Mola', mkesh: 'mKesh' }

export function OperadoraLogo({ id, tamanho = 'm' }: { id: OperadoraId; tamanho?: 'p' | 'm' | 'g' }) {
  const nome = operadoraPorId(id)?.nome ?? id
  return (
    <span className={`op-logo op-${id} op-${tamanho}`} role="img" aria-label={nome}>
      {ROTULO[id]}
    </span>
  )
}

/** Logo da operadora guardada na subscrição (`provider`), ou nada se for um valor que não conhecemos. */
export function OperadoraDaSubscricao({ provider, tamanho = 'p' }: { provider: string | null | undefined; tamanho?: 'p' | 'm' | 'g' }) {
  const operadora = operadoraPorId(provider)
  return operadora ? <OperadoraLogo id={operadora.id} tamanho={tamanho} /> : null
}
