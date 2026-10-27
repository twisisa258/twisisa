import { pool } from '@/lib/db'

export type SubjectScope = { key: string; label: string }

export type SubjectRow = {
  id: string
  name: string
  active: boolean
  scopes: SubjectScope[]
  materialCount: number
  topicCount: number
}

// Âmbito: '10', '12' ou 'inst:<id da instituição>'.
export async function listSubjects(): Promise<SubjectRow[]> {
  const result = await pool.query(`
    SELECT s.id, s.name, s.active,
      (SELECT count(*)::int FROM academic_materials m WHERE m.subject_id = s.id) AS material_count,
      (SELECT count(*)::int FROM topics t WHERE t.subject_id = s.id) AS topic_count,
      COALESCE((
        SELECT json_agg(json_build_object('track', c.track, 'institutionId', c.institution_id, 'shortName', i.short_name)
                        ORDER BY c.track NULLS LAST, i.sort_order, i.short_name)
        FROM subject_scopes c LEFT JOIN institutions i ON i.id = c.institution_id
        WHERE c.subject_id = s.id
      ), '[]'::json) AS scopes
    FROM library_subjects s
    ORDER BY s.name
  `)
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    active: row.active,
    materialCount: row.material_count,
    topicCount: row.topic_count,
    scopes: (row.scopes as { track: string | null; institutionId: string | null; shortName: string | null }[]).map((scope) =>
      scope.track
        ? { key: scope.track, label: `${scope.track}ª` }
        : { key: `inst:${scope.institutionId}`, label: scope.shortName ?? '?' },
    ),
  }))
}
