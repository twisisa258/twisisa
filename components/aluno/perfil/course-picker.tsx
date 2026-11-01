'use client'

import { useState } from 'react'
import { Check, Search } from 'lucide-react'

type Course = { id: string; name: string; unit: string | null }

const plain = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Escolha do curso da instituição: procura + lista (as listas têm dezenas de cursos).
// São botões de rádio nativos: funcionam com teclado e enviam o valor com o formulário, mesmo escondidos pela procura.
export function CoursePicker({ name, courses, defaultValue }: { name: string; courses: Course[]; defaultValue: string | null }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(defaultValue)
  const needle = plain(query.trim())
  const chosen = courses.find((course) => course.id === selected)
  const visible = courses.filter((course) => !needle || plain(`${course.name} ${course.unit ?? ''}`).includes(needle))

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa29c]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Procurar curso"
          aria-label="Procurar curso"
          className="h-11 w-full rounded-xl border border-[#dfe3d9] bg-white pl-10 pr-3.5 text-sm outline-none transition-colors placeholder:text-[#9aa29c] focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10"
        />
      </div>
      <div role="radiogroup" aria-label="Cursos" className="max-h-60 overflow-y-auto rounded-xl border border-[#dfe3d9] bg-white">
        {courses.map((course) => {
          const hidden = !visible.includes(course)
          return (
            <label key={course.id} className={hidden ? 'hidden' : 'block'}>
              <input type="radio" name={name} value={course.id} checked={selected === course.id} onChange={() => setSelected(course.id)} className="peer sr-only" />
              <span className="flex min-h-[48px] cursor-pointer items-center gap-3 border-b border-[#eceee7] px-3.5 py-2 text-left transition-colors last:border-b-0 hover:bg-[#f8f8f5] peer-checked:bg-[#eef3ee] peer-focus-visible:ring-2 peer-focus-visible:ring-inset peer-focus-visible:ring-[#1d4d41]/40">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[#202321]">{course.name}</span>
                  {course.unit && <span className="block truncate text-xs text-[#737c75]">{course.unit}</span>}
                </span>
                {selected === course.id && <Check size={16} className="shrink-0 text-[#1d4d41]" aria-hidden="true" />}
              </span>
            </label>
          )
        })}
        {visible.length === 0 && <p className="px-3.5 py-4 text-sm text-[#737c75]">Nenhum curso encontrado.</p>}
      </div>
      <p className="text-xs text-[#737c75]">{chosen ? `Escolhido: ${chosen.name}` : 'Nenhum curso escolhido.'}</p>
    </div>
  )
}
