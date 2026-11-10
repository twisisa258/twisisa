import { Lock } from 'lucide-react'
import { dataCurta, mesAno } from '@/lib/plano'
import { Inclinar } from '@/components/plano/inclinar'
import { SeloPlus } from '@/components/plano/selo-plus'

// O cartão de membro Plus. Só mostra dados que existem: o nome da conta, o mês em que começou e a data em que acaba o período pago.
// `bloqueado`: quem não tem Plus vê o cartão desfocado com um cadeado (a curiosidade que convida a subscrever).
export function CartaoPlus({ nome, desde, ate, bloqueado = false }: { nome: string; desde?: Date | null; ate?: Date | null; bloqueado?: boolean }) {
  return (
    <Inclinar>
      <article className={bloqueado ? 'pc pc-bloq' : 'pc'} aria-label={bloqueado ? 'Cartão Twisisa Plus bloqueado' : 'Cartão Twisisa Plus'}>
        <SeloPlus decorativo className="pc-agua" />
        <div className="pc-topo">
          <span className="pc-logo"><i aria-hidden="true" />Twisisa</span>
          <span className="pc-plus">PLUS</span>
        </div>
        <span className="pc-chip" aria-hidden="true" />
        <div className="pc-pe">
          <div className="pc-nome">
            <small>{desde ? `Membro desde ${mesAno(desde)}` : 'Membro'}</small>
            <b><span>{nome}</span>{!bloqueado && <SeloPlus className="pc-selo" />}</b>
          </div>
          <div className="pc-val">
            <small>Válido até</small>
            <span>{ate ? dataCurta(ate) : '—'}</span>
          </div>
        </div>
        {bloqueado && (
          <div className="pc-tranca">
            <Lock size={28} aria-hidden="true" />
            <b>O teu cartão Plus</b>
            <span>Desbloqueia ao subscrever</span>
          </div>
        )}
      </article>
    </Inclinar>
  )
}
