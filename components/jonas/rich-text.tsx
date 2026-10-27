'use client'

import { memo, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { parseMarkdown, type Block, type Inline, type ListItem } from '@/lib/jonas-markdown'

// Desenha o texto do Jonas: **negrito**, listas, títulos, tabelas e fórmulas KaTeX. Nunca usa HTML vindo do modelo:
// o texto vira elementos React; só o resultado do KaTeX (com `trust` desligado) entra como HTML.

const mathCache = new Map<string, string>()

function renderMath(expression: string, display: boolean): string {
  const key = `${display ? 'D' : 'I'}${expression}`
  const hit = mathCache.get(key)
  if (hit !== undefined) return hit
  let html: string
  try {
    html = katex.renderToString(expression, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' })
  } catch {
    html = ''
  }
  if (mathCache.size > 500) mathCache.delete(mathCache.keys().next().value as string)
  mathCache.set(key, html)
  return html
}

function Inlines({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.t) {
          case 'text':
            return node.v
          case 'br':
            return <br key={index} />
          case 'bold':
            return <strong key={index} className="font-semibold text-[#17231d]"><Inlines nodes={node.c} /></strong>
          case 'italic':
            return <em key={index}><Inlines nodes={node.c} /></em>
          case 'code':
            return <code key={index} className="rounded-md bg-[#eef0ea] px-1.5 py-0.5 font-mono text-[0.88em]">{node.v}</code>
          case 'math':
            return node.display ? (
              <span key={index} className="my-1 block max-w-full overflow-x-auto overflow-y-hidden" dangerouslySetInnerHTML={{ __html: renderMath(node.v, true) }} />
            ) : (
              <span key={index} dangerouslySetInnerHTML={{ __html: renderMath(node.v, false) }} />
            )
        }
      })}
    </>
  )
}

function Items({ items }: { items: ListItem[] }) {
  return (
    <>
      {items.map((item, index) => (
        <li key={index} className="pl-1 marker:font-semibold marker:text-[#1d4d41]">
          <Inlines nodes={item.c} />
          {item.children.length > 0 && <Blocks blocks={item.children} nested />}
        </li>
      ))}
    </>
  )
}

function Blocks({ blocks, nested = false }: { blocks: Block[]; nested?: boolean }) {
  return (
    <>
      {blocks.map((block, index) => {
        const space = index === 0 && !nested ? '' : nested ? 'mt-1.5' : 'mt-3'
        switch (block.t) {
          case 'p':
            return <p key={index} className={space}><Inlines nodes={block.c} /></p>
          case 'h':
            return (
              <p key={index} role="heading" aria-level={block.level + 2} className={`${index === 0 ? '' : 'mt-4'} font-semibold tracking-[-0.01em] text-[#17231d] ${block.level === 3 ? 'text-[15.5px]' : 'text-[17px]'}`}>
                <Inlines nodes={block.c} />
              </p>
            )
          case 'ul':
            return <ul key={index} className={`${space} list-disc space-y-1.5 pl-5`}><Items items={block.items} /></ul>
          case 'ol':
            return <ol key={index} start={block.start} className={`${space} list-decimal space-y-1.5 pl-5`}><Items items={block.items} /></ol>
          case 'quote':
            return <blockquote key={index} className={`${space} border-l-[3px] border-[#cfdacf] pl-3 text-[#4b574f]`}><Blocks blocks={block.c} nested /></blockquote>
          case 'code':
            return <pre key={index} className={`${space} overflow-x-auto rounded-xl bg-[#f1f3ee] p-3 font-mono text-[13px] leading-6`}><code>{block.v}</code></pre>
          case 'math':
            return <div key={index} className={`${space} max-w-full overflow-x-auto overflow-y-hidden py-1`} dangerouslySetInnerHTML={{ __html: renderMath(block.v, true) }} />
          case 'hr':
            return <hr key={index} className="my-4 border-[#e3e5dc]" />
          case 'table':
            return (
              <div key={index} className={`${space} max-w-full overflow-x-auto rounded-xl border border-[#e3e5dc]`}>
                <table className="w-full border-collapse text-left text-[14px]">
                  <thead className="bg-[#f4f6f1]">
                    <tr>{block.head.map((cell, i) => <th key={i} className="px-3 py-2 font-semibold"><Inlines nodes={cell} /></th>)}</tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => <tr key={r} className="border-t border-[#edf0e9]">{row.map((cell, c) => <td key={c} className="px-3 py-2 align-top"><Inlines nodes={cell} /></td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </>
  )
}

export const RichText = memo(function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text])
  return (
    <div className={`break-words text-[15.5px] leading-[1.75] text-[#26332d] ${className}`}>
      <Blocks blocks={blocks} />
    </div>
  )
})
