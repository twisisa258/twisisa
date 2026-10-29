'use client'

import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Check, Trash2 } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import type { ActionResult } from '@/lib/action-result'

type Status = 'rascunho' | 'publicada' | 'arquivada'
type RowState = 'pending' | 'revised' | null
type Confirm = { title: string; text: string; yes: string; no: string; danger?: boolean; run: () => void }

type Selection = {
  selecting: boolean
  selected: Record<string, boolean>
  toggle: (id: string, revised: boolean) => void
  busy: boolean
}

const SelectionContext = createContext<Selection | null>(null)

const btn = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40'
const btnSolid = `${btn} bg-[#1d4d41] text-white hover:bg-[#163e34]`
const btnLine = `${btn} border border-[#c9d7cd] bg-white text-[#1d4d41] hover:bg-[#f1f4ef]`
const btnGhost = `${btn} text-[#526057] hover:bg-[#eef0ea]`

// Faixa de revisão no topo da lista de questões.
//   Rascunhos: «Marcar como revistas» e, logo a seguir, «Publicar» (que pergunta «Já verificaste?» antes de publicar).
//   Publicadas e arquivadas: «Selecionar» para arquivar ou restaurar várias de uma vez.
// As caixas de seleção só existem no modo «Selecionar»; fora dele cada rascunho mostra apenas se já foi revisto.
export function QuestionBulkForm({
  status,
  q,
  rows,
  pending,
  revised,
  canManage,
  action,
  children,
}: {
  status: Status
  q: string
  rows: { id: string; revised: boolean }[]
  pending: number
  revised: number
  canManage: boolean
  action: (formData: FormData) => Promise<ActionResult>
  children: React.ReactNode
}) {
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const router = useRouter()
  const feedback = useFeedback()

  const ids = Object.keys(selected)
  const selRevised = ids.filter((id) => selected[id])
  const selPending = ids.filter((id) => !selected[id])
  const allChosen = rows.length > 0 && ids.length === rows.length
  const isDraft = status === 'rascunho'
  const total = pending + revised

  function toggle(id: string, isRevised: boolean) {
    setSelected((current) => {
      const next = { ...current }
      if (id in next) delete next[id]
      else next[id] = isRevised
      return next
    })
  }

  function toggleAll() {
    setSelected(allChosen ? {} : Object.fromEntries(rows.map((row) => [row.id, row.revised])))
  }

  function leave() {
    setSelecting(false)
    setSelected({})
  }

  async function run(mode: string, target: { ids: string[] } | { scope: 'por-rever' | 'revistas' }) {
    if (busy) return
    const data = new FormData()
    data.set('mode', mode)
    if ('ids' in target) target.ids.forEach((id) => data.append('id', id))
    else {
      data.set('scope', target.scope)
      data.set('q', q)
    }
    setBusy(true)
    try {
      const result = await action(data)
      if (result.ok) {
        feedback.success(result.message ?? 'Operação concluída.')
        leave()
      } else feedback.error(result.message)
      router.refresh()
    } catch {
      feedback.error('Não foi possível concluir a operação. Tenta novamente.')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  // O que cada botão atinge: a seleção, se existir; senão, todos os rascunhos (da pesquisa) por rever / revistos.
  const hasSelection = ids.length > 0
  const markCount = hasSelection ? selPending.length : pending
  const publishCount = hasSelection ? selRevised.length : revised
  const markTarget = hasSelection ? { ids: selPending } : { scope: 'por-rever' as const }
  const publishTarget = hasSelection ? { ids: selRevised } : { scope: 'revistas' as const }
  const noun = (n: number) => (n === 1 ? 'questão' : 'questões')

  function askPublish() {
    setConfirm({
      title: 'Já verificaste as questões?',
      text: `${publishCount} ${noun(publishCount)} ${publishCount === 1 ? 'vai ficar visível' : 'vão ficar visíveis'} para os alunos no Simulador, na Prática e no Modo rápido.`,
      yes: 'Sim, publicar',
      no: 'Não, voltar',
      run: () => run('publicada', publishTarget),
    })
  }

  function askArchive() {
    setConfirm({
      title: `Arquivar ${ids.length} ${noun(ids.length)}?`,
      text: 'Deixam de aparecer aos alunos. O histórico fica guardado e podes restaurá-las.',
      yes: 'Arquivar',
      no: 'Cancelar',
      run: () => run('arquivada', { ids }),
    })
  }

  function askDelete() {
    setConfirm({
      title: `Eliminar ${ids.length} ${ids.length === 1 ? 'rascunho' : 'rascunhos'}?`,
      text: 'Esta ação não pode ser desfeita.',
      yes: 'Eliminar',
      no: 'Cancelar',
      danger: true,
      run: () => run('eliminar', { ids }),
    })
  }

  const headline = hasSelection
    ? `${ids.length} ${ids.length === 1 ? 'selecionada' : 'selecionadas'}`
    : selecting
      ? 'Escolhe as questões'
      : pending > 0
        ? `${revised} de ${total} revistas`
        : 'Todas revistas, prontas a publicar'

  return (
    <SelectionContext.Provider value={{ selecting, selected, toggle, busy }}>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-[#edf0e9] bg-[#fafbf8] px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            {isDraft || selecting ? (
              <div className="min-w-[11rem] flex-1">
                <p className="text-sm font-semibold text-[#2f3a33]">{headline}</p>
                {isDraft && !selecting && total > 0 && (
                  <div role="progressbar" aria-label="Questões revistas" aria-valuemin={0} aria-valuemax={total} aria-valuenow={revised} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e6e9e1]">
                    <div className="h-full rounded-full bg-[#1d4d41] transition-[width] duration-300" style={{ width: `${Math.round((revised / total) * 100)}%` }} />
                  </div>
                )}
              </div>
            ) : (
              <p className="min-w-[11rem] flex-1 text-xs text-[#737c75]">Para arquivar ou restaurar várias de uma vez, usa «Selecionar».</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {selecting ? (
                <>
                  <button type="button" onClick={toggleAll} disabled={busy} className={btnGhost}>{allChosen ? 'Limpar' : 'Todas'}</button>
                  {isDraft && selPending.length > 0 && <button type="button" onClick={() => run('revista', markTarget)} disabled={busy} className={btnLine}><Check size={14} aria-hidden="true" /> Marcar {selPending.length} como {selPending.length === 1 ? 'revista' : 'revistas'}</button>}
                  {isDraft && selRevised.length > 0 && <button type="button" onClick={askPublish} disabled={busy} className={btnSolid}>Publicar {selRevised.length}</button>}
                  {status === 'publicada' && hasSelection && <button type="button" onClick={askArchive} disabled={busy} className={btnSolid}><Archive size={14} aria-hidden="true" /> Arquivar {ids.length}</button>}
                  {status === 'arquivada' && hasSelection && <button type="button" onClick={() => run('rascunho', { ids })} disabled={busy} className={btnSolid}><ArchiveRestore size={14} aria-hidden="true" /> Restaurar {ids.length}</button>}
                  {isDraft && canManage && hasSelection && <button type="button" onClick={askDelete} disabled={busy} className={`${btn} border border-[#efd8d8] bg-white text-[#9a3030] hover:bg-[#fbeeee]`}><Trash2 size={14} aria-hidden="true" /> Eliminar</button>}
                  <button type="button" onClick={leave} disabled={busy} className={btnGhost}>Cancelar</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setSelecting(true)} disabled={busy} className={btnGhost}>Selecionar</button>
                  {isDraft && pending > 0 && <button type="button" onClick={() => run('revista', markTarget)} disabled={busy} className={publishCount > 0 ? btnLine : btnSolid}><Check size={14} aria-hidden="true" /> {busy ? 'A marcar…' : q ? `Marcar ${pending} ${pending === 1 ? 'resultado' : 'resultados'} como ${pending === 1 ? 'revisto' : 'revistos'}` : `Marcar todas como revistas (${pending})`}</button>}
                  {isDraft && revised > 0 && <button type="button" onClick={askPublish} disabled={busy} className={btnSolid}>{q ? `Publicar ${revised} ${revised === 1 ? 'resultado' : 'resultados'}` : `Publicar revistas (${revised})`}</button>}
                </>
              )}
            </div>
          </div>
        </div>
        {children}
      </section>
      {confirm && <ConfirmDialog {...confirm} busy={busy} onClose={() => !busy && setConfirm(null)} />}
    </SelectionContext.Provider>
  )
}

// Linha de uma questão. Fora do modo «Selecionar» mostra o estado da revisão (círculo tracejado = por rever, verde = revista);
// dentro dele, uma caixa de seleção, e a linha toda passa a ser clicável.
export function SelectableRow({ id, label, state, menu, children }: { id: string; label: string; state: RowState; menu: React.ReactNode; children: React.ReactNode }) {
  const context = useContext(SelectionContext)
  if (!context) throw new Error('SelectableRow tem de estar dentro de <QuestionBulkForm>.')
  const { selecting, selected, toggle } = context
  const checked = id in selected
  const pick = () => toggle(id, state === 'revised')

  return (
    <li className={`-mx-4 flex items-center gap-3 px-4 py-3 transition-colors sm:-mx-5 sm:px-5 ${selecting && checked ? 'bg-[#f1f7f3]' : ''}`}>
      {selecting ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={`Selecionar questão: ${label}`}
          onClick={pick}
          className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${checked ? 'border-[#1d4d41] bg-[#1d4d41] text-white' : 'border-[#c4cbc2] bg-white'}`}
        >
          {checked && <Check size={14} aria-hidden="true" />}
        </button>
      ) : state === 'revised' ? (
        <span title="Revista" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1d4d41] text-white"><Check size={14} aria-hidden="true" /><span className="sr-only">Revista</span></span>
      ) : state === 'pending' ? (
        <span title="Por rever" className="size-6 shrink-0 rounded-full border-2 border-dashed border-[#d3b968] bg-[#faf5e6]"><span className="sr-only">Por rever</span></span>
      ) : null}
      <div className={`min-w-0 flex-1 ${selecting ? 'cursor-pointer' : ''}`} onClick={selecting ? pick : undefined}>{children}</div>
      {!selecting && menu}
    </li>
  )
}

function ConfirmDialog({ title, text, yes, no, danger, busy, run, onClose }: Confirm & { busy: boolean; onClose: () => void }) {
  const titleId = useId()
  const textId = useId()
  const noRef = useRef<HTMLButtonElement>(null)
  const yesRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  // Foco em «voltar» (a opção segura); Tab fica entre os dois botões; Esc fecha; o fundo não desloca.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    noRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current(); return }
      if (event.key !== 'Tab') return
      const first = noRef.current
      const last = yesRef.current
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = overflow
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={textId} className="w-full rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-sm sm:rounded-2xl sm:p-6">
        <h2 id={titleId} className="text-lg font-semibold leading-snug">{title}</h2>
        <p id={textId} className="mt-1.5 text-sm leading-6 text-[#526057]">{text}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={noRef} type="button" onClick={onClose} disabled={busy} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfe3d9] px-5 text-sm font-semibold text-[#2f3a33] hover:bg-[#f1f4ef] disabled:opacity-50">{no}</button>
          <button ref={yesRef} type="button" onClick={run} disabled={busy} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-60 ${danger ? 'bg-[#9a3030] hover:bg-[#7f2626]' : 'bg-[#1d4d41] hover:bg-[#163e34]'}`}>{busy ? 'A processar…' : yes}</button>
        </div>
      </div>
    </div>
  )
}
