import { pool } from '@/lib/db'
import { posicaoDisciplina } from '@/lib/regras'

export type Painel = {
  questoes: { publicadas: number; rascunhos: number; arquivadas: number; emRevisao: number }
  reportes: number
  contas: { total: number; novos7d: number }
  disciplinas: { id: string; name: string; publicadas: number; rascunhos: number; revisao: number; temas: number }[]
  instituicoes: { id: string; label: string; publicadas: number; rascunhos: number }[]
  preparacao: { instituicoes: number; disciplinas: number; temas: number; variantes: number }
}

// Tudo o que o painel do admin mostra, numa só ida à base de dados.
export async function getPainel(): Promise<Painel> {
  const [q, rep, users, disc, inst, prep] = await Promise.all([
    pool.query(
      `SELECT count(*) FILTER (WHERE status = 'publicada')::int AS publicadas,
              count(*) FILTER (WHERE status = 'rascunho')::int AS rascunhos,
              count(*) FILTER (WHERE status = 'arquivada')::int AS arquivadas,
              count(*) FILTER (WHERE status <> 'arquivada' AND cardinality(review_reasons) > 0)::int AS em_revisao
       FROM questions`,
    ),
    pool.query("SELECT count(*)::int AS total FROM question_reports WHERE status = 'aberto'"),
    pool.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE "createdAt" > now() - interval '7 days')::int AS novos FROM "user"`),
    pool.query(
      `SELECT s.id, s.name,
              count(q.id) FILTER (WHERE q.status = 'publicada')::int AS publicadas,
              count(q.id) FILTER (WHERE q.status = 'rascunho')::int AS rascunhos,
              count(q.id) FILTER (WHERE q.status <> 'arquivada' AND cardinality(q.review_reasons) > 0)::int AS revisao,
              (SELECT count(*)::int FROM topics t WHERE t.subject_id = s.id AND t.active) AS temas
       FROM library_subjects s LEFT JOIN questions q ON q.subject_id = s.id
       WHERE s.core GROUP BY s.id, s.name`,
    ),
    pool.query(
      `SELECT i.id, i.short_name,
              count(q.id) FILTER (WHERE q.status = 'publicada')::int AS publicadas,
              count(q.id) FILTER (WHERE q.status = 'rascunho')::int AS rascunhos
       FROM institutions i LEFT JOIN questions q ON q.institution_id = i.id
       WHERE i.active GROUP BY i.id, i.short_name, i.sort_order ORDER BY i.sort_order, i.short_name`,
    ),
    pool.query(
      `SELECT (SELECT count(*)::int FROM institutions WHERE active) AS instituicoes,
              (SELECT count(*)::int FROM library_subjects WHERE core AND active) AS disciplinas,
              (SELECT count(*)::int FROM topics t JOIN library_subjects s ON s.id = t.subject_id WHERE s.core AND t.active) AS temas,
              (SELECT count(*)::int FROM subject_variants v JOIN library_subjects s ON s.id = v.subject_id WHERE s.core AND v.active) AS variantes`,
    ),
  ])
  const a = q.rows[0]
  const p = prep.rows[0]
  return {
    questoes: { publicadas: a.publicadas, rascunhos: a.rascunhos, arquivadas: a.arquivadas, emRevisao: a.em_revisao },
    reportes: rep.rows[0].total,
    contas: { total: users.rows[0].total, novos7d: users.rows[0].novos },
    disciplinas: disc.rows
      .map((row) => ({ id: row.id as string, name: row.name as string, publicadas: row.publicadas as number, rascunhos: row.rascunhos as number, revisao: row.revisao as number, temas: row.temas as number }))
      .sort((x, y) => posicaoDisciplina(x.name) - posicaoDisciplina(y.name)),
    instituicoes: inst.rows.map((row) => ({ id: row.id as string, label: row.short_name as string, publicadas: row.publicadas as number, rascunhos: row.rascunhos as number })),
    preparacao: { instituicoes: p.instituicoes, disciplinas: p.disciplinas, temas: p.temas, variantes: p.variantes },
  }
}
