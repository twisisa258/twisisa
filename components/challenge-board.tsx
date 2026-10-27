'use client'

import { useState } from 'react'
import { Check, Circle } from 'lucide-react'

const initialChallenges = [
  { id: 'study', title: 'Estudar 30 minutos', progress: '30 / 30 min', done: true },
  { id: 'quiz', title: 'Concluir um simulado', progress: '0 / 1', done: false },
  { id: 'share', title: 'Partilhar uma dica', progress: '0 / 1', done: false },
]

export function ChallengeBoard() {
  const [challenges, setChallenges] = useState(initialChallenges)
  function toggle(id: string) { setChallenges(items => items.map(item => item.id === id ? { ...item, done: !item.done } : item)) }

  return (
    <section aria-labelledby="missions-heading">
      <h2 id="missions-heading" className="mb-2 text-lg font-semibold tracking-[-0.03em] text-[#202321]">Missões</h2>
      <div className="divide-y divide-[#e7e9e2]">
        {challenges.map(challenge => (
          <button key={challenge.id} type="button" onClick={() => toggle(challenge.id)} aria-pressed={challenge.done} className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:text-[#1d4d41]">
            <span className="flex size-7 shrink-0 items-center justify-center text-[#1d4d41]" aria-hidden="true">
              {challenge.done ? <Check size={18} strokeWidth={2.2} /> : <Circle size={18} strokeWidth={1.8} />}
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium text-[#26312a]">{challenge.title}</span>
            <span className="shrink-0 text-xs text-[#7d857e]">{challenge.progress}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
