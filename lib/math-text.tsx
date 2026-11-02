import katex from 'katex'
import 'katex/dist/katex.min.css'

// Texto com fórmulas em LaTeX: $x^2$ (na linha) e $$\frac{a}{b}$$ (em bloco). \$ escreve um cifrão normal.
// O texto fora das fórmulas é sempre texto (nunca HTML); as fórmulas passam pelo KaTeX com `trust` desligado.
const MATH = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g
const ESCAPED_DOLLAR = '\u0000'

function render(expression: string, displayMode: boolean) {
  return katex.renderToString(expression, { displayMode, throwOnError: false, strict: 'ignore', trust: false, output: 'htmlAndMathml' })
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = text.replace(/\n+[ \t]*([.,;:!?])(?=\s|$)/g, '$1').trim().replace(/\\\$/g, ESCAPED_DOLLAR).split(MATH)
  return (
    <span className={`whitespace-pre-wrap break-words ${className ?? ''}`}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
          return <span key={index} className="my-1 block overflow-x-auto" dangerouslySetInnerHTML={{ __html: render(part.slice(2, -2), true) }} />
        }
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          return <span key={index} dangerouslySetInnerHTML={{ __html: render(part.slice(1, -1), false) }} />
        }
        return <span key={index}>{part.split(ESCAPED_DOLLAR).join('$')}</span>
      })}
    </span>
  )
}

/** Linha que é só fórmula: mostra-a em destaque (modo bloco, alinhada à esquerda). */
export function MathBlock({ text, className }: { text: string; className?: string }) {
  const segments = text.replace(/\\\$/g, ESCAPED_DOLLAR).split(MATH).filter((part) => part.startsWith('$'))
  if (segments.length !== 1) return <MathText text={text} className={className} />
  const part = segments[0]
  const expression = part.startsWith('$$') ? part.slice(2, -2) : part.slice(1, -1)
  return <span className={`block max-w-full overflow-x-auto overflow-y-hidden py-0.5 [&_.katex-display]:!m-0 [&_.katex-display]:!text-left [&_.katex-display>.katex]:!text-left ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: render(expression, true) }} />
}

/** Texto simples (sem fórmulas) para listas: tira os cifrões e encurta. */
export function plainExcerpt(text: string, max = 110) {
  const flat = text.replace(/\\\$/g, '$').replace(/\$+/g, '').replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}
