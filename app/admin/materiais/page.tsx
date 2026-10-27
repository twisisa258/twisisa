import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, ExternalLink } from 'lucide-react'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { createAcademicMaterial, deleteAcademicMaterial } from './actions'
import { MaterialUpload } from '@/components/admin/material-upload'
import { DeleteMaterialButton } from '@/components/admin/delete-material-button'
import { FormModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminPager, AdminSearchBar, normalizeSearch } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { UrlFeedback } from '@/components/url-feedback'
import { SelectField } from '@/components/ui/select-field'
import { EmptyState } from '@/components/states/empty-state'
import { examYearOptions } from '@/lib/years'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Administração de materiais | Twisisa' }

const PAGE_SIZE = 15
const input = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'

type Material = { id: string; title: string; category: string; subject: string; status: string }

function pageHref(q: string, page: number) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (page > 1) params.set('pagina', String(page))
  const query = params.toString()
  return query ? `/admin/materiais?${query}` : '/admin/materiais'
}

export default async function AdminMateriaisPage({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)
  const requested = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1)

  let categories: { name: string; slug: string }[] = []
  let levels: { name: string }[] = []
  let materials: Material[] | null = null
  let total = 0
  let page = requested
  try {
    // Pesquisa sem acentos nem maiúsculas: «portugues» encontra «Português».
    const term = normalizeSearch(q)
    const like = term ? `%${term.replace(/[\\%_]/g, '\\$&')}%` : null
    const where = `WHERE ($1::text IS NULL OR translate(lower(m.title), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE $1)`
    const [c, l, count] = await Promise.all([
      pool.query('SELECT name, slug FROM library_categories WHERE active = true ORDER BY sort_order, name'),
      pool.query('SELECT name FROM library_levels WHERE active = true ORDER BY sort_order, name'),
      pool.query(`SELECT count(*)::int AS n FROM academic_materials m ${where}`, [like]),
    ])
    categories = c.rows
    levels = l.rows
    total = count.rows[0].n
    page = Math.min(requested, Math.max(1, Math.ceil(total / PAGE_SIZE)))
    const list = await pool.query(
      `SELECT m.id, m.title, c.name AS category, COALESCE(s.name, '') AS subject, m.status
       FROM academic_materials m JOIN library_categories c ON c.id = m.category_id LEFT JOIN library_subjects s ON s.id = m.subject_id
       ${where} ORDER BY m.created_at DESC, m.id LIMIT ${PAGE_SIZE} OFFSET $2`,
      [like, (page - 1) * PAGE_SIZE],
    )
    materials = list.rows
  } catch (error) {
    console.error('[ADMIN MATERIAIS]', error)
  }
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const countLabel = materials ? (q ? `${total} ${total === 1 ? 'resultado' : 'resultados'}` : `${total} ${total === 1 ? 'material' : 'materiais'}`) : undefined

  return (
    <AdminPage>
      <UrlFeedback />
      <AdminPageHeader
        icon={BookOpen}
        title="Materiais académicos"
        description="Consulta, abre e elimina os recursos da Biblioteca."
        action={
          <FormModal label="Adicionar" title="Adicionar material" description="Publica um recurso na Biblioteca.">
            <FeedbackForm action={createAcademicMaterial} successMessage="Material publicado na biblioteca." errorMessage="Não foi possível publicar o material. Tenta outra vez." resetOnSuccess className="grid gap-4">
              <label className="text-sm font-medium">Título *<input name="title" required maxLength={180} className={input} placeholder="Ex.: Exame de admissão de Matemática 2025" /></label>
              <div className="text-sm font-medium"><span>Categoria *</span><SelectField name="category" label="Categoria" required placeholder="Seleccionar categoria" requiredMessage="Selecciona uma categoria." triggerClassName={input} options={categories.map((c) => ({ value: c.slug, label: c.name }))} /></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Disciplina<input name="subject" maxLength={100} className={input} placeholder="Matemática" /></label><div className="text-sm font-medium"><span>Classe / nível</span><SelectField name="level" label="Classe / nível" triggerClassName={input} options={[{ value: '', label: 'Não especificado' }, ...levels.map((l) => ({ value: l.name, label: l.name }))]} /></div></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Instituição<input name="institution" maxLength={180} className={input} placeholder="UEM, UP-Maputo…" /></label><label className="text-sm font-medium">Curso<input name="course" maxLength={180} className={input} placeholder="Engenharia, Medicina…" /></label></div>
              <div className="text-sm font-medium"><span>Ano</span><SelectField name="year" label="Ano" triggerClassName={input} options={examYearOptions()} /></div>
              <MaterialUpload inputClassName={input} />
              <label className="text-sm font-medium">Descrição<textarea name="description" rows={3} maxLength={1200} className={input} placeholder="Informação útil sobre o material (opcional)" /></label>
              <button type="submit" className="mt-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">Publicar material</button>
            </FeedbackForm>
          </FormModal>
        }
      />
      <AdminSearchBar q={q} placeholder="Pesquisar título" countLabel={countLabel} />

      <AdminListPanel>
        {materials === null ? (
          <AdminLoadError href={pageHref(q, page)} />
        ) : materials.length === 0 ? (
          <div className="m-4">
            {q ? (
              <EmptyState title="Sem resultados" description={`Nenhum material tem “${q}” no título.`} actionLabel="Limpar pesquisa" actionHref="/admin/materiais" />
            ) : (
              <EmptyState title="Ainda sem materiais" description="Usa o botão Adicionar para publicar o primeiro." />
            )}
          </div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium leading-5">{m.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[#737c75]">
                    {m.category}{m.subject ? ` · ${m.subject}` : ''}
                    <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.status === 'approved' ? 'bg-[#e6f0e9] text-[#1d4d41]' : 'bg-[#f4eddb] text-[#805f19]'}`}>{m.status === 'approved' ? 'Publicado' : m.status}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a href={`/api/biblioteca/${m.id}/ficheiro`} target="_blank" rel="noreferrer" aria-label={`Abrir ${m.title}`} className="rounded-lg p-2 text-[#1d4d41] hover:bg-[#f1f4ef]"><ExternalLink size={17} /></a>
                  <DeleteMaterialButton id={m.id} title={m.title} action={deleteAcademicMaterial} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {materials && total > 0 && <AdminPager page={page} pages={pages} prevHref={pageHref(q, page - 1)} nextHref={pageHref(q, page + 1)} />}
      </AdminListPanel>
    </AdminPage>
  )
}
