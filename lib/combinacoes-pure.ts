// Combinações de provas de um curso. Puro (sem base de dados): serve ao servidor e aos testes.

export type ComboPaper = { paperId: string; subjectId: string; subjectName: string; variant: string }
export type ComboOptionRow = { optionId: string; sortOrder: number; papers: ComboPaper[] }
export type Combo = { optionId: string; optionIds: string[]; label: string; subjectIds: string[] }

export function paperName(subject: string, variant: string) {
  if (variant === 'pratica') return `${subject} (prova prática)`
  if (variant === 'escrita') return `${subject} (prova escrita)`
  return variant ? `${subject}-${variant}` : subject
}

/** Opções com as mesmas provas (ex.: laboral e pós-laboral) são UMA combinação. */
export function uniqueCombos(rows: ComboOptionRow[]): Combo[] {
  const byKey = new Map<string, Combo>()
  const ordered = [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.optionId.localeCompare(b.optionId))
  for (const row of ordered) {
    if (row.papers.length === 0) continue
    const key = row.papers.map((p) => p.paperId).sort().join('|')
    const found = byKey.get(key)
    if (found) {
      found.optionIds.push(row.optionId)
      continue
    }
    const papers = [...row.papers].sort((a, b) => paperName(a.subjectName, a.variant).localeCompare(paperName(b.subjectName, b.variant), 'pt'))
    byKey.set(key, {
      optionId: row.optionId,
      optionIds: [row.optionId],
      label: papers.map((p) => paperName(p.subjectName, p.variant)).join(' + '),
      subjectIds: [...new Set(papers.map((p) => p.subjectId))],
    })
  }
  return [...byKey.values()]
}

/** Uma só combinação: fica escolhida sem perguntar. Várias: só vale a que o aluno escolheu. */
export function resolveCombo(combos: Combo[], chosen: string | null): { optionId: string | null; needsChoice: boolean } {
  if (combos.length === 0) return { optionId: null, needsChoice: false }
  if (combos.length === 1) return { optionId: combos[0].optionId, needsChoice: false }
  const found = chosen ? combos.find((combo) => combo.optionIds.includes(chosen)) : undefined
  return found ? { optionId: found.optionId, needsChoice: false } : { optionId: null, needsChoice: true }
}

export type Gate = { need: 'curso' | 'combinacao' | null; courseId: string | null; auto: string | null }

/**
 * Quem se candidata (admissão, com instituição) tem de ter curso, e combinação de provas quando o curso tem mais de uma,
 * antes de começar qualquer prática. Uma só combinação fica escolhida sozinha (`auto`). Instituição sem cursos não bloqueia.
 */
export function decideGate(input: { track: string | null; institutionId: string | null; courseId: string | null; optionOk: boolean; institutionHasCourses: boolean; combos: Combo[] }): Gate {
  const free: Gate = { need: null, courseId: null, auto: null }
  if (input.track !== 'admissao' || !input.institutionId) return free
  if (!input.courseId) return input.institutionHasCourses ? { need: 'curso', courseId: null, auto: null } : free
  if (input.optionOk) return free
  if (input.combos.length === 0) return free
  if (input.combos.length === 1) return { need: null, courseId: input.courseId, auto: input.combos[0].optionId }
  return { need: 'combinacao', courseId: input.courseId, auto: null }
}
