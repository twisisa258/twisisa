'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { FeedbackForm } from '@/components/feedback-form'
import { SelectField } from '@/components/ui/select-field'
import { MathText } from '@/lib/math-text'
import type { ActionResult } from '@/lib/action-result'
import { newDraftId, type DraftPayload } from '@/lib/question-draft-shared'

export type EditorSubject = { id: string; name: string; scopes: string[] }
export type EditorTopic = { id: string; name: string; subjectId: string }
export type EditorVariant = { name: string; subjectId: string; active: boolean }
export type Choice = { value: string; label: string }
export type EditorValue = {
  id: string
  status: 'rascunho' | 'publicada' | 'arquivada'
  statement: string
  explanation: string
  options: { body: string; isCorrect: boolean; isFixed: boolean }[]
  track: string
  institutionId: string
  subjectId: string
  topicId: string
  difficulty: string
  origin: string
  answerSource: string
  originLabel: string
  year: string
  variant?: string
}

const field = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'
const STEPS = ['Enunciado', 'Opções', 'Classificação']
const LETTERS = ['A', 'B', 'C', 'D', 'E']
const TRACKS: Choice[] = [
  { value: '10', label: '10ª classe' },
  { value: '12', label: '12ª classe' },
  { value: 'admissao', label: 'Admissão ao ensino superior' },
]

type Draft = { key: number; body: string; fixed: boolean }
type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

// Um trabalho por concluir (guardado automaticamente) volta a ser um valor de editor.
function valueFromDraft(draft: DraftPayload): EditorValue {
  return {
    id: '',
    status: 'rascunho',
    statement: draft.statement,
    explanation: draft.explanation,
    options: draft.options.map((option, index) => ({ body: option.body, isCorrect: draft.correct === index, isFixed: option.fixed })),
    track: draft.track,
    institutionId: draft.institutionId,
    subjectId: draft.subjectId,
    topicId: draft.topicId,
    variant: draft.variant,
    difficulty: draft.difficulty || 'media',
    origin: draft.origin || 'admin',
    answerSource: draft.answerSource || 'confirmada',
    originLabel: draft.originLabel,
    year: draft.year,
  }
}

const AUTOSAVE_URL = '/admin/questoes/rascunho'

