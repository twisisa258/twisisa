import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Step({ n, title, done = false, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="flex items-center gap-2.5 px-1 text-[14px] font-semibold text-[#202321]">
        <span className={cn('flex size-6 items-center justify-center rounded-full text-[12px] font-bold transition-colors', done ? 'bg-[#1d4d41] text-white' : 'bg-[#1d4d41]/10 text-[#1d4d41]')}>
          {done ? <Check size={13} aria-hidden /> : n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}
