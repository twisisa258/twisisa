'use client'

import { useRef, useState, useTransition } from 'react'
import { Check, Clock, ListChecks, RotateCcw, Smartphone, Timer, Target, Volume2 } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { savePrefs } from '@/app/aluno/simulador/actions'
import { DEFAULT_PREFS, PREF_OPTIONS, type SimPrefs } from '@/lib/simulator-prefs'
import { clock } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'

const card = 'rounded-2xl bg-gradient-to-br from-white to-[#f4f6f1] p-4 shadow-[0_1px_2px_rgba(20,50,40,0.05)]'

function Group({ icon: Icon, title, children }: { icon: typeof Target; title: string; children: React.ReactNode }) {
  return (
    <section className={cn(card, 'space-y-4')}>
      <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#1d4d41]/[0.08] text-[#1d4d41]"><Icon size={16} aria-hidden /></span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[14px] font-medium">{label}</p>
        <p className="text-[12.5px] leading-5 text-[#6b756e]">{hint}</p>
      </div>
      {children}
    </div>
  )
}

function Choice<T extends number>({ value, options, onChange, format = String }: { value: T; options: readonly T[]; onChange: (value: T) => void; format?: (value: T) => string }) {
  return (
    <div role="radiogroup" className="grid gap-1 rounded-xl bg-[#eceee7] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === value}
          onClick={() => onChange(option)}
          className={cn('h-10 rounded-lg text-[14px] font-semibold tabular-nums transition-all duration-200 active:scale-[0.98]', option === value ? 'bg-white text-[#1d4d41] shadow-[0_2px_6px_rgba(20,50,40,0.10)]' : 'text-[#68716a]')}
        >
          {format(option)}
        </button>
      ))}
    </div>
  )
}

function Toggle({ icon: Icon, label, hint, checked, onChange }: { icon: typeof Target; label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 text-left">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1d4d41] shadow-[0_1px_2px_rgba(20,50,40,0.08)]"><Icon size={17} aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium">{label}</span>
        <span className="block text-[12.5px] leading-5 text-[#6b756e]">{hint}</span>
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-[#1d4d41]' : 'bg-[#cfd5cb]')}>
        <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-all duration-200', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  )
}

export function SettingsForm({ initial }: { initial: SimPrefs }) {
  const feedback = useFeedback()
  const [prefs, setPrefs] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const previous = useRef(initial)

  function update(patch: Partial<SimPrefs>) {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    setSaved(false)
    startTransition(async () => {
      try {
        const result = await savePrefs(next)
        if (!result.ok) throw new Error(result.message)
        previous.current = next
        setSaved(true)
      } catch {
        setPrefs(previous.current)
        feedback.error('Não foi possível guardar. Tenta de novo.')
      }
    })
  }

  const isDefault = JSON.stringify(prefs) === JSON.stringify(DEFAULT_PREFS)

  return (
    <div className="space-y-4">
      <Group icon={Target} title="Prática">
        <Row label="Questões por sessão" hint="Sessões curtas ajudam a treinar todos os dias.">
          <Choice value={prefs.practiceSize} options={PREF_OPTIONS.practiceSize} onChange={(practiceSize) => update({ practiceSize })} />
        </Row>
      </Group>

      <Group icon={Timer} title="Modo rápido">
        <Row label="Questões por ronda" hint="Quantas questões tens em cada ronda.">
          <Choice value={prefs.quickSize} options={PREF_OPTIONS.quickSize} onChange={(quickSize) => update({ quickSize })} />
        </Row>
        <Row label="Tempo por questão" hint="Menos tempo, mais parecido com o ritmo do exame.">
          <Choice value={prefs.quickSeconds} options={PREF_OPTIONS.quickSeconds} onChange={(quickSeconds) => update({ quickSeconds })} format={clock} />
        </Row>
      </Group>

      <Group icon={ListChecks} title="Ao responder">
        <Toggle icon={Volume2} label="Som" hint="Um toque curto para certo e errado." checked={prefs.sound} onChange={(sound) => update({ sound })} />
        <Toggle icon={Smartphone} label="Vibração" hint="O telemóvel vibra ao verificares." checked={prefs.haptics} onChange={(haptics) => update({ haptics })} />
      </Group>

      <div className="flex h-8 items-center justify-between px-1 text-[12.5px]">
        <span className={cn('inline-flex items-center gap-1.5 font-medium transition-opacity duration-200', saved || pending ? 'opacity-100' : 'opacity-0', saved && !pending ? 'text-[#1f6b45]' : 'text-[#6b756e]')} role="status">
          {pending ? <><Clock size={14} aria-hidden />A guardar…</> : <><Check size={14} aria-hidden />Guardado neste aparelho</>}
        </span>
        <button type="button" disabled={isDefault} onClick={() => update(DEFAULT_PREFS)} className="inline-flex items-center gap-1.5 font-semibold text-[#1d4d41] transition-opacity hover:underline disabled:opacity-0">
          <RotateCcw size={14} aria-hidden />Repor padrões
        </button>
      </div>
    </div>
  )
}
