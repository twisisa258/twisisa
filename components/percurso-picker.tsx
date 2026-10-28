'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Check, ChevronRight, GraduationCap } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { savePercurso } from '@/app/aluno/percurso/actions'
import { TRACKS, type Track } from '@/lib/percurso'
import { Spinner } from '@/components/ui/spinner'

export type PickerInstitution = {
  id: string
  shortName: string
  name: string
  description: string | null
  logoUrl: string | null
  soon: boolean
}

// Descrições podem trazer **negrito** (como já acontecia no perfil).
function bold(text: string | null) {
  if (!text) return null
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) => (part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part))
}

export function PercursoPicker({ initialTrack, initialInstitutionId, institutions }: { initialTrack: Track | null; initialInstitutionId: string | null; institutions: PickerInstitution[] }) {
  const feedback = useFeedback()
  const router = useRouter()
  const [track, setTrack] = useState<Track | null>(initialTrack)
  // Se a instituição guardada já não está disponível, o aluno escolhe outra.
  const [institutionId, setInstitutionId] = useState<string | null>(institutions.some((item) => item.id === initialInstitutionId) ? initialInstitutionId : null)
  const [pending, setPending] = useState(false)

  const needsInstitution = track === 'admissao'
  const canSave = Boolean(track) && (!needsInstitution || Boolean(institutionId)) && !pending

  async function save() {
    if (!track || !canSave) return
    setPending(true)
    try {
      const data = new FormData()
      data.set('track', track)
      if (needsInstitution && institutionId) data.set('institutionId', institutionId)
      const result = await savePercurso(data)
      if (result.ok) {
        feedback.success(result.message ?? 'Percurso guardado.')
        router.push('/aluno')
        router.refresh()
      } else {
        feedback.error(result.message)
      }
    } catch {
      feedback.error('Não foi possível guardar o percurso. Tenta outra vez.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="percurso-titulo">
        <h2 id="percurso-titulo" className="text-base font-semibold">O que estás a preparar?</h2>
        <div role="radiogroup" aria-labelledby="percurso-titulo" className="mt-4 grid gap-3 sm:grid-cols-3">
          {TRACKS.map((item) => {
            const selected = track === item.value
            const Icon = item.value === 'admissao' ? GraduationCap : BookOpen
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTrack(item.value)}
                className={`flex items-start gap-3 rounded-3xl border bg-white p-4 text-left transition ${selected ? 'border-2 border-[#1d4d41] bg-[#f3f7f4]' : 'border-[#e3e5dc] hover:border-[#c4d3c8]'}`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e6f0e9] text-[#1d4d41]"><Icon size={21} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.label}</span>
                </span>
                {selected && <Check size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-[#1d4d41]" />}
              </button>
            )
          })}
        </div>
      </section>

      {needsInstitution && (
        <section aria-labelledby="instituicao-titulo">
          <h2 id="instituicao-titulo" className="text-base font-semibold">A que instituição te candidatas?</h2>
          {institutions.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-[#d5dacd] bg-white p-5 text-sm leading-6 text-[#68736a]">Ainda não há instituições disponíveis. Volta mais tarde ou escolhe a 10ª ou a 12ª classe.</p>
          ) : (
            <div role="radiogroup" aria-labelledby="instituicao-titulo" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {institutions.map((item) => {
                const selected = institutionId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setInstitutionId(item.id)}
                    className={`flex items-center gap-3 rounded-3xl border bg-white p-4 text-left transition ${selected ? 'border-2 border-[#1d4d41] bg-[#f3f7f4]' : 'border-[#e3e5dc] hover:border-[#c4d3c8]'}`}
                  >
                    <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e3e5dc] bg-[#f3f4ef] text-xs font-bold text-[#1d4d41]">
                      {item.logoUrl ? <img src={item.logoUrl} alt="" className="size-full object-contain" /> : item.shortName}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold">{item.shortName}{item.soon && <span className="rounded-full bg-[#f4eddb] px-2 py-0.5 text-[10px] font-semibold text-[#805f19]">Em breve</span>}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#737c75]">{item.name}</span>
                      {item.description && <span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#8a918a]">{bold(item.description)}</span>}
                    </span>
                    {selected ? <Check size={18} aria-hidden="true" className="shrink-0 text-[#1d4d41]" /> : <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-[#9aa49c]" />}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1d4d41] text-sm font-semibold text-white shadow-sm hover:bg-[#163e34] disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit sm:px-10"
      >
        {pending ? <><Spinner />A guardar…</> : 'Guardar percurso'}
      </button>
    </div>
  )
}
