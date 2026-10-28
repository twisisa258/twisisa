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
    <div role="tablist" aria-label="Modo" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}>
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
            className={cn(
              'flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl text-[13px] font-semibold transition-all duration-200 active:scale-[0.98]',
              active
                ? 'bg-gradient-to-br from-[#2f7260] to-[#1d4d41] text-white shadow-[0_6px_14px_-6px_rgba(29,77,65,0.55)]'
                : 'bg-white text-[#5d675f] shadow-[0_1px_2px_rgba(20,50,40,0.06)] hover:text-[#1d4d41]',
            )}
          >
            <Icon size={20} aria-hidden />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
