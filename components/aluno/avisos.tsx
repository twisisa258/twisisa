import Link from 'next/link'
import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, Check, Clock, Flame, Target, type LucideIcon } from 'lucide-react'
import type { Aviso, AvisoIcon, AvisoTone } from '@/lib/avisos'

export const ICONS: Record<AvisoIcon, LucideIcon> = { flame: Flame, clock: Clock, target: Target, book: BookOpen, alert: AlertTriangle, check: Check, calendar: CalendarDays }

export const TONES: Record<AvisoTone, { card: string; icon: string; cta: string }> = {
  urgent: { card: 'border border-erro-suave bg-conquista-suave', icon: 'bg-aviso text-white', cta: 'text-erro-texto' },
  warning: { card: 'border border-[#f6d9ad] bg-aviso-suave', icon: 'bg-aviso text-white', cta: 'text-conquista-texto' },
  info: { card: 'border border-linha bg-white', icon: 'bg-marca-suave text-marca', cta: 'text-marca' },
  success: { card: 'border border-linha bg-marca-suave', icon: 'bg-marca text-white', cta: 'text-marca' },
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
            className={`flex items-center gap-3 sf-toque rounded-[18px] p-3.5 text-texto no-underline ${tone.card}`}
          >
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}><Icon size={18} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-5">{aviso.title}</span>
              <span className="mt-0.5 block text-xs leading-[18px] text-texto-2">{aviso.text}</span>
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
