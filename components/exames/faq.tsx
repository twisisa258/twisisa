import type { Faq } from '@/lib/exames-pure'

// Perguntas frequentes visíveis na página (o mesmo texto vai para os dados estruturados FAQPage).
export function FaqList({ items, title = 'Perguntas' }: { items: Faq[]; title?: string }) {
  if (items.length === 0) return null
  return (
    <section className="tw5-sec tw5-faq" aria-labelledby="faq">
      <h2 id="faq" className="tw5-h2">{title}</h2>
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}<b aria-hidden="true">+</b></summary>
          <p>{item.a}</p>
        </details>
      ))}
    </section>
  )
}
