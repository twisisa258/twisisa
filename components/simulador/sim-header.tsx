import { ClipboardCheck } from 'lucide-react'

// Mesmo cabeçalho da Biblioteca: ícone, título em maiúsculas e uma linha de contexto.
export function SimHeader({ hint }: { hint?: string }) {
  return (
    <header className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2f7260] to-[#1d4d41] text-white"><ClipboardCheck size={20} aria-hidden="true" /></span>
      <div className="min-w-0">
        <h1 className="text-[15px] font-bold uppercase tracking-[0.16em] text-[#1d4d41]">Simulador</h1>
        {hint && <p className="truncate text-[12px] text-[#7a827b]">{hint}</p>}
      </div>
    </header>
  )
}
