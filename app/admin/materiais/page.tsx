import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, ExternalLink, Plus } from 'lucide-react'
import { pool } from '@/lib/db'
import { getAdminUser } from '@/lib/admin'
import { deleteAcademicMaterial } from './actions'
import { DeleteMaterialButton } from '@/components/admin/delete-material-button'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminPager, AdminSearchBar, normalizeSearch } from '@/components/admin/page-parts'
import { UrlFeedback } from '@/components/url-feedback'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Administração de materiais | Twisisa' }

const PAGE_SIZE = 15

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

  let materials: Material[] | null = null
  let total = 0
  let page = requested
  try {
    // Pesquisa sem acentos nem maiúsculas: «portugues» encontra «Português».
    const term = normalizeSearch(q)
    const like = term ? `%${term.replace(/[\\%_]/g, '\\$&')}%` : null
    const where = `WHERE ($1::text IS NULL OR translate(lower(m.title), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE $1)`
    const count = await pool.query(`SELECT count(*)::int AS n FROM academic_materials m ${where}`, [like])
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
        description="Consulta, abre e elimina os recursos da Biblioteca. Podes carregar vários de uma vez."
        action={
          <Link href="/admin/materiais/novo" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-marca px-4 text-sm font-semibold text-white shadow-sm hover:bg-marca-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca">
            <Plus size={18} aria-hidden="true" />Adicionar
          </Link>
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
              <EmptyState title="Ainda sem materiais" description="Usa o botão Adicionar para publicar os primeiros." />
            )}
          </div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium leading-5">{m.title}</p>
                  <p className="mt-0.5 truncate text-xs text-texto-2">
                    {m.category}{m.subject ? ` · ${m.subject}` : ''}
                    <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.status === 'approved' ? 'bg-[#e6f0e9] text-marca' : 'bg-[#f4eddb] text-aviso-texto'}`}>{m.status === 'approved' ? 'Publicado' : m.status}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a href={`/api/biblioteca/${m.id}/ficheiro`} target="_blank" rel="noreferrer" aria-label={`Abrir ${m.title}`} className="rounded-lg p-2 text-marca hover:bg-[#f1f4ef]"><ExternalLink size={17} /></a>
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
