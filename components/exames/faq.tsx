import { ChevronDown } from 'lucide-react'
import type { Faq } from '@/lib/exames-pure'

// Perguntas frequentes visíveis na página (o mesmo texto vai para os dados estruturados FAQPage).
export function FaqList({ items, title = 'Perguntas frequentes' }: { items: Faq[]; title?: string }) {
  if (items.length === 0) return null
  return (
    <section className="mt-12" aria-labelledby="faq">
      <h2 id="faq" className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="mt-4 divide-y divide-linha rounded-2xl border border-linha bg-white">
        {items.map((item) => (
          <details key={item.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown size={18} aria-hidden className="shrink-0 text-marca transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-[15px] leading-7 text-texto-2">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
