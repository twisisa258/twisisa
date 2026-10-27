import { Check } from 'lucide-react'
import { CheckoutButton } from '@/components/checkout-button'

const benefits = ['Simulados premium e desafios semanais', 'Materiais avançados organizados por disciplina', 'Histórico de progresso e resultados']

export default function PlanosPage() {
  return <main className="min-h-screen bg-[#f8f8f5] px-5 py-12 text-[#202321] sm:px-8"><div className="mx-auto max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1d4d41]">Twisisa Plus</p><h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">Mais foco para cada etapa.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-[#68716b]">Desbloqueia ferramentas para praticar melhor e acompanha a tua evolução.</p><section className="mt-10 max-w-md rounded-[28px] border border-[#dfe4dc] bg-white p-7 shadow-sm"><div className="flex items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Plano mensal</h2><p className="mt-2 text-sm text-[#68716b]">Cancela quando quiseres.</p></div><p className="text-3xl font-semibold">$9.99<span className="text-sm font-normal text-[#68716b]">/mês</span></p></div><ul className="mt-7 space-y-3">{benefits.map((benefit) => <li key={benefit} className="flex gap-3 text-sm"><Check size={18} className="mt-0.5 text-[#1d4d41]" />{benefit}</li>)}</ul><div className="mt-8"><CheckoutButton productId="estuda-plus-monthly" /></div><p className="mt-4 text-xs text-[#68716b]">Pagamento processado com segurança pela Stripe.</p></section></div></main>
}
