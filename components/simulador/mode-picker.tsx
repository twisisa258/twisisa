import Link from 'next/link'
import { RotateCcw, Target, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AttemptMode } from '@/lib/simulator-shared'

const MODES: Record<AttemptMode, { label: string; icon: typeof Target }> = {
  pratica: { label: 'Prática', icon: Target },
  rapido: { label: 'Rápido', icon: Timer },
  revisao: { label: 'Revisão', icon: RotateCcw },
}

export function ModePicker({ modes, current, subjectId }: { modes: AttemptMode[]; current: AttemptMode; subjectId: string }) {
  return (
    <div role="tablist" aria-label="Modo" className="grid gap-1 rounded-2xl bg-[#eceee7] p-1" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}>
      {modes.map((mode) => {
        const { label, icon: Icon } = MODES[mode]
        const active = mode === current
        return (
          <Link
            key={mode}
            role="tab"
            aria-selected={active}
            replace
            scroll={false}
            href={`/aluno/simulador?d=${encodeURIComponent(subjectId)}&m=${mode}`}
            className={cn('flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-medium transition-all duration-200', active ? 'bg-white text-[#1d4d41] shadow-[0_2px_6px_rgba(20,50,40,0.10)]' : 'text-[#68716a]')}
          >
            <Icon size={16} aria-hidden />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
