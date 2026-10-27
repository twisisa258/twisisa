'use client'

import { useState } from 'react'
import { UserPlus, UserMinus } from 'lucide-react'
import { toggleFollow } from '@/app/comunidade/actions'
import { useFeedback } from '@/components/feedback-provider'

const people = [
  { id: 'amelia-demo', name: 'Amélia Matola', role: 'Matemática · Maputo', initials: 'AM' },
  { id: 'tomas-demo', name: 'Tomás Chongo', role: 'Física · Beira', initials: 'TC' },
  { id: 'lidia-demo', name: 'Lídia Sitoe', role: 'Biologia · Nampula', initials: 'LS' },
]

export function SocialNetwork() {
  const feedback = useFeedback()
  const [following, setFollowing] = useState<string[]>([])

  async function toggle(id: string, wasFollowing: boolean) {
    const set = (value: boolean) => setFollowing((current) => value ? [...current.filter((item) => item !== id), id] : current.filter((item) => item !== id))
    set(!wasFollowing)
    // Se falhar, volta ao estado anterior.
    const undo = (message: string) => { set(wasFollowing); feedback.error(message, 'Não foi possível actualizar') }
    try {
      const result = await toggleFollow(id)
      if (!result.ok) undo(result.message)
    } catch {
      undo('Sem ligação ao servidor. Verifica a internet e tenta outra vez.')
    }
  }

  return (
    <div className="divide-y divide-[#e7e9e2]">
      {people.map(person => {
        const isFollowing = following.includes(person.id)
        return (
          <article key={person.id} className="flex items-center gap-3 py-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#dce9e1] text-xs font-semibold text-[#1d4d41]">{person.initials}</span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-[#26312a]">{person.name}</h3>
              <p className="mt-0.5 truncate text-xs text-[#7c847c]">{person.role}</p>
            </div>
            <button type="button" aria-label={isFollowing ? `Deixar de seguir ${person.name}` : `Seguir ${person.name}`} aria-pressed={isFollowing} onClick={() => void toggle(person.id, isFollowing)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold text-[#1d4d41] transition-colors hover:bg-[#eaf0eb]">
              {isFollowing ? <UserMinus size={15} /> : <UserPlus size={15} />}
              <span>{isFollowing ? 'A seguir' : 'Seguir'}</span>
            </button>
          </article>
        )
      })}
    </div>
  )
}
