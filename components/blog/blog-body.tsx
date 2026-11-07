import Link from 'next/link'
import { MathBlock, MathText } from '@/lib/math-text'
import type { Block, Inline } from '@/lib/blog-markdown'

// Desenha a árvore do Markdown do blog como elementos React (nunca HTML em bruto). Serve o artigo, a pré-visualização
// do administrador e o editor. Medidas: texto 17px (18px no desktop), entrelinha 1,75, espaço entre parágrafos 1,25em.
// Tabelas e fórmulas largas rolam dentro do próprio bloco; a página nunca rola na horizontal.

const H2 = 'mt-12 scroll-mt-6 text-[clamp(1.375rem,1.2rem+0.9vw,1.75rem)] font-semibold leading-[1.25] tracking-[-0.03em] text-texto'
const H3 = 'mt-9 scroll-mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.25rem)] font-semibold leading-[1.3] tracking-[-0.02em] text-texto'

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((item, index) => {
        switch (item.t) {
          case 'text':
            return <span key={index}>{item.v}</span>
          case 'bold':
            return <strong key={index} className="font-semibold text-texto"><Inlines items={item.c} /></strong>
          case 'italic':
            return <em key={index}><Inlines items={item.c} /></em>
          case 'code':
            return <code key={index} className="rounded bg-linha/40 px-1.5 py-0.5 text-[0.9em]">{item.v}</code>
          case 'math':
            return <MathText key={index} text={`$${item.v}$`} className="!whitespace-normal" />
          case 'link': {
            const className = 'underline decoration-1 underline-offset-[3px] hover:text-marca'
            return item.href.startsWith('/') || item.href.startsWith('#')
              ? <Link key={index} href={item.href} className={className}><Inlines items={item.c} /></Link>
              : <a key={index} href={item.href} rel="noopener noreferrer" className={className}><Inlines items={item.c} /></a>
          }
        }
      })}
    </>
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.t) {
          case 'h':
            return block.level === 2
              ? <h2 key={index} id={block.id} className={H2}><Inlines items={block.c} /></h2>
              : <h3 key={index} id={block.id} className={H3}><Inlines items={block.c} /></h3>
          case 'p':
            return <p key={index} className="mt-[1.25em]"><Inlines items={block.c} /></p>
          case 'ul':
            return <ul key={index} className="mt-[1.25em] list-disc space-y-2 pl-6 marker:text-texto-2">{block.items.map((item, i) => <li key={i} className="pl-1"><Inlines items={item} /></li>)}</ul>
          case 'ol':
            return <ol key={index} start={block.start} className="mt-[1.25em] list-decimal space-y-2 pl-6 marker:text-texto-2">{block.items.map((item, i) => <li key={i} className="pl-1"><Inlines items={item} /></li>)}</ol>
          case 'quote':
            return <blockquote key={index} className="mt-[1.25em] border-l-2 border-linha pl-5 text-texto-2"><Blocks blocks={block.c} /></blockquote>
          case 'code':
            return <pre key={index} className="mt-[1.25em] overflow-x-auto rounded-md bg-linha/40 p-4 text-[14px] leading-6"><code>{block.v}</code></pre>
          case 'math':
            return <div key={index} className="mt-[1.25em] max-w-full overflow-x-auto"><MathBlock text={`$$${block.v}$$`} /></div>
          case 'image':
            return (
              <figure key={index} className="mt-[1.25em] sm:-mx-10">
                {/* Largura total até 760px; sem dimensões conhecidas, a imagem reserva a altura ao carregar. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.src} alt={block.alt} loading="lazy" decoding="async" className="h-auto w-full rounded-md" />
                {block.alt && <figcaption className="mt-2 text-[14px] leading-6 text-texto-2">{block.alt}</figcaption>}
              </figure>
            )
          case 'hr':
            return <hr key={index} className="my-10 border-linha" />
          case 'table':
            return (
              <div key={index} className="mt-[1.25em] overflow-x-auto sm:-mx-10" tabIndex={0} role="region" aria-label="Tabela">
                <table className="w-full min-w-[30rem] border-collapse text-left text-[15px] leading-6">
                  <thead>
                    <tr>{block.head.map((cell, i) => <th key={i} scope="col" style={{ textAlign: block.align[i] ?? undefined }} className="border-b border-texto/30 px-3 py-2 font-semibold"><Inlines items={cell} /></th>)}</tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => <tr key={r}>{row.map((cell, i) => <td key={i} style={{ textAlign: block.align[i] ?? undefined }} className="border-b border-linha px-3 py-2 align-top"><Inlines items={cell} /></td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </>
  )
}

export function BlogBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="text-[17px] leading-[1.75] text-texto sm:text-[18px] [&>*:first-child]:mt-0 [&_h2:first-child]:mt-0">
      <Blocks blocks={blocks} />
    </div>
  )
}
