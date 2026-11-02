import { MathBlock, MathText } from '@/lib/math-text'
import { parseStatement } from '@/lib/statement-parse'

export function QuestionStatement({ text, compact = false }: { text: string; compact?: boolean }) {
  const blocks = parseStatement(text)
  const body = compact ? 'text-[15px] leading-6' : 'text-[16px] leading-[1.65]'
  const formula = compact ? 'text-[16px]' : 'text-[19px]'
  const ask = compact ? 'text-[15px] font-semibold leading-6' : 'text-[19px] font-semibold leading-[1.4] tracking-[-0.01em] sm:text-[21px]'

  return (
    <div role="group" aria-label="Enunciado" className={compact ? 'space-y-2.5' : 'space-y-3'}>
      {blocks.map((block, index) => {
        if (block.kind === 'text') return <p key={index} className={`${body} text-texto`}><MathText text={block.text} /></p>
        if (block.kind === 'formula') {
          return <div key={index} className="rounded-xl bg-marca/[0.05] px-3.5 py-2.5"><MathBlock text={block.text} className={formula} /></div>
        }
        if (block.kind === 'given') {
          return (
            <ul key={index} className="space-y-1 rounded-xl border-l-[3px] border-marca/40 bg-marca/[0.05] py-2.5 pl-3.5 pr-3">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-marca/50" aria-hidden />
                  <span className="min-w-0 flex-1">
                    {item.formula ? <MathBlock text={item.text} className={formula} /> : <span className={`${body} text-texto`}><MathText text={item.text} /></span>}
                  </span>
                </li>
              ))}
            </ul>
          )
        }
        return <h1 key={index} className={`${ask} ${index > 0 ? 'pt-1' : ''}`}><MathText text={block.text} /></h1>
      })}
    </div>
  )
}
