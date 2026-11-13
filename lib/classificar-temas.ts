import { pool } from '@/lib/db'
import { askAi } from '@/lib/kit-ai'
import { logAdminAction } from '@/lib/admin-audit'
import { lerTema, pedidoClassificador, sistemaClassificador, type TemaOpcao } from '@/lib/classificar-temas-pure'

export type ResultadoTemas = { analisadas: number; classificadas: number; semTema: number; parou: 'limite' | 'ia' | null }

/**
 * O Jonas escolhe o tema das questões que não têm, entre os temas ativos da própria disciplina.
 * Nunca inventa temas, nunca mexe em questões que já têm tema, e na dúvida deixa «sem tema».
 * `ids` limita a certas questões (ex.: as que acabaram de ser importadas).
 */
export async function classificarTemas(options: { limite?: number; ids?: string[]; admin?: { id: string; email?: string } } = {}): Promise<ResultadoTemas> {
  const limite = Math.min(Math.max(options.limite ?? 20, 1), 60)
  const ids = options.ids?.length ? options.ids : null
  const found = await pool.query(
    `SELECT q.id, q.statement, q.subject_id, s.name AS subject_name
     FROM questions q JOIN library_subjects s ON s.id = q.subject_id
     WHERE q.topic_id IS NULL AND q.status <> 'arquivada' AND ($1::text[] IS NULL OR q.id = ANY($1::text[]))
     ORDER BY q.created_at DESC LIMIT $2`,
    [ids, limite],
  )
  const resultado: ResultadoTemas = { analisadas: 0, classificadas: 0, semTema: 0, parou: found.rowCount === limite ? 'limite' : null }
  const temasDe = new Map<string, TemaOpcao[]>()

  for (const q of found.rows) {
    if (!temasDe.has(q.subject_id)) {
      const temas = await pool.query('SELECT id, name FROM topics WHERE subject_id = $1 AND active = true ORDER BY name', [q.subject_id])
      temasDe.set(q.subject_id, temas.rows as TemaOpcao[])
    }
    const temas = temasDe.get(q.subject_id) ?? []
    if (!temas.length) continue
    resultado.analisadas += 1

    const options = await pool.query('SELECT body FROM question_options WHERE question_id = $1 ORDER BY position', [q.id])
    let tema: TemaOpcao | null = null
    try {
      const resposta = await askAi({
        system: sistemaClassificador(q.subject_name, temas),
        user: pedidoClassificador(q.statement, options.rows.map((row) => row.body ?? '')),
        maxTokens: 60,
        temperature: 0,
      })
      tema = lerTema(resposta, temas)
    } catch (error) {
      console.error('[TEMAS] Jonas indisponível', error)
      resultado.parou = 'ia'
      break
    }
    if (!tema) { resultado.semTema += 1; continue }

    // Só preenche se continuar sem tema (o admin pode ter escolhido um entretanto).
    const updated = await pool.query(
      `UPDATE questions SET topic_id = $2, review_reasons = COALESCE(question_review_reasons(id), '{}') WHERE id = $1 AND topic_id IS NULL RETURNING id`,
      [q.id, tema.id],
    )
    if (updated.rowCount) resultado.classificadas += 1
  }

  if (options.admin && resultado.classificadas > 0) {
    await logAdminAction(options.admin as Parameters<typeof logAdminAction>[0], 'question.topic_auto', 'question', null, { count: resultado.classificadas }, { notify: false })
  }
  return resultado
}

export function resumoTemas(r: ResultadoTemas): string {
  if (r.parou === 'ia' && r.classificadas === 0) return 'O Jonas não está disponível agora. Tenta mais tarde.'
  if (r.analisadas === 0) return 'Não há questões sem tema com temas disponíveis na disciplina.'
  const base = `${r.classificadas} ${r.classificadas === 1 ? 'questão ganhou tema' : 'questões ganharam tema'}${r.semTema ? `; ${r.semTema} ficam sem tema (o Jonas não teve certeza)` : ''}.`
  return r.parou === 'limite' ? `${base} Ainda há mais: carrega outra vez.` : base
}