// Editor em 3 passos (Enunciado → Opções → Classificação). Todos os campos pertencem ao mesmo formulário; só um passo se vê de cada vez.
// Ao CRIAR uma questão, o que vai sendo escrito é guardado automaticamente (mesmo incompleto) e aparece em «Por concluir»;
// `draft` é o trabalho retomado de lá. Ao editar uma questão que já existe não há guardamento automático (já está guardada).
export function QuestionForm({
  action,
  subjects,
  topics,
  variants,
  institutions,
  years,
  difficulties,
  origins,
  answerSources,
  editing,
  draft = null,
}: {
  action: (formData: FormData) => Promise<ActionResult>
  subjects: EditorSubject[]
  topics: EditorTopic[]
  variants: EditorVariant[]
  institutions: Choice[]
  years: Choice[]
  difficulties: Choice[]
  origins: Choice[]
  answerSources: Choice[]
  editing: EditorValue | null
  draft?: { id: string; payload: DraftPayload } | null
}) {
  const base = editing ?? (draft ? valueFromDraft(draft.payload) : null)
  const isNew = !editing
  const [draftId] = useState(() => draft?.id ?? newDraftId())
  const [step, setStep] = useState<number>(draft?.payload.step ?? 0)
  const [preview, setPreview] = useState(false)
  const [statement, setStatement] = useState(base?.statement ?? '')
  const [explanation, setExplanation] = useState(base?.explanation ?? '')
  const [options, setOptions] = useState<Draft[]>(
    (base?.options.length ? base.options : [{ body: '', isFixed: false }, { body: '', isFixed: false }]).map((option, key) => ({ key, body: option.body, fixed: option.isFixed })),
  )
  const [nextKey, setNextKey] = useState(10)
  const [correct, setCorrect] = useState<number | null>(base?.options.some((o) => o.isCorrect) ? base.options.findIndex((o) => o.isCorrect) : null)
  const [track, setTrack] = useState(base?.track ?? '')
  const [institutionId, setInstitutionId] = useState(base?.institutionId ?? '')
  const [subjectId, setSubjectId] = useState(base?.subjectId ?? '')
  const [answerSource, setAnswerSource] = useState(base?.answerSource ?? 'confirmada')
  const [topicId, setTopicId] = useState(base?.topicId ?? '')
  const [difficulty, setDifficulty] = useState(base?.difficulty ?? 'media')
  const [origin, setOrigin] = useState(base?.origin ?? 'admin')
  const [year, setYear] = useState(base?.year ?? '')
  const [originLabel, setOriginLabel] = useState(base?.originLabel ?? '')
  const [variant, setVariant] = useState(base?.variant ?? '')
  const [error, setError] = useState('')
  const intentRef = useRef<HTMLInputElement>(null)

  // ---------- Guardamento automático (só ao criar) ----------
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const payload: DraftPayload = {
    step: step === 1 || step === 2 ? step : 0,
    statement,
    explanation,
    options: options.map((option) => ({ body: option.body, fixed: option.fixed })),
    correct,
    track,
    institutionId,
    subjectId,
    topicId,
    variant: variants.some((item) => item.subjectId === subjectId) ? variant : '',
    difficulty,
    origin,
    answerSource,
    originLabel,
    year,
  }
  const payloadJson = JSON.stringify(payload)
  const hasContent = !!(statement.trim() || explanation.trim() || originLabel.trim() || options.some((option) => option.body.trim()))
  const latest = useRef({ json: payloadJson, hasContent })
  useEffect(() => {
    latest.current = { json: payloadJson, hasContent }
  })
  const lastSent = useRef(draft ? JSON.stringify(draft.payload) : '')
  const sentOnce = useRef(!!draft)
  const inFlight = useRef(false)
  const again = useRef(false)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const send = useCallback(
    async (keepalive = false) => {
      const { json, hasContent: filledNow } = latest.current
      if (json === lastSent.current) return
      if (!sentOnce.current && !filledNow) return // nada escrito e nada guardado: não há o que guardar
      if (inFlight.current) {
        again.current = true
        return
      }
      inFlight.current = true
      setSaveState('saving')
      try {
        const response = await fetch(AUTOSAVE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draftId, payload: JSON.parse(json) }),
          credentials: 'same-origin',
          keepalive,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        lastSent.current = json
        sentOnce.current = true
        setSaveState('saved')
      } catch {
        setSaveState('failed')
        // Tenta outra vez daqui a pouco, sem esperar por nova edição.
        if (retryTimer.current) clearTimeout(retryTimer.current)
        retryTimer.current = setTimeout(() => void send(), 8000)
      } finally {
        inFlight.current = false
        if (again.current) {
          again.current = false
          void send()
        }
      }
    },
    [draftId],
  )

  // Depois de uma pausa na escrita (ou de mudar de passo/escolha), guarda.
  useEffect(() => {
    if (!isNew) return
    const timer = setTimeout(() => void send(), 1200)
    return () => clearTimeout(timer)
  }, [isNew, payloadJson, send])

  // Ao esconder o separador, sair da página ou fechar o modal: guarda já o que falta.
  useEffect(() => {
    if (!isNew) return
    const flush = () => void send(true)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      if (retryTimer.current) clearTimeout(retryTimer.current)
      flush()
    }
  }, [isNew, send])

  const scopeKey = track === 'admissao' ? (institutionId ? `inst:${institutionId}` : '') : track
  const subjectOptions = subjects.filter((subject) => scopeKey && subject.scopes.includes(scopeKey))
  const topicOptions = topics.filter((topic) => topic.subjectId === subjectId)
  // Variantes da disciplina escolhida (as arquivadas só aparecem se a questão já as usa).
  const variantOptions = variants.filter((item) => item.subjectId === subjectId && (item.active || item.name === base?.variant))
  const filled = options.filter((option) => option.body.trim())

  function problemBefore(target: number) {
    if (target >= 1 && statement.trim().length < 3) return 'Escreve o enunciado antes de continuar.'
    if (target >= 2) {
      if (filled.length < 2) return 'Escreve pelo menos duas opções.'
      if (correct === null || !options[correct]?.body.trim()) return 'Marca qual é a opção correta.'
    }
    return ''
  }

  function go(target: number) {
    if (target > step) {
      const problem = problemBefore(target)
      if (problem) return setError(problem)
    }
    setError('')
    setStep(target)
  }

  function removeOption(index: number) {
    setOptions((current) => current.filter((_, i) => i !== index))
    setCorrect((current) => (current === null || current === index ? null : current > index ? current - 1 : current))
  }

  const setIntent = (value: string) => {
    if (intentRef.current) intentRef.current.value = value
  }

  const button = 'inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold'
  const ghost = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#dfe3d9] px-4 py-3 text-sm font-semibold text-[#1d4d41] hover:bg-[#f1f4ef]'
  const originChoices = editing?.origin === 'ia' ? [...origins, { value: 'ia', label: 'Criada pela IA' }].filter((c, i, all) => all.findIndex((x) => x.value === c.value) === i) : origins.filter((c) => c.value !== 'ia')
  const sourceChoices = answerSources.filter((c) => c.value !== 'sugestao' || editing?.answerSource === 'sugestao')

  return (
    <FeedbackForm action={action} successMessage="Guardado." errorMessage="Não foi possível guardar a questão. Tenta novamente." className="grid gap-5">
      {editing && <input type="hidden" name="id" value={editing.id} />}
      {isNew && <input type="hidden" name="draftId" value={draftId} />}
      <input ref={intentRef} type="hidden" name="intent" defaultValue="draft" />

      <div className="flex items-end gap-3">
        <ol aria-label="Passos" className="grid min-w-0 flex-1 grid-cols-3 gap-2">
          {STEPS.map((label, index) => (
            <li key={label}>
              <button type="button" onClick={() => go(index)} aria-current={index === step ? 'step' : undefined} className="block w-full text-left">
                <span className={`block h-1.5 rounded-full ${index <= step ? 'bg-[#1d4d41]' : 'bg-[#e3e5dc]'}`} />
                <span className={`mt-1.5 block truncate text-xs font-semibold ${index === step ? 'text-[#1d4d41]' : 'text-[#9aa39c]'}`}>{index + 1}. {label}</span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setPreview((value) => !value)} aria-pressed={preview} aria-label={preview ? 'Esconder a pré-visualização' : 'Pré-visualizar como aluno'} title="Pré-visualizar como aluno" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#dfe3d9] text-[#1d4d41] hover:bg-[#f1f4ef]">
          {preview ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>

      {preview && (
        <div className="grid gap-3 rounded-2xl border border-[#e3e5dc] bg-[#fafbf8] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9aa39c]">Como o aluno vê</p>
          {statement.trim() ? <MathText text={statement} className="text-[15px] leading-7" /> : <p className="text-sm text-[#9aa39c]">Ainda sem enunciado.</p>}
          <ul className="grid gap-2">
            {filled.map((option, index) => (
              <li key={option.key} className="flex items-start gap-3 rounded-xl border border-[#e3e5dc] bg-white px-3 py-2.5 text-sm">
                <span className="font-semibold text-[#1d4d41]">{LETTERS[index]}</span>
                <MathText text={option.body} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Enunciado */}
      <div className={step === 0 ? 'grid gap-4' : 'hidden'}>
        <label className="text-sm font-medium">Enunciado *
          <textarea name="statement" rows={7} maxLength={12000} value={statement} onChange={(event) => setStatement(event.target.value)} className={field} placeholder="Escreve a pergunta. Fórmulas entre cifrões: $x^2 + 1$" />
        </label>
        <p className="-mt-2 text-xs text-[#737c75]">Fórmulas: <code>$x^2$</code> na linha, <code>$$\frac{'{a}'}{'{b}'}$$</code> em bloco. Para um cifrão normal escreve <code>\$</code>.</p>
        {statement.trim() && (
          <div className="rounded-2xl border border-[#e3e5dc] bg-[#fafbf8] p-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9aa39c]">Pré-visualização</p>
            <MathText text={statement} className="text-[15px] leading-7" />
          </div>
        )}
      </div>

      {/* 2. Opções */}
      <div className={step === 1 ? 'grid gap-4' : 'hidden'}>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">Opções (marca a correta) *</legend>
          {options.map((option, index) => (
            <div key={option.key} className="rounded-2xl border border-[#e3e5dc] p-3">
              <div className="flex items-center gap-3">
                <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[#1d4d41]">
                  <input type="radio" name="correct" value={index} checked={correct === index} onChange={() => setCorrect(index)} className="size-4 accent-[#1d4d41]" />
                  {LETTERS[index]}
                </label>
                <textarea
                  name="option"
                  rows={2}
                  maxLength={2000}
                  value={option.body}
                  onChange={(event) => setOptions((current) => current.map((item, i) => (i === index ? { ...item, body: event.target.value } : item)))}
                  aria-label={`Opção ${LETTERS[index]}`}
                  className="min-w-0 flex-1 rounded-xl border border-[#dfe3d9] bg-white px-3 py-2 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(index)} aria-label={`Remover opção ${LETTERS[index]}`} className="flex size-9 shrink-0 items-center justify-center rounded-full text-[#9a4b43] hover:bg-[#fbeceb]">
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                )}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-[#737c75]">
                <input type="checkbox" name="fixed" value={index} checked={option.fixed} onChange={(event) => setOptions((current) => current.map((item, i) => (i === index ? { ...item, fixed: event.target.checked } : item)))} className="size-3.5 accent-[#1d4d41]" />
                Posição fixa (não embaralhar), ex.: «Nenhuma das anteriores»
              </label>
              {option.body.includes('$') && <p className="mt-2 border-t border-[#edf0e9] pt-2 text-sm"><MathText text={option.body} /></p>}
            </div>
          ))}
          {options.length < 5 && (
            <button
              type="button"
              onClick={() => { setOptions((current) => [...current, { key: nextKey, body: '', fixed: false }]); setNextKey((value) => value + 1) }}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#c9d1c7] text-sm font-semibold text-[#1d4d41] hover:bg-[#f1f4ef]"
            >
              <Plus size={16} aria-hidden="true" /> Adicionar opção
            </button>
          )}
        </fieldset>
        <div className="text-sm font-medium">
          <span>Origem da resposta</span>
          <SelectField name="answerSource" label="Origem da resposta" triggerClassName={field} defaultValue={base?.answerSource ?? 'confirmada'} onValueChange={setAnswerSource} options={sourceChoices} />
          {answerSource === 'sugestao' && <p className="mt-1.5 text-xs font-normal text-[#805f19]">Verifica a opção marcada e muda para «Confirmada por mim» para poder publicar.</p>}
        </div>
        <label className="text-sm font-medium">Explicação (aparece depois de responder)
          <textarea name="explanation" rows={3} maxLength={4000} value={explanation} onChange={(event) => setExplanation(event.target.value)} className={field} placeholder="Porque é que esta é a resposta certa (opcional)" />
        </label>
      </div>

      {/* 3. Classificação */}
      <div className={step === 2 ? 'grid gap-4' : 'hidden'}>
        <div className="text-sm font-medium">
          <span>Para quem *</span>
          <SelectField name="track" label="Para quem" placeholder="Classe ou admissão" triggerClassName={field} defaultValue={track} onValueChange={setTrack} options={TRACKS} />
        </div>
        {track === 'admissao' && (
          <div className="text-sm font-medium">
            <span>Instituição *</span>
            <SelectField name="institutionId" label="Instituição" placeholder="Seleccionar instituição" triggerClassName={field} defaultValue={institutionId} onValueChange={setInstitutionId} options={institutions} />
          </div>
        )}
        <div className="text-sm font-medium">
          <span>Disciplina *</span>
          <SelectField
            key={`subject-${scopeKey}`}
            name="subjectId"
            label="Disciplina"
            placeholder={scopeKey ? 'Seleccionar disciplina' : track === 'admissao' ? 'Escolhe primeiro a instituição' : 'Escolhe primeiro para quem é'}
            triggerClassName={field}
            defaultValue={subjectOptions.some((subject) => subject.id === subjectId) ? subjectId : ''}
            onValueChange={setSubjectId}
            options={subjectOptions.map((subject) => ({ value: subject.id, label: subject.name }))}
          />
        </div>
        <div className="text-sm font-medium">
          <span>Tema</span>
          <SelectField
            key={`topic-${subjectId}`}
            name="topicId"
            label="Tema"
            triggerClassName={field}
            defaultValue={topicOptions.some((topic) => topic.id === base?.topicId) ? (base?.topicId ?? '') : ''}
            onValueChange={setTopicId}
            options={[{ value: '', label: 'Sem tema (questão auxiliar)' }, ...topicOptions.map((topic) => ({ value: topic.id, label: topic.name }))]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="text-sm font-medium"><span>Dificuldade</span><SelectField name="difficulty" label="Dificuldade" triggerClassName={field} defaultValue={base?.difficulty ?? 'media'} onValueChange={setDifficulty} options={difficulties} /></div>
          <div className="text-sm font-medium"><span>Origem da questão</span><SelectField name="origin" label="Origem da questão" triggerClassName={field} defaultValue={base?.origin ?? 'admin'} onValueChange={setOrigin} options={originChoices} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="text-sm font-medium"><span>Ano</span><SelectField name="year" label="Ano" triggerClassName={field} defaultValue={base?.year ?? ''} onValueChange={setYear} options={years} /></div>
          <label className="text-sm font-medium">Exame de origem<input name="originLabel" maxLength={160} value={originLabel} onChange={(event) => setOriginLabel(event.target.value)} className={field} placeholder="Ex.: Exame UEM 2024" /></label>
        </div>
        {variantOptions.length > 0 && (
          <div className="text-sm font-medium">
            <span>Variante</span>
            <SelectField
              key={`variant-${subjectId}`}
              name="variant"
              label="Variante"
              placeholder="Escolher variante"
              triggerClassName={field}
              defaultValue={variantOptions.some((item) => item.name === variant) ? variant : ''}
              onValueChange={setVariant}
              options={[{ value: '', label: 'Sem variante (só completa misturas)' }, ...variantOptions.map((item) => ({ value: item.name, label: item.name }))]}
            />
            <span className="mt-1 block text-xs font-normal text-[#737c75]">Esta disciplina tem variantes: para publicar, a questão tem de ter uma. Sem variante, nunca aparece quando o aluno escolhe uma variante.</span>
          </div>
        )}
      </div>

      {isNew && saveState !== 'idle' && (
        <p aria-live="polite" className={`-mb-2 text-xs ${saveState === 'failed' ? 'text-[#9a4b43]' : 'text-[#737c75]'}`}>
          {saveState === 'saving' ? 'A guardar…' : saveState === 'saved' ? 'Progresso guardado automaticamente.' : 'Não foi possível guardar automaticamente. Vou tentar de novo.'}
        </p>
      )}

      {error && <p role="alert" className="rounded-xl bg-[#fbeceb] px-3 py-2 text-sm text-[#9a4b43]">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {step > 0 && <button type="button" onClick={() => go(step - 1)} className={ghost}><ArrowLeft size={16} aria-hidden="true" /> Anterior</button>}
        {step < 2 ? (
          <button type="button" onClick={() => go(step + 1)} className={`${button} bg-[#1d4d41] text-white hover:bg-[#163e34]`}>Seguinte <ArrowRight size={16} aria-hidden="true" className="ml-1.5" /></button>
        ) : editing && editing.status !== 'rascunho' ? (
          <button type="submit" onClick={() => setIntent('keep')} className={`${button} bg-[#1d4d41] text-white hover:bg-[#163e34]`}>
            <Check size={16} aria-hidden="true" className="mr-1.5" /> Guardar alterações
          </button>
        ) : (
          <>
            <button type="submit" onClick={() => setIntent('draft')} className={`${button} border border-[#dfe3d9] text-[#1d4d41] hover:bg-[#f1f4ef]`}>Guardar rascunho</button>
            <button type="submit" onClick={() => setIntent('publish')} className={`${button} bg-[#1d4d41] text-white hover:bg-[#163e34]`}>Publicar</button>
          </>
        )}
      </div>
    </FeedbackForm>
  )
}
