import { pool } from '@/lib/db'

export type TopicRow = { id: string; name: string; subjectId: string; subjectName: string; active: boolean; sortOrder: number }

export async function listTopics(): Promise<TopicRow[]> {
  const result = await pool.query(`
    SELECT t.id, t.name, t.subject_id, s.name AS subject_name, t.active, t.sort_order
    FROM topics t JOIN library_subjects s ON s.id = t.subject_id
    ORDER BY s.name, t.sort_order, t.name
  `)
  return result.rows.map((r) => ({ id: r.id, name: r.name, subjectId: r.subject_id, subjectName: r.subject_name, active: r.active, sortOrder: r.sort_order }))
}

export type ClassRow = { id: string; name: string; description: string | null; active: boolean; sortOrder: number; inUse: number }

export async function listCategories(): Promise<ClassRow[]> {
  const result = await pool.query(`
    SELECT c.id, c.name, c.description, c.active, c.sort_order,
      (SELECT count(*)::int FROM academic_materials m WHERE m.category_id = c.id) AS in_use
    FROM library_categories c ORDER BY c.sort_order, c.name
  `)
  return result.rows.map((r) => ({ id: r.id, name: r.name, description: r.description, active: r.active, sortOrder: r.sort_order, inUse: r.in_use }))
}

export async function listLevels(): Promise<ClassRow[]> {
  const result = await pool.query(`
    SELECT l.id, l.name, l.active, l.sort_order,
      (SELECT count(*)::int FROM academic_materials m WHERE m.level_id = l.id) AS in_use
    FROM library_levels l ORDER BY l.sort_order, l.name
  `)
  return result.rows.map((r) => ({ id: r.id, name: r.name, description: null, active: r.active, sortOrder: r.sort_order, inUse: r.in_use }))
}
