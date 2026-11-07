import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Eye, EyeOff, Archive, Pencil, PenLine, Trash2, ExternalLink } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listAdminPosts, type BlogSummary } from '@/lib/blog'
import { BLOG_STATUS_LABEL, BLOG_STATUSES, dataCurta, isBlogStatus } from '@/lib/blog-pure'
import { deleteBlogPostAction, setBlogStatusAction } from './actions'
import { RowMenu, type RowMenuItem } from '@/components/admin/row-menu'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminSearchBar, AdminTabs } from '@/components/admin/page-parts'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Blog | Administração | Twisisa' }

const STATUS_TONE: Record<string, string> = { draft: 'text-aviso-texto', published: 'text-sucesso-texto', archived: 'text-texto-2' }

function rowItems(post: BlogSummary): RowMenuItem[] {
  const items: RowMenuItem[] = [
    { label: post.status === 'draft' ? 'Continuar a editar' : 'Editar', icon: <Pencil size={16} />, href: `/admin/blog/${post.id}` },
    { label: 'Pré-visualizar', icon: <Eye size={16} />, href: `/blog/pre-visualizar/${post.id}` },
  ]
  if (post.status === 'published') {
    items.push({ label: 'Ver no site', icon: <ExternalLink size={16} />, href: `/blog/${post.slug}` })
    items.push({ label: 'Despublicar', icon: <EyeOff size={16} />, action: setBlogStatusAction, fields: { id: post.id, status: 'draft' }, confirm: 'Despublicar' })
  } else {
    items.push({ label: 'Publicar', icon: <Eye size={16} />, action: setBlogStatusAction, fields: { id: post.id, status: 'published' } })
  }
  if (post.status !== 'archived') items.push({ label: 'Arquivar', icon: <Archive size={16} />, action: setBlogStatusAction, fields: { id: post.id, status: 'archived' }, confirm: 'Arquivar' })
  items.push({ label: 'Apagar', icon: <Trash2 size={16} />, action: deleteBlogPostAction, fields: { id: post.id }, confirm: 'Apagar para sempre', tone: 'danger' })
  return items
}

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const estado = isBlogStatus(params.estado) ? params.estado : ''
  const q = (params.q ?? '').trim().slice(0, 100)

  let posts: BlogSummary[] | null = null
  try {
    posts = await listAdminPosts({ status: estado, q })
  } catch (error) {
    console.error('[ADMIN BLOG]', error)
  }
  const draft = !estado && !q ? posts?.find((post) => post.status === 'draft') : undefined
  const tab = (value: string, label: string) => ({ href: `/admin/blog${value || q ? `?${new URLSearchParams({ ...(value ? { estado: value } : {}), ...(q ? { q } : {}) }).toString()}` : ''}`, label, active: estado === value })

  return (
    <AdminPage>
      <AdminPageHeader
        icon={PenLine}
        title="Blog"
        description="Guias, explicações por tema e dicas de exame para os estudantes."
        action={<Link href="/admin/blog/novo" className="btn btn-primario shrink-0">Novo artigo</Link>}
      />
      <AdminTabs label="Estado" tabs={[tab('', 'Todos'), ...BLOG_STATUSES.map((value) => tab(value, BLOG_STATUS_LABEL[value]))]} />
      <AdminSearchBar q={q} placeholder="Pesquisar por título ou endereço" countLabel={posts ? `${posts.length} ${posts.length === 1 ? 'artigo' : 'artigos'}` : undefined} hidden={estado ? { estado } : undefined} />
      {draft && (
        <Link href={`/admin/blog/${draft.id}`} className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-y border-linha py-2 text-[15px]">
          <span className="min-w-0"><span className="block text-[13px] text-texto-2">Continuar a editar</span><span className="block truncate font-semibold">{draft.title}</span></span>
          <span aria-hidden="true" className="text-marca">→</span>
        </Link>
      )}
      <AdminListPanel>
        {posts === null ? (
          <AdminLoadError href="/admin/blog" />
        ) : posts.length === 0 ? (
          <div className="m-4">
            {q || estado
              ? <EmptyState icon={PenLine} title="Nenhum artigo encontrado" description="Tenta outra pesquisa ou outro estado." actionLabel="Ver todos" actionHref="/admin/blog" />
              : <EmptyState icon={PenLine} title="Ainda sem artigos" description="Escreve o primeiro artigo: um guia, uma explicação por tema ou dicas de exame." actionLabel="Novo artigo" actionHref="/admin/blog/novo" />}
          </div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-linha overflow-y-auto px-4 sm:px-5">
            {posts.map((post) => (
              <li key={post.id} className="flex items-start gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/blog/${post.id}`} className="block min-h-6 text-[16px] font-semibold leading-6 hover:text-marca">{post.title}</Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-texto-2">
                    <span className={`font-semibold ${STATUS_TONE[post.status]}`}>{BLOG_STATUS_LABEL[post.status]}</span>
                    {post.subjectName && <><span aria-hidden="true">·</span><span>{post.subjectName}</span></>}
                    <span aria-hidden="true">·</span>
                    <span>{post.status === 'published' && post.publishedAt ? `publicado a ${dataCurta(post.publishedAt)}` : `editado a ${dataCurta(post.updatedAt)}`}</span>
                    <span aria-hidden="true">·</span>
                    <span>{post.readingMinutes} min</span>
                  </p>
                </div>
                <RowMenu label={`Ações de ${post.title}`} items={rowItems(post)} />
              </li>
            ))}
          </ul>
        )}
      </AdminListPanel>
    </AdminPage>
  )
}
