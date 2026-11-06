import { Check } from 'lucide-react'
import { PLANO } from '@/lib/plano'

export const metadata = {
  title: 'Planos',
}

const benefits = [
  'Simulados premium e desafios semanais',
  'Materiais avançados organizados por disciplina',
  'Histórico de progresso e resultados',
]

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-fundo px-5 py-14 text-texto sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">

        <div className="grid items-center gap-12 lg:grid-cols-[1fr_440px] lg:gap-20">

          {/* Apresentação */}
          <section className="max-w-xl">

            <span className="inline-flex items-center rounded-full border border-marca/20 bg-marca-suave px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-marca">
              {PLANO.nome}
            </span>

            <h1 className="mt-7 text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Mais foco.
              <br />
              Mais preparação.
              <br />
              <span className="text-marca">
                Melhores resultados.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-texto-2 sm:text-lg">
              Desbloqueia ferramentas avançadas de aprendizagem,
              pratica com mais profundidade e acompanha a tua
              evolução em cada etapa.
            </p>

            <div className="mt-10 h-px w-full max-w-sm bg-linha" />

            <p className="mt-6 text-sm leading-7 text-texto-2">
              Investe na tua preparação e aproveita melhor
              cada oportunidade de aprendizagem.
            </p>

          </section>

          {/* Cartão do plano */}
          <section className="relative overflow-hidden rounded-[28px] border border-linha bg-white p-6 shadow-[0_16px_50px_rgba(0,0,0,0.05)] sm:p-9">

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-texto">
                Plano mensal
              </span>

              <span className="rounded-full bg-marca-suave px-3 py-1.5 text-xs font-semibold text-marca">
                Acesso premium
              </span>
            </div>

            <div className="mt-9 border-b border-linha pb-8">

              <p className="text-sm text-texto-2">
                Investimento mensal
              </p>

              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight text-texto sm:text-6xl">
                  {PLANO.precoMt}
                </span>

                <span className="text-xl font-semibold text-texto">
                  MT
                </span>

                <span className="text-sm text-texto-2">
                  / mês
                </span>
              </div>

              <p className="mt-3 text-sm text-texto-2">
                Pagamento por meios locais.
              </p>

            </div>

            <div className="mt-8">

              <h2 className="text-sm font-bold text-texto">
                O que está incluído
              </h2>

              <ul className="mt-6 space-y-5">

                {benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-3"
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-marca-suave">
                      <Check
                        size={15}
                        strokeWidth={2.5}
                        className="text-marca"
                        aria-hidden="true"
                      />
                    </span>

                    <span className="text-sm leading-6 text-texto">
                      {benefit}
                    </span>
                  </li>
                ))}

              </ul>

            </div>

            {/* Disponibilidade */}
            <div className="mt-9 rounded-2xl border border-marca/15 bg-marca-suave p-4">

              <p className="text-sm font-semibold text-marca">
                Disponível em breve
              </p>

              <p className="mt-1.5 text-sm leading-6 text-texto-2">
                O pagamento por meios locais estará disponível
                brevemente. Estamos a preparar tudo para ti.
              </p>

            </div>

          </section>

        </div>

        <footer className="mt-16 border-t border-linha pt-6 text-center">
          <p className="text-xs text-texto-2">
            Twisisa · Aprende, pratica e evolui.
          </p>
        </footer>

      </div>
    </main>
  )
}