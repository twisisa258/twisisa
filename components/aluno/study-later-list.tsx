'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Bookmark, Check } from 'lucide-react'
import { completeMark } from '@/app/aluno/simulador/ferramentas-actions'
import { startSession } from '@/app/aluno/simulador/actions'
import { MathText } from '@/lib/math-text'
import type { MarkItem } from '@/lib/kit'

function dayLabel(iso: string | null, due: boolean) {
  if (!iso) return 'Sem data'
  if (due) return 'Para hoje'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function StudyLaterList({ initial }: { initial: MarkItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function practise(item: MarkItem) {
    if (busy) return
    setBusy(item.id)
    setError(null)
    // Pratica o tema da questão (ou a disciplina, se a questão não tem tema).
    const res = await startSession({ mode: 'pratica', subjectId: item.subjectId, topicId: item.topicId }).catch(() => null)
    if (!res?.ok) {
      setBusy(null)
      return setError(res?.message ?? 'Sem ligação. Verifica a internet e tenta de novo.')
    }
    router.push(`/aluno/simulador/sessao/${res.data.id}`)
  }

  async function done(id: string) {
    if (busy) return
    setBusy(id)
    setError(null)
    const res = await completeMark({ id }).catch(() => null)
    setBusy(null)
    if (!res?.ok) return setError(res?.message ?? 'Sem ligação. Verifica a internet e tenta de novo.')
    setItems((list) => list.filter((item) => item.id !== id))
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-linha bg-white p-6">
        <p className="text-[15px] font-medium">Ainda não guardaste nenhuma questão</p>
        <p className="mt-1 text-sm text-texto-2">No Simulador, toca no botão de ferramentas e escolhe «Estudar depois». Ela aparece aqui, no dia que escolheres.</p>
        <Link href="/aluno/simulador" className="btn btn-primario mt-4">Ir ao Simulador</Link>
      </div>
    )
  }
  const dueCount = items.filter((i) => i.due).length
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl bg-erro-suave px-3 py-2 text-[13px] text-erro-texto">{error}</p>}
      <p className="text-sm text-texto-2">{dueCount > 0 ? (dueCount === 1 ? '1 para rever hoje' : `${dueCount} para rever hoje`) : 'Nada para hoje. Estas ficam para os próximos dias.'}</p>
      {items.map((item) => (
        <article key={item.id} className={`rounded-2xl border p-4 ${item.due ? 'border-assistente/40 bg-assistente-suave/50' : 'border-linha bg-white'}`}>
          <div className="flex items-center gap-2 text-xs">
            <span className={`chip ${item.due ? 'bg-assistente-suave text-assistente' : 'bg-conquista-suave text-texto'}`}><Bookmark size={12} aria-hidden />{dayLabel(item.remindOn, item.due)}</span>
            <span className="truncate text-texto-2">{item.subject}{item.topic ? ` · ${item.topic}` : ''}</span>
          </div>
          <p className="mt-2 line-clamp-3 text-[15px] leading-6"><MathText text={item.statement} /></p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy === item.id} onClick={() => void practise(item)} className="btn btn-secundario">{item.topic ? 'Praticar este tema' : 'Praticar a disciplina'}</button>
            <button type="button" disabled={busy === item.id} onClick={() => void done(item.id)} className="btn btn-terciario"><Check size={16} aria-hidden />Já revi</button>
          </div>
        </article>
      ))}
    </div>
  )
}
