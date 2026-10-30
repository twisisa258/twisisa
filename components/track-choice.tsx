'use client'

import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { isPresetLevel, OTHER_LEVEL_MAX, OTHER_LEVELS, TRACKS, type Track } from '@/lib/percurso'

export type TrackValue = { track: Track | null; otherLevel: string | null }

const option = (selected: boolean) =>
  `flex h-[48px] w-full items-center justify-between rounded-2xl border px-4 text-left text-[15px] font-semibold transition ${selected ? 'border-2 border-[#1d4d41] bg-[#f3f7f4] text-[#1d4d41]' : 'border-[#e3e5dc] bg-white text-[#202321] hover:border-[#1d4d41]'}`

// Escolha do percurso. Principais: 10ª, 12ª, Admissão e Outra. Ao tocar em «Outra», as principais saem e entram a 8ª, a 9ª, a 11ª
// e um campo para escrever outra classe. A seta no topo volta às principais. Usado no onboarding e em /aluno/percurso.
export function TrackChoice({ value, onChange, disabled = false }: { value: TrackValue; onChange: (next: TrackValue) => void; disabled?: boolean }) {
  const [other, setOther] = useState(Boolean(value.otherLevel))
  const custom = value.otherLevel && !isPresetLevel(value.otherLevel) ? value.otherLevel : ''

  if (other) {
    return (
      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Outra classe">
        <button type="button" onClick={() => { setOther(false); onChange({ track: null, otherLevel: null }) }} disabled={disabled} className="-ml-1 mb-1 flex h-9 w-fit items-center gap-1.5 rounded-full px-2 text-[14px] font-semibold text-[#1d4d41]">
          <ArrowLeft size={16} aria-hidden="true" />
          Outra classe
        </button>
        {OTHER_LEVELS.map((level) => {
          const selected = value.otherLevel === level.value
          return (
            <button key={level.value} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onChange({ track: null, otherLevel: level.value })} className={option(selected)}>
              {level.label}
              {selected && <Check size={18} aria-hidden="true" />}
            </button>
          )
        })}
        <input
          value={custom}
          onChange={(event) => onChange({ track: null, otherLevel: event.target.value.slice(0, OTHER_LEVEL_MAX) || null })}
          disabled={disabled}
          maxLength={OTHER_LEVEL_MAX}
          placeholder="Outra: escreve aqui"
          aria-label="Outra classe, escreve qual"
          className={`h-[48px] w-full rounded-2xl border px-4 text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-[#3f6357] focus:border-[#1d4d41] ${custom ? 'border-2 border-[#1d4d41] bg-[#f3f7f4]' : 'border-[#e3e5dc] bg-white'}`}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="O que preparas">
      {TRACKS.map((item) => {
        const selected = value.track === item.value
        return (
          <button key={item.value} type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={() => onChange({ track: item.value, otherLevel: null })} className={option(selected)}>
            {item.label}
            {selected && <Check size={18} aria-hidden="true" />}
          </button>
        )
      })}
      <button type="button" role="radio" aria-checked={false} disabled={disabled} onClick={() => { setOther(true); onChange({ track: null, otherLevel: null }) }} className={option(false)}>
        Outra
      </button>
    </div>
  )
}
