'use client'

import { useRef, useState, useTransition } from 'react'
import { useFeedback } from '@/components/feedback-provider'
import { savePrefs } from '@/app/aluno/simulador/actions'
import { DEFAULT_PREFS, PREF_OPTIONS, type SimPrefs } from '@/lib/simulator-prefs'
import { clock } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(20,50,40,0.08)]">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Choice<T extends number>({ label, value, options, onChange, format = String }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void; format?: (value: T) => string }) {
  return (
    <div className="space-y-2">
      <p className="text-[14px] text-[#68716a]">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-xl bg-[#eceee7] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === value}
            onClick={() => onChange(option)}
            className={cn('h-10 rounded-lg text-[14px] font-medium tabular-nums transition-all duration-200', option === value ? 'bg-white text-[#1d4d41] shadow-[0_2px_6px_rgba(20,50,40,0.10)]' : 'text-[#68716a]')}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 text-left">
      <span className="text-[15px]">{label}</span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-[#1d4d41]' : 'bg-[#d5dad1]')}>
        <span className={cn('absolute top-1 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all duration-200', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  )
}

export function SettingsForm({ initial }: { initial: SimPrefs }) {
  const feedback = useFeedback()
  const [prefs, setPrefs] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [, startTransition] = useTransition()
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
      <Group title="Prática">
        <Choice label="Questões" value={prefs.practiceSize} options={PREF_OPTIONS.practiceSize} onChange={(practiceSize) => update({ practiceSize })} />
      </Group>

      <Group title="Modo rápido">
        <Choice label="Questões" value={prefs.quickSize} options={PREF_OPTIONS.quickSize} onChange={(quickSize) => update({ quickSize })} />
        <Choice label="Tempo por questão" value={prefs.quickSeconds} options={PREF_OPTIONS.quickSeconds} onChange={(quickSeconds) => update({ quickSeconds })} format={clock} />
      </Group>

      <Group title="Ao responder">
        <Toggle label="Som" checked={prefs.sound} onChange={(sound) => update({ sound })} />
        <Toggle label="Vibração" checked={prefs.haptics} onChange={(haptics) => update({ haptics })} />
      </Group>

      <div className="flex h-6 items-center justify-between px-1 text-[13px]" role="status">
        <span className={cn('text-[#7d857e] transition-opacity duration-200', saved ? 'opacity-100' : 'opacity-0')}>Guardado</span>
        <button type="button" disabled={isDefault} onClick={() => update(DEFAULT_PREFS)} className="font-medium text-[#1d4d41] hover:underline disabled:opacity-0">Repor</button>
      </div>
    </div>
  )
}
