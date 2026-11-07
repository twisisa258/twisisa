import type { TocItem } from '@/lib/blog-markdown'

// Índice do artigo: <details> recolhido, sem JavaScript e sem barra lateral.
export function Toc({ items }: { items: TocItem[] }) {
  return (
    <details className="group mt-8 border-y border-linha">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
        Neste artigo
        <span aria-hidden="true" className="text-texto-2 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <nav aria-label="Índice do artigo" className="pb-4">
        <ol className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className={item.level === 3 ? 'pl-5' : ''}>
              <a href={`#${item.id}`} className="inline-flex min-h-11 items-center text-[16px] leading-6 underline-offset-4 hover:text-marca hover:underline">{item.text}</a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  )
}
