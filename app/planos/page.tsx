import { Check } from 'lucide-react'
import { PLANO } from '@/lib/plano'

export const metadata = { title: 'Planos' }

const benefits = ['Simulados premium e desafios semanais', 'Materiais avançados organizados por disciplina', 'Histórico de progresso e resultados']

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-fundo px-5 py-12 text-texto sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-marca">{PLANO.nome}</p>
        <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">Mais foco para cada etapa.</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-texto-2">Desbloqueia ferramentas para praticar melhor e acompanha a tua evolução.</p>
        <section className="mt-10 max-w-md rounded-[28px] border border-linha bg-white p-7 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Plano mensal</h2>
              <p className="mt-2 text-sm text-texto-2">Pagamento por meios locais.</p>
            </div>
            <p className="text-3xl font-semibold">{PLANO.precoMt} MT<span className="text-sm font-normal text-texto-2">/mês</span></p>
          </div>
          <ul className="mt-7 space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-[15px]"><Check size={18} className="mt-0.5 shrink-0 text-marca" aria-hidden />{benefit}</li>
            ))}
          </ul>
          <p className="mt-7 rounded-xl bg-marca-suave px-4 py-3 text-sm text-marca">O pagamento por meios locais estará disponível em breve.</p>
        </section>
      </div>
    </main>
  )
}
