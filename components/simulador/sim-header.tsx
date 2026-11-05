import { ClipboardCheck } from 'lucide-react'

// Mesmo cabeçalho das outras áreas (ícone na cor da área, título, contexto).
export function SimHeader({ context }: { context?: string }) {
  return (
    <header className="tom-marca flex items-center gap-3.5">
      <span className="ic-tom ic-tom-lg"><ClipboardCheck size={24} aria-hidden="true" /></span>
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.045em]">Simulador</h1>
        {context && <p className="truncate text-[14px] leading-5 text-texto-2">{context}</p>}
      </div>
    </header>
  )
}
