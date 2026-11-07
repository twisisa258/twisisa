import { Check } from 'lucide-react'
import { PLANO } from '@/lib/plano'

export const metadata = { title: 'Planos' }

const benefits = [
  'Simulados premium e desafios semanais',
  'Materiais avançados organizados por disciplina',
  'Histórico de progresso e resultados',
]

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-fundo px-5 py-16 text-texto sm:px-8 sm:py-24">
      <div className="mx-auto max-w-5xl">

        <div className="grid items-center gap-12 lg:grid-cols-[1fr_400px] lg:gap-20">

          {/* Apresentação */}
          <section className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-marca">
              {PLANO.nome}
            </p>

            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Mais foco para cada etapa.
            </h1>

            <p className="mt-5 max-w-md text-base leading-8 text-texto-2 sm:text-lg">
              Desbloqueia ferramentas para praticar melhor e acompanha a tua evolução.
            </p>
          </section>

          {/* Plano */}
          <section className="w-full rounded-[28px] border border-linha bg-white p-7 shadow-sm sm:p-9">

            <div className="border-b border-linha pb-7">
              <h2 className="text-xl font-semibold">
                Plano mensal
              </h2>

              <p className="mt-2 text-sm text-texto-2">
                Pagamento por meios locais.
              </p>

              <div className="mt-7 flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight">
                  {PLANO.precoMt}
                </span>

                <span className="text-lg font-medium">
                  MT
                </span>

                <span className="text-sm text-texto-2">
                  /mês
                </span>
              </div>
            </div>

            <ul className="mt-7 space-y-5">
              {benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3 text-[15px] leading-6"
                >
                  <Check
                    size={19}
                    strokeWidth={2.5}
                    className="mt-0.5 shrink-0 text-marca"
                    aria-hidden="true"
                  />

                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <p className="mt-8 rounded-xl bg-marca-suave px-4 py-4 text-sm leading-6 text-marca">
              O pagamento por meios locais estará disponível em breve.
            </p>

          </section>
        </div>

      </div>
    </main>
  )
}