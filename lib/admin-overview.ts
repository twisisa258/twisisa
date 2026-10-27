import { pool } from '@/lib/db'
import { EXAM_MODULES } from '@/lib/exam-modules'
import { isVisibleToStudents, listInstitutions } from '@/lib/institutions'

// ---------- Separador «Actividade» (dados que mudam sempre) ----------

export type ActivityEntry = { id: string; title: string; subtitle: string; at: Date }

export type Activity = {
  pendingReports: number
  downloads7d: number
  newUsers7d: number
  totalUsers: number
  recent: ActivityEntry[]
}

const ENTITY: Record<string, { name: string; feminine: boolean }> = {
  institution: { name: 'Instituição', feminine: true },
  subject: { name: 'Disciplina', feminine: true },
  topic: { name: 'Tema', feminine: false },
  categoria: { name: 'Categoria', feminine: true },
  nivel: { name: 'Nível', feminine: false },
  module: { name: 'Módulo', feminine: false },
  material: { name: 'Material', feminine: false },
}

const VERB: Record<string, string> = {
  create: 'criad',
  update: 'alterad',
  delete: 'eliminad',
  activate: 'activad',
  archive: 'arquivad',
  hide: 'ocultad',
}

function describe(action: string, entity: string, entityId: string | null, detail: Record<string, unknown> | null) {
  const meta = ENTITY[entity]
  const verb = VERB[action.split('.')[1] ?? '']
  const title = meta && verb ? `${meta.name} ${verb}${meta.feminine ? 'a' : 'o'}` : action
  const name =
    (typeof detail?.name === 'string' && detail.name) ||
    (typeof detail?.shortName === 'string' && detail.shortName) ||
    (typeof detail?.title === 'string' && detail.title) ||
    (entity === 'module' ? EXAM_MODULES.find((item) => item.key === entityId)?.label : '') ||
    ''
  return { title, name }
}

export async function getActivity(): Promise<Activity> {
  const [reports, downloads, users, audit] = await Promise.all([
    pool.query(`SELECT count(*)::int AS n FROM library_reports WHERE status IN ('open', 'reviewing')`),
    pool.query(`SELECT count(*)::int AS n FROM library_downloads WHERE downloaded_at > now() - interval '7 days'`),
    pool.query(`SELECT count(*) FILTER (WHERE "createdAt" > now() - interval '7 days')::int AS recent, count(*)::int AS total FROM "user"`),
    pool.query('SELECT id, action, entity, entity_id, detail, admin_email, created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT 20'),
  ])
  return {
    pendingReports: reports.rows[0].n,
    downloads7d: downloads.rows[0].n,
    newUsers7d: users.rows[0].recent,
    totalUsers: users.rows[0].total,
    recent: audit.rows.map((row) => {
      const { title, name } = describe(row.action, row.entity, row.entity_id, row.detail)
      const who = typeof row.admin_email === 'string' ? row.admin_email.split('@')[0] : ''
      return { id: row.id, title, subtitle: [name, who].filter(Boolean).join(' · '), at: row.created_at as Date }
    }),
  }
}

// «há 5 min», «há 3 h», «há 2 d»; depois de uma semana, a data.
export function timeAgo(date: Date, now: Date = new Date()) {
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000))
  if (seconds < 60) return 'agora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days} d`
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

// ---------- Separador «Catálogo» (dados estruturais, mudam pouco) ----------

export type CatalogRow = { href: string; label: string; on: number; total: number; unit: string }

export async function getCatalog(): Promise<CatalogRow[]> {
  const [counts, institutions, modules] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT count(*) FROM academic_materials WHERE status = 'approved')::int AS materials_on,
        (SELECT count(*) FROM academic_materials)::int AS materials_total,
        (SELECT count(*) FROM library_subjects WHERE active)::int AS subjects_on,
        (SELECT count(*) FROM library_subjects)::int AS subjects_total,
        (SELECT count(*) FROM topics WHERE active)::int AS topics_on,
        (SELECT count(*) FROM topics)::int AS topics_total,
        (SELECT count(*) FROM library_categories WHERE active)::int AS categories_on,
        (SELECT count(*) FROM library_categories)::int AS categories_total,
        (SELECT count(*) FROM library_levels WHERE active)::int AS levels_on,
        (SELECT count(*) FROM library_levels)::int AS levels_total,
        (SELECT count(*) FROM questions WHERE status = 'publicada')::int AS questions_on,
        (SELECT count(*) FROM questions)::int AS questions_total
    `),
    listInstitutions(),
    pool.query(`SELECT count(DISTINCT module_key)::int AS n FROM exam_modules WHERE status <> 'hidden' AND module_key = ANY($1)`, [EXAM_MODULES.map((item) => item.key)]),
  ])
  const c = counts.rows[0]
  return [
    { href: '/admin/materiais', label: 'Materiais', on: c.materials_on, total: c.materials_total, unit: 'publicados' },
    { href: '/admin/instituicoes', label: 'Instituições', on: institutions.filter(isVisibleToStudents).length, total: institutions.length, unit: 'visíveis' },
    { href: '/admin/disciplinas', label: 'Disciplinas', on: c.subjects_on, total: c.subjects_total, unit: 'activas' },
    { href: '/admin/temas', label: 'Temas', on: c.topics_on, total: c.topics_total, unit: 'activos' },
    { href: '/admin/classificacao?aba=categorias', label: 'Categorias', on: c.categories_on, total: c.categories_total, unit: 'activas' },
    { href: '/admin/classificacao?aba=niveis', label: 'Níveis', on: c.levels_on, total: c.levels_total, unit: 'activos' },
    { href: '/admin/questoes', label: 'Questões', on: c.questions_on, total: c.questions_total, unit: 'publicadas' },
    { href: '/admin/modulos', label: 'Módulos', on: modules.rows[0].n, total: EXAM_MODULES.length, unit: 'visíveis' },
  ]
}
