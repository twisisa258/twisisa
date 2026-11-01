import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Upload } from 'lucide-react'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { AdminLoadError, AdminPage, AdminPageHeader } from '@/components/admin/page-parts'
import { MaterialBulk, type Catalog } from '@/components/admin/material-bulk'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Adicionar materiais | Twisisa' }

// Anos para classificar materiais: desde 2000 até ao ano seguinte ao atual, do mais recente para o mais antigo.
function materialYears(now = new Date()) {
  const last = now.getFullYear() + 1
  return Array.from({ length: last - 2000 + 1 }, (_, index) => last - index)
}

export default async function NovoMaterialPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')

  let catalog: Catalog | null = null
  try {
    const [categories, subjects, levels, institutions] = await Promise.all([
      pool.query('SELECT slug, name FROM library_categories WHERE active = true ORDER BY sort_order, name'),
      pool.query('SELECT id, name FROM library_subjects WHERE active = true ORDER BY name'),
      pool.query('SELECT id, name FROM library_levels WHERE active = true ORDER BY sort_order, name'),
      pool.query('SELECT short_name, name FROM institutions WHERE active = true ORDER BY short_name'),
    ])
    catalog = {
      categories: categories.rows,
      subjects: subjects.rows,
      levels: levels.rows,
      institutions: institutions.rows.map((row) => ({ shortName: row.short_name as string, name: row.name as string })),
      years: materialYears(),
    }
  } catch (error) {
    console.error('[ADMIN MATERIAIS NOVO]', error)
  }

  return (
    <AdminPage>
      <AdminPageHeader
        icon={Upload}
        title="Adicionar materiais"
        description="Escolhe vários ficheiros ou uma pasta e classifica tudo de uma vez."
        action={<Link href="/admin/materiais" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#c9d7cd] bg-white/80 px-4 text-sm font-semibold text-[#1d4d41] shadow-sm hover:bg-white"><ArrowLeft size={16} aria-hidden="true" />Materiais</Link>}
      />
      {catalog ? <MaterialBulk catalog={catalog} /> : <AdminLoadError href="/admin/materiais/novo" />}
    </AdminPage>
  )
}
