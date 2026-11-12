import { Check, CreditCard } from 'lucide-react'
import { CartaoPlus } from '@/components/plano/cartao-plus'
import { OperadoraDaSubscricao } from '@/components/plano/operadoras'
import { PagarForm } from '@/components/plano/pagar-form'
import { SeloPlus } from '@/components/plano/selo-plus'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { PLANO, dataLonga, diasRestantes, estadoDoPlano, operadoraPorId, progressoDoPeriodo } from '@/lib/plano'
import { requireStudent } from '@/lib/require-student'
import { getSubscription } from '@/lib/subscription'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Plano' }

// Linhas curtas: cada uma cabe numa linha no telemóvel (regra de DESIGN.md).
const INCLUI = ['Simulados e desafios premium', 'Materiais avançados', 'Histórico de progresso', 'Selo Plus junto à tua foto'] as const

export default async function PlanoPage() {
  const session = await requireStudent('/aluno/plano')
  const firstName = session.user.name.split(' ')[0]
  const subscription = await getSubscription(session.user.id).catch((error: unknown) => {
    console.error('[PLANO]', error)
    return null
  })

  if (subscription === null) {
    return (
      <StudentFeatureShell firstName={firstName} eyebrow="Definições" title="Plano" icon={CreditCard} backHref="/aluno/definicoes" backLabel="Voltar às definições">
        <div className="max-w-xl rounded-2xl border border-linha bg-white p-6">
          <p className="text-[15px] font-medium">Não foi possível carregar o teu plano</p>
          <p className="mt-1 text-sm text-texto-2">Tenta outra vez daqui a pouco.</p>
        </div>
      </StudentFeatureShell>
    )
  }

  const fim = subscription?.currentPeriodEnd ?? null
  const estado = estadoDoPlano(subscription?.status, fim)
  const dias = estado === 'ativo' ? diasRestantes(fim) : null

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Definições" title="Plano" icon={CreditCard} backHref="/aluno/definicoes" backLabel="Voltar às definições">
      <div className="flex max-w-xl flex-col gap-4">
        {estado === 'ativo' ? (
          <>
            <CartaoPlus nome={session.user.name} desde={subscription?.createdAt} ate={fim} />

            <section className="pl-caixa" aria-label="Estado do plano">
              <div className="pl-estado">
                <div className="min-w-0">
                  <span className="chip bg-sucesso-suave text-sucesso-texto">Ativo</span>
                  <p className="pl-titulo">{PLANO.nome}</p>
                  <p className="pl-apoio">{fim ? `Válido até ${dataLonga(fim)}` : 'Sem data de fim'}</p>
                  {operadoraPorId(subscription?.provider) && (
                    <p className="pl-apoio">Pago com <OperadoraDaSubscricao provider={subscription?.provider} /></p>
                  )}
                </div>
                {dias !== null && (
                  <div className="pl-anel" style={{ ['--p' as string]: Math.round(progressoDoPeriodo(dias) * 100) }} role="img" aria-label={`${dias} dias restantes`}>
                    <i>{dias}d</i>
                  </div>
                )}
              </div>
            </section>

            <section className="pl-caixa pl-selo-caixa" aria-label="Selo Plus">
              <SeloPlus className="pl-selo-g" decorativo />
              <div className="min-w-0">
                <p className="pl-titulo">Selo Plus</p>
                <p className="pl-apoio">Aparece junto à tua foto.</p>
              </div>
            </section>
          </>
        ) : (
          <>
            <CartaoPlus nome={session.user.name} bloqueado />

            {estado === 'terminado' ? (
              <section className="pl-caixa" aria-label="Estado do plano">
                <span className="chip bg-superficie-2 text-texto-2">Terminou</span>
                <p className="pl-titulo">{fim ? `O teu Plus terminou a ${dataLonga(fim)}` : 'O teu Plus terminou'}</p>
                <p className="pl-apoio">Renova para voltares a ter o selo.</p>
              </section>
            ) : (
              <section className="pl-caixa" aria-label="Plano Plus">
                <span className="chip bg-superficie-2 text-texto-2">{PLANO.nome}</span>
                <p className="pl-preco">{PLANO.precoMt}<span>MT / mês</span></p>
                <ul className="pl-lista">
                  {INCLUI.map((texto) => (
                    <li key={texto}><Check size={17} strokeWidth={2.5} aria-hidden /><span>{texto}</span></li>
                  ))}
                </ul>
              </section>
            )}

            <PagarForm titulo={estado === 'terminado' ? 'Renovar com' : 'Pagar com'} />
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
