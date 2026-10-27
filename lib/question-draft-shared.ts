// Parte partilhada (servidor e browser) dos «rascunhos em curso» do editor de questões.
// Sem imports: serve de contrato entre o formulário, a rota de guardamento e a base de dados.

export type DraftPayload = {
  step: 0 | 1 | 2
  statement: string
  explanation: string
  options: { body: string; fixed: boolean }[]
  correct: number | null
  track: string
  institutionId: string
  subjectId: string
  topicId: string
  variant: string
  difficulty: string
  origin: string
  answerSource: string
  originLabel: string
  year: string
}

// Tem de coincidir com o CHECK da tabela question_drafts.
export const DRAFT_ID = /^qd-[0-9a-zA-Z-]{8,64}$/

export function newDraftId() {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  return `qd-${random}`
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '')

/** Aceita qualquer coisa e devolve sempre um rascunho bem formado, com os mesmos limites do formulário. */
export function sanitizeDraft(input: unknown): DraftPayload {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const options = (Array.isArray(o.options) ? o.options.slice(0, 5) : []).map((item) => {
    const r = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    return { body: text(r.body, 2000), fixed: r.fixed === true }
  })
  const correct = typeof o.correct === 'number' && Number.isInteger(o.correct) && o.correct >= 0 && o.correct < options.length ? o.correct : null
  return {
    step: o.step === 1 || o.step === 2 ? o.step : 0,
    statement: text(o.statement, 12000),
    explanation: text(o.explanation, 4000),
    options,
    correct,
    track: text(o.track, 20),
    institutionId: text(o.institutionId, 120),
    subjectId: text(o.subjectId, 120),
    topicId: text(o.topicId, 120),
    variant: text(o.variant, 60),
    difficulty: text(o.difficulty, 20),
    origin: text(o.origin, 20),
    answerSource: text(o.answerSource, 20),
    originLabel: text(o.originLabel, 160),
    year: text(o.year, 4),
  }
}

/** Sem texto nenhum (enunciado, opções, explicação, exame): não há nada para guardar. */
export function isDraftEmpty(draft: DraftPayload) {
  return !draft.statement.trim() && !draft.explanation.trim() && !draft.originLabel.trim() && draft.options.every((option) => !option.body.trim())
}
