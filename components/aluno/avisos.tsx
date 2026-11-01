import Link from 'next/link'
import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, Check, Clock, Flame, Target, type LucideIcon } from 'lucide-react'
import type { Aviso, AvisoIcon, AvisoTone } from '@/lib/avisos'

const ICONS: Record<AvisoIcon, LucideIcon> = { flame: Flame, clock: Clock, target: Target, book: BookOpen, alert: AlertTriangle, check: Check, calendar: CalendarDays }

const TONES: Record<AvisoTone, { card: string; icon: string; cta: string }> = {
  urgent: { card: 'bg-gradient-to-br from-[#fff4ee] to-[#fde5da]', icon: 'bg-[#c2410c] text-white', cta: 'text-[#9a3412]' },
  warning: { card: 'bg-gradient-to-br from-[#fffaec] to-[#f8edca]', icon: 'bg-[#b7791f] text-white', cta: 'text-[#8a5a12]' },
  info: { card: 'bg-gradient-to-br from-white to-[#f4f6f1]', icon: 'bg-[#eaf1ec] text-[#1d4d41]', cta: 'text-[#1d4d41]' },
  success: { card: 'bg-gradient-to-br from-[#eef6f0] to-[#dcebe0]', icon: 'bg-[#1d4d41] text-white', cta: 'text-[#1d4d41]' },
}

// Avisos e lembretes do aluno (calculados em lib/avisos.ts). Cada cartão é uma ligação para a ação.
export function Avisos({ items }: { items: Aviso[] }) {
  if (items.length === 0) return null
  return (
    <section aria-label="Avisos" className="flex flex-col gap-2">
      {items.map((aviso) => {
        const tone = TONES[aviso.tone]
        const Icon = ICONS[aviso.icon]
        return (
          <Link
            key={aviso.id}
            href={aviso.href}
            role={aviso.tone === 'urgent' ? 'alert' : undefined}
            className={`flex items-center gap-3 rounded-[18px] p-3.5 text-[#202321] no-underline shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)] ${tone.card}`}
          >
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}><Icon size={18} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-5">{aviso.title}</span>
              <span className="mt-0.5 block text-xs leading-[18px] text-[#5b645d]">{aviso.text}</span>
            </span>
            <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${tone.cta}`}>
              <span className="hidden sm:inline">{aviso.cta}</span>
              <ArrowRight size={16} aria-label={aviso.cta} />
            </span>
          </Link>
        )
      })}
    </section>
  )
}
