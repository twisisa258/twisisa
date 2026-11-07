#!/usr/bin/env bash
# Blog do Twisisa: apaga o blog simulado e constrói o novo, com artigos reais na base de dados.
# Uso: na raiz do projeto (a pasta com package.json), corre:  bash aplicar-blog.sh
# Opcional: SKIP_CHECKS=1 bash aplicar-blog.sh   (não corre tsc, testes e build no fim)
set -e

if [ ! -f package.json ] || [ ! -d database/migrations ] || [ ! -f lib/seo.ts ]; then
  echo "Corre este script na raiz do projeto Twisisa (onde está o package.json)." >&2
  exit 1
fi
if [ ! -f database/migrations/0038_temas_principais.sql ]; then
  echo "Não encontrei a migração 0038: este script foi feito para o projeto depois da 0038." >&2
  exit 1
fi
if [ -f database/migrations/0039_blog.sql ] && ! grep -q "blog_posts" database/migrations/0039_blog.sql; then
  echo "Já existe uma migração 0039 que não é a do blog. Renomeia-a antes de continuar." >&2
  exit 1
fi

echo "1/4 A apagar o blog antigo…"
rm -f components/editorial-feed.tsx components/public-blog.tsx app/sign-up/page.tsx.bak lib/blog.ts
rm -rf app/blog

echo "2/4 A escrever os ficheiros novos…"
mkdir -p "app/admin/blog/[id]"
cat > "app/admin/blog/[id]/page.tsx" <<'TWISISA_FIM_01'
import { notFound, redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/admin'
import { getAdminPost, inputFromPost, listClassification } from '@/lib/blog'
import { BlogEditor } from '@/components/admin/blog-editor'
import { AdminLoadError } from '@/components/admin/page-parts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Editar artigo | Administração | Twisisa' }

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const { id } = await params
  let loaded: { post: Awaited<ReturnType<typeof getAdminPost>>; classification: Awaited<ReturnType<typeof listClassification>> } | null = null
  try {
    const [post, classification] = await Promise.all([getAdminPost(id), listClassification()])
    loaded = { post, classification }
  } catch (error) {
    console.error('[ADMIN BLOG] editor', error)
  }
  if (!loaded) return <AdminLoadError href={`/admin/blog/${id}`} />
  if (!loaded.post) notFound()
  return <BlogEditor key={loaded.post.id} post={{ id: loaded.post.id, status: loaded.post.status, fields: inputFromPost(loaded.post) }} subjects={loaded.classification.subjects} topics={loaded.classification.topics} />
}
TWISISA_FIM_01
mkdir -p "app/admin/blog"
cat > "app/admin/blog/actions.ts" <<'TWISISA_FIM_02'
'use server'

import { revalidatePath } from 'next/cache'
import { getAdminUser } from '@/lib/admin'
import { logAdminAction } from '@/lib/admin-audit'
import { AppError, runAction, type ActionResult } from '@/lib/action-result'
import { blogSlugTaken, deleteBlogPost, getAdminPost, saveBlogPost, setBlogStatus } from '@/lib/blog'
import { checkBlogInput, isBlogStatus, type BlogInput, type BlogStatus } from '@/lib/blog-pure'

// Só a administração escreve no blog (estudantes e revisores nunca).
async function requireAdmin() {
  const admin = await getAdminUser()
  if (!admin) throw new AppError('Acesso reservado à administração.')
  return admin
}

// Páginas públicas que mudam quando um artigo publicado muda (ou passa a publicado / deixa de o ser).
function refreshPublic(slugs: (string | null | undefined)[]) {
  revalidatePath('/blog')
  revalidatePath('/blog/feed.xml')
  revalidatePath('/sitemap.xml')
  revalidatePath('/')
  for (const slug of new Set(slugs)) if (slug) revalidatePath(`/blog/${slug}`)
}
const refreshAdmin = () => revalidatePath('/admin/blog')

const str = (value: unknown, max = 100_000) => (typeof value === 'string' ? value.slice(0, max) : '')

export type SaveBlogPayload = { id: string | null; intent: 'save' | 'publish' | 'autosave'; fields: BlogInput }
export type SaveBlogResult =
  | { ok: true; id: string; slug: string; status: BlogStatus; message: string }
  | { ok: false; message: string }

// Guarda (cria ou atualiza). «save» e «autosave» não mudam o estado; «publish» publica. O auto-guardar só mexe em rascunhos
// e não vai para o registo de auditoria (seria uma linha por pausa de escrita); a criação, a gravação manual e a publicação ficam registadas.
export async function saveBlogPostAction(payload: SaveBlogPayload): Promise<SaveBlogResult> {
  let saved: { id: string; slug: string; status: BlogStatus; message: string } | null = null
  const result = await runAction(async () => {
    const admin = await requireAdmin()
    const id = typeof payload.id === 'string' && payload.id ? payload.id.slice(0, 80) : null
    const intent = payload.intent === 'publish' ? 'publish' : payload.intent === 'autosave' ? 'autosave' : 'save'
    const fields: BlogInput = {
      title: str(payload.fields?.title, 400),
      slug: str(payload.fields?.slug, 200),
      excerpt: str(payload.fields?.excerpt, 1000),
      body: str(payload.fields?.body),
      coverUrl: str(payload.fields?.coverUrl, 1000),
      coverAlt: str(payload.fields?.coverAlt, 500),
      track: str(payload.fields?.track, 20),
      subjectId: str(payload.fields?.subjectId, 120),
      themeId: str(payload.fields?.themeId, 120),
      tags: str(payload.fields?.tags, 1000),
    }
    const check = checkBlogInput(fields, intent === 'publish' ? 'publish' : 'draft')
    if (!check.ok) throw new AppError(check.message)
    if (id && intent === 'autosave') {
      const current = await getAdminPost(id)
      if (!current) throw new AppError('Este artigo já não existe.')
      if (current.status !== 'draft') throw new AppError('O auto-guardar só funciona em rascunhos.')
    }
    if (await blogSlugTaken(check.value.slug, id)) throw new AppError('Já existe um artigo com este endereço. Escolhe outro.')

    const done = await saveBlogPost({ id, clean: check.value, publish: intent === 'publish', userId: admin.id })
    if (!id) await logAdminAction(admin, 'blog.create', 'blog_post', done.id, { title: check.value.title, slug: done.slug })
    if (intent === 'publish') await logAdminAction(admin, 'blog.publish', 'blog_post', done.id, { title: check.value.title, slug: done.slug })
    else if (id && intent === 'save') await logAdminAction(admin, 'blog.update', 'blog_post', done.id, { title: check.value.title, slug: done.slug })

    refreshAdmin()
    if (intent === 'publish' || done.wasPublished || done.status === 'published') refreshPublic([done.slug, done.previousSlug])
    saved = {
      id: done.id,
      slug: done.slug,
      status: done.status,
      message: intent === 'publish' ? 'Artigo publicado.' : intent === 'autosave' ? 'Rascunho guardado.' : done.status === 'published' ? 'Alterações guardadas.' : 'Rascunho guardado.',
    }
  }, 'Não foi possível guardar o artigo. Tenta outra vez.')
  if (!result.ok || !saved) return { ok: false, message: result.ok ? 'Não foi possível guardar o artigo.' : result.message }
  return { ok: true, ...(saved as { id: string; slug: string; status: BlogStatus; message: string }) }
}

/** Verifica no servidor se o endereço está livre (o editor chama-a enquanto escreves). */
export async function checkBlogSlugAction(slug: string, id: string | null): Promise<{ taken: boolean }> {
  const admin = await getAdminUser()
  if (!admin) return { taken: false }
  const clean = str(slug, 200).trim().toLowerCase()
  if (!clean) return { taken: false }
  try {
    return { taken: await blogSlugTaken(clean, id && id.length <= 80 ? id : null) }
  } catch {
    return { taken: false }
  }
}

// Linha da lista: publicar, despublicar (volta a rascunho) e arquivar.
export async function setBlogStatusAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = String(formData.get('id') ?? '')
    const status = String(formData.get('status') ?? '')
    if (!id) throw new AppError('Artigo em falta.')
    if (!isBlogStatus(status)) throw new AppError('Estado inválido.')
    const done = await setBlogStatus(id, status)
    const action = status === 'published' ? 'blog.publish' : status === 'archived' ? 'blog.archive' : 'blog.unpublish'
    await logAdminAction(admin, action, 'blog_post', id, { title: done.title, slug: done.slug, from: done.previous })
    refreshAdmin()
    refreshPublic([done.slug])
    return status === 'published' ? 'Artigo publicado.' : status === 'archived' ? 'Artigo arquivado.' : 'Artigo despublicado: passou a rascunho.'
  }, 'Não foi possível mudar o estado do artigo.')
}

export async function deleteBlogPostAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireAdmin()
    const id = String(formData.get('id') ?? '')
    if (!id) throw new AppError('Artigo em falta.')
    const done = await deleteBlogPost(id)
    await logAdminAction(admin, 'blog.delete', 'blog_post', id, { title: done.title, slug: done.slug, wasPublished: done.wasPublished })
    refreshAdmin()
    refreshPublic([done.slug])
    return 'Artigo apagado.'
  }, 'Não foi possível apagar o artigo.')
}
TWISISA_FIM_02
mkdir -p "app/admin/blog/novo"
cat > "app/admin/blog/novo/page.tsx" <<'TWISISA_FIM_03'
import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/admin'
import { listClassification } from '@/lib/blog'
import { BlogEditor } from '@/components/admin/blog-editor'
import { AdminLoadError } from '@/components/admin/page-parts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Novo artigo | Administração | Twisisa' }

export default async function NewBlogPostPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const classification = await listClassification().catch((error) => { console.error('[ADMIN BLOG] classificação', error); return null })
  if (!classification) return <AdminLoadError href="/admin/blog/novo" />
  return <BlogEditor post={null} subjects={classification.subjects} topics={classification.topics} />
}
TWISISA_FIM_03
mkdir -p "app/admin/blog"
cat > "app/admin/blog/page.tsx" <<'TWISISA_FIM_04'
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
TWISISA_FIM_04
mkdir -p "app/blog/[slug]"
cat > "app/blog/[slug]/page.tsx" <<'TWISISA_FIM_05'
import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArticleView } from '@/components/blog/article-view'
import { BlogShell } from '@/components/blog/blog-shell'
import { ErrorState } from '@/components/states/error-state'
import { JsonLd } from '@/components/json-ld'
import { getPublishedBySlug, listRelated } from '@/lib/blog'
import { blogPath } from '@/lib/blog-pure'
import { OG_IMAGE, SITE_LOCALE, SITE_NAME, SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

// Rascunhos, arquivados e artigos ainda por publicar devolvem 404. O cache evita ler duas vezes (metadados e página).
const load = cache(getPublishedBySlug)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const result = await load(slug)
  if (!result.ok) return { title: 'Blog | Twisisa', robots: { index: false, follow: true } }
  if (!result.data) return { title: 'Artigo não encontrado | Twisisa', robots: { index: false, follow: true } }
  const post = result.data
  const url = `${SITE_URL}${blogPath(post.slug)}`
  const image = post.coverUrl ? { url: post.coverUrl, alt: post.coverAlt ?? post.title } : OG_IMAGE
  const title = `${post.title} | ${SITE_NAME}`
  return {
    title,
    description: post.excerpt,
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: {
      type: 'article',
      locale: SITE_LOCALE,
      siteName: SITE_NAME,
      url,
      title,
      description: post.excerpt,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: post.authorName ? [post.authorName] : undefined,
      tags: post.tags,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description: post.excerpt, images: [image.url] },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await load(slug)
  if (!result.ok) {
    return (
      <BlogShell>
        <main id="conteudo" className="mx-auto w-full max-w-[680px] px-5 py-10"><ErrorState title="Não foi possível carregar o artigo" description="Verifica a ligação e tenta de novo." /></main>
      </BlogShell>
    )
  }
  if (!result.data) notFound()
  const post = result.data
  const related = await listRelated(post)
  const url = `${SITE_URL}${blogPath(post.slug)}`
  const published = (post.publishedAt ?? post.createdAt).toISOString()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#artigo`,
        headline: post.title,
        description: post.excerpt,
        url,
        mainEntityOfPage: url,
        inLanguage: 'pt-MZ',
        datePublished: published,
        dateModified: post.updatedAt.toISOString(),
        image: [post.coverUrl ?? OG_IMAGE.url],
        author: post.authorName ? { '@type': 'Person', name: post.authorName } : { '@id': `${SITE_URL}/#organization` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        isPartOf: { '@id': `${SITE_URL}/#website` },
        ...(post.subjectName ? { articleSection: post.subjectName } : {}),
        ...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
      },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Blog', path: '/blog' }, { name: post.title, path: blogPath(post.slug) }]),
    ],
  }
  return (
    <BlogShell>
      <JsonLd data={jsonLd} />
      <main id="conteudo" className="mx-auto w-full max-w-[760px] px-5 pt-4">
        <nav aria-label="Trilho de navegação" className="mb-6 text-[14px]"><Link href="/blog" className="inline-flex min-h-11 items-center text-texto-2 underline-offset-4 hover:text-marca hover:underline">← Blog</Link></nav>
        <ArticleView post={post} related={related} />
      </main>
    </BlogShell>
  )
}
TWISISA_FIM_05
mkdir -p "app/blog/feed.xml"
cat > "app/blog/feed.xml/route.ts" <<'TWISISA_FIM_06'
import { listFeedPosts } from '@/lib/blog'
import { blogPath } from '@/lib/blog-pure'
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/seo'

export const revalidate = 600

const xml = (value: string) => value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch] as string)

// Feed RSS 2.0 dos artigos publicados. Se a leitura falhar devolve 503 (um feed vazio faria os leitores apagar os artigos).
export async function GET() {
  const result = await listFeedPosts(30)
  if (!result.ok) return new Response('Feed temporariamente indisponível.', { status: 503, headers: { 'Retry-After': '300', 'Content-Type': 'text/plain; charset=utf-8' } })
  const posts = result.data
  const built = (posts[0]?.updatedAt ?? new Date()).toUTCString()
  const items = posts.map((post) => {
    const link = `${SITE_URL}${blogPath(post.slug)}`
    return [
      '    <item>',
      `      <title>${xml(post.title)}</title>`,
      `      <link>${xml(link)}</link>`,
      `      <guid isPermaLink="true">${xml(link)}</guid>`,
      post.publishedAt ? `      <pubDate>${post.publishedAt.toUTCString()}</pubDate>` : '',
      `      <description>${xml(post.excerpt)}</description>`,
      post.subjectName ? `      <category>${xml(post.subjectName)}</category>` : '',
      ...post.tags.map((tag) => `      <category>${xml(tag)}</category>`),
      '    </item>',
    ].filter(Boolean).join('\n')
  })
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>Blog Twisisa</title>',
    `    <link>${SITE_URL}/blog</link>`,
    `    <description>${xml(SITE_DESCRIPTION)}</description>`,
    '    <language>pt-MZ</language>',
    `    <lastBuildDate>${built}</lastBuildDate>`,
    `    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml" />`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' } })
}
TWISISA_FIM_06
mkdir -p "app/blog"
cat > "app/blog/not-found.tsx" <<'TWISISA_FIM_07'
import type { Metadata } from 'next'
import { BlogShell } from '@/components/blog/blog-shell'
import { EmptyState } from '@/components/states/empty-state'

export const metadata: Metadata = { title: 'Artigo não encontrado | Twisisa', robots: { index: false, follow: true } }

export default function BlogNotFound() {
  return (
    <BlogShell>
      <main id="conteudo" className="mx-auto w-full max-w-[680px] px-5 py-10">
        <EmptyState title="Este artigo não existe" description="Pode ter sido retirado ou o endereço estar errado. Vê os artigos disponíveis." actionLabel="Ir para o blog" actionHref="/blog" />
      </main>
    </BlogShell>
  )
}
TWISISA_FIM_07
mkdir -p "app/blog"
cat > "app/blog/page.tsx" <<'TWISISA_FIM_08'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { BlogShell } from '@/components/blog/blog-shell'
import { categoryLabel } from '@/components/blog/article-view'
import { JsonLd } from '@/components/json-ld'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'
import { Segmentado } from '@/components/ui/segmentado'
import { listBlogSubjects, listPublished, type BlogSummary } from '@/lib/blog'
import { BLOG_TRACK_LABEL, BLOG_TRACKS, blogPath, dataCurta, isBlogTrack } from '@/lib/blog-pure'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

type Params = Promise<Record<string, string | string[] | undefined>>
const one = (value: string | string[] | undefined) => ((Array.isArray(value) ? value[0] : value) ?? '').trim()
const DESCRIPTION = 'Guias de estudo, explicações por tema e dicas de exame e de admissão para estudantes moçambicanos.'

function read(raw: Record<string, string | string[] | undefined>) {
  const percurso = one(raw.percurso)
  return {
    q: one(raw.q).slice(0, 100),
    percurso: isBlogTrack(percurso) ? percurso : '',
    disciplina: one(raw.disciplina).slice(0, 120),
    etiqueta: one(raw.etiqueta).slice(0, 24),
    pagina: Math.max(1, parseInt(one(raw.pagina), 10) || 1),
  }
}

// Pesquisa e filtros: noindex e canonical para /blog. Páginas seguintes da lista simples: indexáveis, com canonical próprio.
export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const f = read(await searchParams)
  const filtered = Boolean(f.q || f.percurso || f.disciplina || f.etiqueta)
  if (filtered) return { ...pageMetadata({ title: 'Blog | Twisisa', description: DESCRIPTION, path: '/blog', index: false }), alternates: { canonical: `${SITE_URL}/blog` } }
  const base = pageMetadata({ title: f.pagina > 1 ? `Blog, página ${f.pagina} | Twisisa` : 'Blog | Twisisa', description: DESCRIPTION, path: f.pagina > 1 ? `/blog?pagina=${f.pagina}` : '/blog' })
  return { ...base, alternates: { canonical: `${SITE_URL}${f.pagina > 1 ? `/blog?pagina=${f.pagina}` : '/blog'}`, types: { 'application/rss+xml': `${SITE_URL}/blog/feed.xml` } } }
}

function Meta({ post }: { post: BlogSummary }) {
  return (
    <p className="mt-2 text-[14px] text-texto-2">
      {post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{dataCurta(post.publishedAt)}</time>} · {post.readingMinutes} min de leitura
    </p>
  )
}

export default async function BlogPage({ searchParams }: { searchParams: Params }) {
  const f = read(await searchParams)
  const [result, subjects] = await Promise.all([
    listPublished({ q: f.q, track: f.percurso, subjectId: f.disciplina, tag: f.etiqueta, page: f.pagina }),
    listBlogSubjects(),
  ])
  const filtered = Boolean(f.q || f.percurso || f.disciplina || f.etiqueta)
  const url = (over: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams()
    for (const [key, value] of Object.entries({ q: f.q, percurso: f.percurso, disciplina: f.disciplina, etiqueta: f.etiqueta, ...over })) if (value) query.set(key, String(value))
    const text = query.toString()
    return text ? `/blog?${text}` : '/blog'
  }
  const items = result.ok ? result.data.items : []
  const page = result.ok ? result.data.page : 1
  const pages = result.ok ? result.data.pages : 1
  const featured = page === 1 ? items[0] : undefined
  const rest = featured ? items.slice(1) : items

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/blog#pagina`,
        url: `${SITE_URL}/blog`,
        name: 'Blog Twisisa',
        description: DESCRIPTION,
        inLanguage: 'pt-MZ',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: { '@type': 'ItemList', itemListElement: items.map((post, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}${blogPath(post.slug)}`, name: post.title })) },
      },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Blog', path: '/blog' }]),
    ],
  }

  return (
    <BlogShell>
      <JsonLd data={jsonLd} />
      <main id="conteudo" className="mx-auto w-full max-w-[720px] px-5 pt-6">
        <h1 className="text-[clamp(1.75rem,1.4rem+1.8vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.035em]">Blog</h1>
        <p className="mt-3 max-w-[48ch] text-[17px] leading-7 text-texto-2">Guias, explicações por tema e dicas de exame e de admissão.</p>

        <form role="search" method="get" action="/blog" className="mt-8">
          {f.percurso && <input type="hidden" name="percurso" value={f.percurso} />}
          {f.etiqueta && <input type="hidden" name="etiqueta" value={f.etiqueta} />}
          <label htmlFor="blog-q" className="sr-only">Pesquisar artigos</label>
          <div className="flex items-end gap-3">
            <input id="blog-q" name="q" type="search" defaultValue={f.q} maxLength={100} placeholder="Pesquisar artigos" autoComplete="off" className="min-h-12 min-w-0 flex-1 rounded-none border-0 border-b border-texto/30 bg-transparent text-[16px] outline-none placeholder:text-texto-2 focus:border-marca" />
            <button type="submit" className="btn btn-secundario shrink-0">Pesquisar</button>
          </div>
          {subjects.length > 0 && (
            <>
              <label htmlFor="blog-d" className="sr-only">Disciplina</label>
              <select id="blog-d" name="disciplina" defaultValue={f.disciplina} className="mt-3 min-h-12 w-full rounded-none border-0 border-b border-texto/30 bg-transparent text-[16px] outline-none focus:border-marca">
                <option value="">Todas as disciplinas</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </>
          )}
        </form>

        <div className="mt-5">
          <Segmentado label="Percurso" items={[{ href: url({ percurso: undefined, pagina: undefined }), label: 'Todos', active: !f.percurso }, ...BLOG_TRACKS.map((track) => ({ href: url({ percurso: track, pagina: undefined }), label: track === 'admissao' ? 'Admissão' : `${track}ª`, active: f.percurso === track }))]} />
          {f.percurso && <p className="sr-only">Percurso: {BLOG_TRACK_LABEL[f.percurso]}</p>}
        </div>

        {!result.ok ? (
          <div className="mt-10"><ErrorState title="Não foi possível carregar os artigos" description="Verifica a ligação e tenta de novo." /></div>
        ) : items.length === 0 ? (
          <div className="mt-10">
            {f.q
              ? <EmptyState title="Nada encontrado" description={`Não há artigos para «${f.q}». Tenta outras palavras.`} actionLabel="Limpar pesquisa" actionHref="/blog" />
              : filtered
                ? <EmptyState title="Sem artigos neste filtro" description="Ainda não escrevemos sobre isto. Vê todos os artigos." actionLabel="Ver todos" actionHref="/blog" />
                : <EmptyState title="Ainda sem artigos" description="Estamos a preparar os primeiros guias. Enquanto isso, pratica no Simulador." actionLabel="Abrir o Simulador" actionHref="/aluno/simulador" />}
          </div>
        ) : (
          <>
            {featured && (
              <article className="mt-10 border-t border-linha pt-8">
                {featured.coverUrl && (
                  <Link href={blogPath(featured.slug)} tabIndex={-1} aria-hidden="true" className="relative mb-5 block aspect-video overflow-hidden rounded-md bg-linha/40">
                    <Image src={featured.coverUrl} alt="" fill priority sizes="(min-width: 760px) 680px, 100vw" className="object-cover" />
                  </Link>
                )}
                {categoryLabel(featured) && <p className="text-[13px] font-semibold text-marca">{categoryLabel(featured)}</p>}
                <h2 className="mt-1 text-[clamp(1.5rem,1.25rem+1.2vw,2rem)] font-semibold leading-[1.2] tracking-[-0.03em]"><Link href={blogPath(featured.slug)} className="hover:text-marca">{featured.title}</Link></h2>
                <p className="mt-3 text-[17px] leading-7 text-texto-2">{featured.excerpt}</p>
                <Meta post={featured} />
              </article>
            )}
            <div className={featured ? '' : 'mt-10'}>
              {rest.map((post) => (
                <article key={post.id} className="flex items-start gap-4 border-t border-linha py-6">
                  <div className="min-w-0 flex-1">
                    {categoryLabel(post) && <p className="text-[13px] font-semibold text-marca">{categoryLabel(post)}</p>}
                    <h2 className="mt-1 text-[20px] font-semibold leading-[1.3] tracking-[-0.02em]"><Link href={blogPath(post.slug)} className="hover:text-marca">{post.title}</Link></h2>
                    <p className="mt-2 line-clamp-2 text-[16px] leading-6 text-texto-2">{post.excerpt}</p>
                    <Meta post={post} />
                  </div>
                  {post.coverUrl && (
                    <Link href={blogPath(post.slug)} tabIndex={-1} aria-hidden="true" className="relative block size-[88px] shrink-0 overflow-hidden rounded-md bg-linha/40">
                      <Image src={post.coverUrl} alt="" fill sizes="88px" className="object-cover" />
                    </Link>
                  )}
                </article>
              ))}
            </div>
            {pages > 1 && (
              <nav aria-label="Paginação" className="mt-4 flex items-center justify-between gap-3 border-t border-linha pt-6">
                {page > 1 ? <Link href={url({ pagina: page - 1 > 1 ? page - 1 : undefined })} rel="prev" className="btn btn-secundario btn-grande">Anterior</Link> : <span />}
                <span className="text-[14px] text-texto-2">Página {page} de {pages}</span>
                {page < pages ? <Link href={url({ pagina: page + 1 })} rel="next" className="btn btn-secundario btn-grande">Seguinte</Link> : <span />}
              </nav>
            )}
          </>
        )}
      </main>
    </BlogShell>
  )
}
TWISISA_FIM_08
mkdir -p "app/blog/pre-visualizar/[id]"
cat > "app/blog/pre-visualizar/[id]/page.tsx" <<'TWISISA_FIM_09'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArticleView } from '@/components/blog/article-view'
import { BlogShell } from '@/components/blog/blog-shell'
import { getAdminUser } from '@/lib/admin'
import { BLOG_STATUS_LABEL } from '@/lib/blog-pure'
import { getAdminPost, listRelated } from '@/lib/blog'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Pré-visualização | Twisisa', robots: { index: false, follow: false } }

// Pré-visualização: mostra qualquer artigo (rascunho incluído) só à administração. Para os outros é um 404, como se a rota não existisse.
export default async function BlogPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) notFound()
  const { id } = await params
  const post = await getAdminPost(id).catch(() => null)
  if (!post) notFound()
  const related = await listRelated(post)
  return (
    <BlogShell>
      <main id="conteudo" className="mx-auto w-full max-w-[760px] px-5 pt-4">
        <div role="note" className="mb-8 flex flex-wrap items-center justify-between gap-x-4 border-y border-linha py-2 text-[14px]">
          <p><span className="font-semibold">Pré-visualização</span> <span className="text-texto-2">· {BLOG_STATUS_LABEL[post.status]} · só a equipa vê isto</span></p>
          <Link href={`/admin/blog/${post.id}`} className="inline-flex min-h-11 items-center font-semibold text-marca underline-offset-4 hover:underline">Voltar ao editor</Link>
        </div>
        <ArticleView post={post} related={related} />
      </main>
    </BlogShell>
  )
}
TWISISA_FIM_09
mkdir -p "components/admin"
cat > "components/admin/blog-editor.tsx" <<'TWISISA_FIM_10'
'use client'

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bold, CircleAlert, Heading2, Heading3, ImagePlus, Link2, List, Quote, Sigma, Table, X } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'
import { BlogBody } from '@/components/blog/blog-body'
import { checkBlogSlugAction, saveBlogPostAction, setBlogStatusAction, type SaveBlogResult } from '@/app/admin/blog/actions'
import { parseBlogMarkdown } from '@/lib/blog-markdown'
import { BLOG_STATUS_LABEL, BLOG_TRACK_LABEL, BLOG_TRACKS, LIMITS, SLUG_PATTERN, slugFromTitle, type BlogInput, type BlogStatus } from '@/lib/blog-pure'

type Subject = { id: string; name: string }
type Topic = { id: string; subjectId: string; name: string }
type Props = { post: { id: string; status: BlogStatus; fields: BlogInput } | null; subjects: Subject[]; topics: Topic[] }

const EMPTY: BlogInput = { title: '', slug: '', excerpt: '', body: '', coverUrl: '', coverAlt: '', track: '', subjectId: '', themeId: '', tags: '' }
const MAX_IMAGE_KB = 3072
const control = 'mt-1.5 block min-h-[48px] w-full rounded-xl border border-linha bg-white px-3.5 py-3 text-[16px] leading-6 text-texto outline-none focus:border-marca focus:ring-2 focus:ring-marca/20'
const toolButton = 'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-texto hover:bg-marca-suave focus-visible:outline-2 focus-visible:outline-marca disabled:opacity-40'
const sectionTitle = 'text-[13px] font-semibold uppercase tracking-[0.08em] text-texto-2'

const cleanSlug = (value: string) => value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-')

// Carrega a imagem directamente para o Cloudinary (pasta «blog») com o mesmo pedido assinado do resto da administração.
async function uploadImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_KB * 1024) throw new Error(`O ficheiro tem ${(file.size / 1024).toFixed(0)} KB. O limite é ${MAX_IMAGE_KB} KB.`)
  const signResponse = await fetch('/api/admin/cloudinary-sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pasta: 'blog' }) })
  const sign = await signResponse.json()
  if (!signResponse.ok) throw new Error(sign.error ?? 'Não foi possível preparar o carregamento.')
  const body = new FormData()
  body.append('file', file)
  body.append('api_key', sign.apiKey)
  body.append('timestamp', String(sign.timestamp))
  body.append('signature', sign.signature)
  body.append('folder', sign.folder)
  body.append('use_filename', sign.use_filename)
  body.append('unique_filename', sign.unique_filename)
  const response = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: 'POST', body })
  const result = (await response.json()) as { secure_url?: string; error?: { message?: string } }
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message ?? 'O Cloudinary recusou o ficheiro.')
  return result.secure_url
}

export function BlogEditor({ post, subjects, topics }: Props) {
  const router = useRouter()
  const feedback = useFeedback()
  const uid = useId()
  const [fields, setFields] = useState<BlogInput>(post?.fields ?? EMPTY)
  const [id, setId] = useState<string | null>(post?.id ?? null)
  const [status, setStatus] = useState<BlogStatus>(post?.status ?? 'draft')
  const [saved, setSaved] = useState(() => JSON.stringify(post?.fields ?? EMPTY))
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [slugTouched, setSlugTouched] = useState(Boolean(post))
  const [slugTaken, setSlugTaken] = useState(false)
  const [tab, setTab] = useState<'escrever' | 'previa'>('escrever')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState<'capa' | 'corpo' | null>(null)
  const [uploadError, setUploadError] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const bodyImageRef = useRef<HTMLInputElement>(null)
  const coverImageRef = useRef<HTMLInputElement>(null)
  const fieldsRef = useRef(fields)
  const idRef = useRef(id)
  // Conteúdo que o servidor recusou: o auto-guardar não repete o mesmo pedido até haver outra alteração.
  const failedRef = useRef<string | null>(null)
  fieldsRef.current = fields
  idRef.current = id

  const snapshot = JSON.stringify(fields)
  const dirty = snapshot !== saved
  const deferredBody = useDeferredValue(fields.body)
  const blocks = useMemo(() => parseBlogMarkdown(deferredBody), [deferredBody])
  const themes = topics.filter((topic) => topic.subjectId === fields.subjectId)
  const set = <K extends keyof BlogInput>(key: K, value: BlogInput[K]) => setFields((current) => ({ ...current, [key]: value }))

  // ───── Gravar ─────
  async function persist(intent: 'save' | 'publish' | 'autosave'): Promise<SaveBlogResult | null> {
    const current = { ...fieldsRef.current, slug: fieldsRef.current.slug.replace(/^-+|-+$/g, '') }
    const sent = JSON.stringify(fieldsRef.current)
    setSaveState('saving')
    try {
      const result = await saveBlogPostAction({ id: idRef.current, intent, fields: current })
      if (result.ok) {
        idRef.current = result.id
        setId(result.id)
        setStatus(result.status)
        setSaved(sent)
        failedRef.current = null
        setSavedAt(new Date())
        setSaveState('idle')
        setSaveError('')
        // O endereço do browser passa a ser o do artigo, para recarregar ou voltar atrás retomar o mesmo rascunho.
        if (window.location.pathname.endsWith('/novo')) window.history.replaceState(null, '', `/admin/blog/${result.id}`)
        // O servidor gera o endereço a partir do título quando está vazio.
        if (!fieldsRef.current.slug) setFields((now) => ({ ...now, slug: result.slug }))
      } else {
        failedRef.current = sent
        setSaveState('error')
        setSaveError(result.message)
      }
      return result
    } catch {
      failedRef.current = sent
      setSaveState('error')
      setSaveError('Sem ligação. Verifica a internet e tenta de novo.')
      return null
    }
  }
  const persistRef = useRef(persist)
  persistRef.current = persist

  // Auto-guardar: só rascunhos, 1,5 s depois da última alteração e só com um título válido.
  useEffect(() => {
    if (status === 'published' || !dirty || saveState === 'saving' || fields.title.trim().length < LIMITS.titleMin || failedRef.current === snapshot) return
    const timer = setTimeout(() => { void persistRef.current('autosave') }, 1500)
    return () => clearTimeout(timer)
  }, [snapshot, status, dirty, saveState, fields.title])

  // Aviso ao sair com alterações por guardar (fechar o separador, recarregar ou tocar numa ligação).
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!link || link.getAttribute('target') === '_blank' || (link.getAttribute('href') ?? '').startsWith('#')) return
      if (!window.confirm('Tens alterações por guardar. Sair mesmo assim?')) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); document.removeEventListener('click', onClick, true) }
  }, [dirty])

  // Retomar de onde ficou: posição do cursor e do texto guardadas neste aparelho.
  const cursorKey = post ? `twisisa:blog:cursor:${post.id}` : null
  useEffect(() => {
    if (!cursorKey || !bodyRef.current) return
    try {
      const raw = window.localStorage.getItem(cursorKey)
      if (!raw) return
      const { pos, top } = JSON.parse(raw) as { pos: number; top: number }
      const area = bodyRef.current
      if (Number.isInteger(pos) && pos <= area.value.length) area.setSelectionRange(pos, pos)
      if (Number.isFinite(top)) area.scrollTop = top
    } catch { /* sem armazenamento: segue sem retomar */ }
  }, [cursorKey])
  function rememberCursor() {
    const key = cursorKey ?? (idRef.current ? `twisisa:blog:cursor:${idRef.current}` : null)
    const area = bodyRef.current
    if (!key || !area) return
    try { window.localStorage.setItem(key, JSON.stringify({ pos: area.selectionStart, top: area.scrollTop })) } catch { /* ignorar */ }
  }

  // Endereço livre? Pergunta ao servidor enquanto escreves.
  useEffect(() => {
    const slug = fields.slug.replace(/^-+|-+$/g, '')
    if (slug.length < LIMITS.slugMin || !SLUG_PATTERN.test(slug)) { setSlugTaken(false); return }
    const timer = setTimeout(() => { checkBlogSlugAction(slug, idRef.current).then((result) => setSlugTaken(result.taken), () => setSlugTaken(false)) }, 500)
    return () => clearTimeout(timer)
  }, [fields.slug])

  // ───── Barra de formatação ─────
  function apply(next: string, from: number, to: number) {
    set('body', next)
    requestAnimationFrame(() => { const area = bodyRef.current; if (area) { area.focus(); area.setSelectionRange(from, to) } })
  }
  function wrap(before: string, after: string, placeholder: string) {
    const area = bodyRef.current
    if (!area) return
    const { selectionStart: start, selectionEnd: end } = area
    const selected = fields.body.slice(start, end) || placeholder
    apply(fields.body.slice(0, start) + before + selected + after + fields.body.slice(end), start + before.length, start + before.length + selected.length)
  }
  function prefixLines(prefix: (index: number) => string, strip?: RegExp) {
    const area = bodyRef.current
    if (!area) return
    const value = fields.body
    const from = value.lastIndexOf('\n', area.selectionStart - 1) + 1
    const found = value.indexOf('\n', area.selectionEnd)
    const to = found === -1 ? value.length : found
    const lines = value.slice(from, to).split('\n').map((line, index) => prefix(index) + (strip ? line.replace(strip, '') : line))
    const block = lines.join('\n')
    apply(value.slice(0, from) + block + value.slice(to), from, from + block.length)
  }
  function insertBlock(text: string, selectFrom: number, selectLength: number) {
    const area = bodyRef.current
    if (!area) return
    const { selectionStart: start, selectionEnd: end } = area
    const value = fields.body
    const lead = start === 0 || value.slice(0, start).endsWith('\n\n') ? '' : value.slice(0, start).endsWith('\n') ? '\n' : '\n\n'
    const trail = value.slice(end).startsWith('\n\n') || end === value.length ? '' : value.slice(end).startsWith('\n') ? '\n' : '\n\n'
    const next = value.slice(0, start) + lead + text + trail + value.slice(end)
    const at = start + lead.length + selectFrom
    apply(next, at, at + selectLength)
  }
  async function onBodyImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading('corpo')
    setUploadError('')
    try {
      const url = await uploadImage(file)
      const alt = 'Descreve a imagem'
      insertBlock(`![${alt}](${url})`, 2, alt.length)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Falha no carregamento.')
    } finally { setUploading(null) }
  }
  async function onCoverImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading('capa')
    setUploadError('')
    try { set('coverUrl', await uploadImage(file)) } catch (error) { setUploadError(error instanceof Error ? error.message : 'Falha no carregamento.') } finally { setUploading(null) }
  }

  // ───── Botões ─────
  async function save(intent: 'save' | 'publish') {
    if (busy) return
    setBusy(true)
    const result = await persist(intent)
    setBusy(false)
    if (!result) return feedback.error('Sem ligação. Verifica a internet e tenta de novo.')
    if (!result.ok) return feedback.error(result.message)
    feedback.success(result.message)
    router.refresh()
  }
  async function preview() {
    if (busy) return
    setBusy(true)
    const result = await persist('save')
    setBusy(false)
    if (!result || !result.ok) return feedback.error(result?.ok === false ? result.message : 'Sem ligação. Verifica a internet e tenta de novo.')
    router.push(`/blog/pre-visualizar/${result.id}`)
  }
  async function unpublish() {
    if (!id || busy) return
    setBusy(true)
    try {
      const data = new FormData()
      data.set('id', id)
      data.set('status', 'draft')
      const result = await setBlogStatusAction(data)
      if (result.ok) { setStatus('draft'); feedback.success(result.message ?? 'Artigo despublicado.'); router.refresh() } else feedback.error(result.message)
    } catch { feedback.error('Sem ligação. Verifica a internet e tenta de novo.') } finally { setBusy(false) }
  }

  const published = status === 'published'
  const statusText = saveState === 'saving' ? 'A guardar…' : saveState === 'error' ? `Não guardado: ${saveError}` : dirty ? 'Alterações por guardar' : savedAt ? `Guardado às ${savedAt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maputo' })}` : id ? 'Tudo guardado' : ''

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link href="/admin/blog" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-marca hover:underline">← Todos os artigos</Link>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-[clamp(1.5rem,1.3rem+1vw,2rem)] font-semibold tracking-[-0.03em]">{id ? 'Editar artigo' : 'Novo artigo'}</h1>
        <span className="text-[13px] font-semibold text-texto-2">{BLOG_STATUS_LABEL[status]}</span>
      </div>
      <p role="status" aria-live="polite" className={`mt-1 flex min-h-6 items-center gap-1.5 text-[14px] ${saveState === 'error' ? 'text-erro-texto' : 'text-texto-2'}`}>
        {saveState === 'error' && <CircleAlert size={15} aria-hidden="true" />}{statusText}
      </p>

      {/* 1. Conteúdo */}
      <section aria-labelledby={`${uid}-conteudo`} className="mt-6">
        <h2 id={`${uid}-conteudo`} className={sectionTitle}>Conteúdo</h2>
        <label className="mt-4 block text-[15px] font-medium">Título
          <input value={fields.title} maxLength={LIMITS.titleMax} onChange={(event) => { const title = event.target.value; setFields((current) => ({ ...current, title, slug: !slugTouched && status !== 'published' ? slugFromTitle(title) : current.slug })) }} className={control} placeholder="Como organizar o estudo para os exames" autoComplete="off" />
        </label>
        <label className="mt-4 block text-[15px] font-medium">Endereço
          <input value={fields.slug} maxLength={LIMITS.slugMax} onChange={(event) => { setSlugTouched(true); set('slug', cleanSlug(event.target.value)) }} onBlur={() => set('slug', fields.slug.replace(/^-+|-+$/g, ''))} aria-describedby={`${uid}-slug`} className={control} placeholder="como-organizar-o-estudo" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <span id={`${uid}-slug`} className={`mt-1.5 block text-[13px] font-normal leading-5 ${slugTaken ? 'text-erro-texto' : 'text-texto-2'}`}>
            {slugTaken ? 'Este endereço já está em uso. Escolhe outro.' : published && post && fields.slug !== post.fields.slug ? 'Mudar o endereço de um artigo publicado parte as ligações antigas.' : `twisisa.com/blog/${fields.slug || '…'}`}
          </span>
        </label>
        <label className="mt-4 block text-[15px] font-medium">Resumo
          <textarea value={fields.excerpt} maxLength={LIMITS.excerptMax} rows={3} onChange={(event) => set('excerpt', event.target.value)} aria-describedby={`${uid}-resumo`} className={control} placeholder="Uma ou duas frases. É a descrição que aparece no Google." />
          <span id={`${uid}-resumo`} className="mt-1.5 block text-right text-[13px] font-normal text-texto-2" aria-live="polite">{fields.excerpt.length}/{LIMITS.excerptMax}</span>
        </label>

        <div className="mt-4">
          <span className="text-[15px] font-medium">Texto <span className="font-normal text-texto-2">(Markdown)</span></span>
          <div role="tablist" aria-label="Escrever ou pré-visualizar" className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-marca-suave p-1 lg:hidden">
            {(['escrever', 'previa'] as const).map((item) => (
              <button key={item} type="button" role="tab" id={`${uid}-tab-${item}`} aria-selected={tab === item} aria-controls={`${uid}-painel-${item}`} onClick={() => setTab(item)} className={`min-h-11 rounded-lg text-[15px] font-semibold ${tab === item ? 'bg-white text-marca' : 'text-texto-2'}`}>
                {item === 'escrever' ? 'Escrever' : 'Pré-visualizar'}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-5 lg:grid-cols-2">
            <div id={`${uid}-painel-escrever`} role="tabpanel" aria-labelledby={`${uid}-tab-escrever`} className={`${tab === 'escrever' ? '' : 'hidden'} min-w-0 lg:block`}>
              <div role="toolbar" aria-label="Formatação" className="flex gap-0.5 overflow-x-auto border-b border-linha pb-1">
                <button type="button" className={toolButton} aria-label="Negrito" title="Negrito" onClick={() => wrap('**', '**', 'texto')}><Bold size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Título (h2)" title="Título" onClick={() => prefixLines(() => '## ', /^#{1,6}\s+/)}><Heading2 size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Subtítulo (h3)" title="Subtítulo" onClick={() => prefixLines(() => '### ', /^#{1,6}\s+/)}><Heading3 size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Lista" title="Lista" onClick={() => prefixLines(() => '- ')}><List size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Citação" title="Citação" onClick={() => prefixLines(() => '> ')}><Quote size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Ligação" title="Ligação" onClick={() => wrap('[', '](https://)', 'texto da ligação')}><Link2 size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Imagem" title="Imagem" disabled={uploading !== null} onClick={() => bodyImageRef.current?.click()}><ImagePlus size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Fórmula" title="Fórmula" onClick={() => wrap('$', '$', 'x^2')}><Sigma size={18} aria-hidden="true" /></button>
                <button type="button" className={toolButton} aria-label="Tabela" title="Tabela" onClick={() => insertBlock('| Coluna 1 | Coluna 2 |\n|---|---|\n| a | b |', 2, 8)}><Table size={18} aria-hidden="true" /></button>
                <input ref={bodyImageRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={onBodyImage} className="sr-only" tabIndex={-1} aria-hidden="true" />
              </div>
              {uploading === 'corpo' && <p className="mt-2 text-[14px] text-texto-2" role="status">A carregar a imagem…</p>}
              <textarea ref={bodyRef} value={fields.body} maxLength={LIMITS.bodyMax} onChange={(event) => set('body', event.target.value)} onBlur={rememberCursor} aria-label="Texto do artigo em Markdown" className={`${control} mt-2 min-h-[22rem] resize-y font-mono text-[16px] leading-7 lg:min-h-[32rem]`} placeholder={'## Primeiro título\n\nEscreve aqui. Usa a barra de cima para formatar.'} spellCheck />
              <p className="mt-1.5 text-[13px] leading-5 text-texto-2">Fórmulas: <code>$x^2$</code> na linha e <code>$$\frac{'{a}{b}'}$$</code> em bloco. Imagem sozinha numa linha. O título do artigo é o título principal: usa ## e ### lá dentro.</p>
            </div>
            <div id={`${uid}-painel-previa`} role="tabpanel" aria-labelledby={`${uid}-tab-previa`} className={`${tab === 'previa' ? '' : 'hidden'} min-w-0 lg:block`}>
              <div className="rounded-xl border border-linha px-4 py-5 lg:min-h-[32rem]">
                {fields.body.trim() ? <BlogBody blocks={blocks} /> : <p className="text-[15px] text-texto-2">A pré-visualização aparece aqui à medida que escreves.</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Capa */}
      <section aria-labelledby={`${uid}-capa`} className="mt-10 border-t border-linha pt-6">
        <h2 id={`${uid}-capa`} className={sectionTitle}>Capa</h2>
        {fields.coverUrl && (
          <div className="mt-4 aspect-video w-full max-w-md overflow-hidden rounded-md bg-linha/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fields.coverUrl} alt={fields.coverAlt || 'Capa do artigo'} className="size-full object-cover" />
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-secundario" disabled={uploading !== null} onClick={() => coverImageRef.current?.click()}>{uploading === 'capa' ? 'A carregar…' : fields.coverUrl ? 'Trocar capa' : 'Carregar capa'}</button>
          {fields.coverUrl && <button type="button" className="btn btn-terciario" onClick={() => { set('coverUrl', ''); set('coverAlt', '') }}><X size={16} aria-hidden="true" />Remover</button>}
          <input ref={coverImageRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={onCoverImage} className="sr-only" tabIndex={-1} aria-hidden="true" />
        </div>
        <p className="mt-2 text-[13px] text-texto-2">PNG, JPG ou WebP, até 3 MB. Melhor em 16:9 (1600×900).</p>
        {uploadError && <p role="alert" className="mt-2 text-[14px] text-erro-texto">{uploadError}</p>}
        {fields.coverUrl && (
          <label className="mt-4 block text-[15px] font-medium">Texto alternativo da capa
            <input value={fields.coverAlt} maxLength={LIMITS.altMax} onChange={(event) => set('coverAlt', event.target.value)} className={control} placeholder="Estudantes a resolver exercícios de Matemática" />
            <span className="mt-1.5 block text-[13px] font-normal text-texto-2">Obrigatório: descreve a imagem para quem não a vê.</span>
          </label>
        )}
      </section>

      {/* 3. Classificação */}
      <section aria-labelledby={`${uid}-classificacao`} className="mt-10 border-t border-linha pt-6">
        <h2 id={`${uid}-classificacao`} className={sectionTitle}>Classificação</h2>
        <label className="mt-4 block text-[15px] font-medium">Percurso
          <select value={fields.track} onChange={(event) => set('track', event.target.value)} className={control}>
            <option value="">Geral (todos os percursos)</option>
            {BLOG_TRACKS.map((track) => <option key={track} value={track}>{BLOG_TRACK_LABEL[track]}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-[15px] font-medium">Disciplina
          <select value={fields.subjectId} onChange={(event) => setFields((current) => ({ ...current, subjectId: event.target.value, themeId: '' }))} className={control}>
            <option value="">Sem disciplina</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
        <label className="mt-4 block text-[15px] font-medium">Tema
          <select value={fields.themeId} disabled={!fields.subjectId || themes.length === 0} onChange={(event) => set('themeId', event.target.value)} className={`${control} disabled:opacity-60`}>
            <option value="">{!fields.subjectId ? 'Escolhe primeiro a disciplina' : themes.length === 0 ? 'Esta disciplina ainda não tem temas' : 'Sem tema'}</option>
            {themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
          </select>
          <span className="mt-1.5 block text-[13px] font-normal text-texto-2">O botão «Praticar este tema» do artigo leva o aluno ao Simulador neste tema.</span>
        </label>
        <label className="mt-4 block text-[15px] font-medium">Etiquetas
          <input value={fields.tags} onChange={(event) => set('tags', event.target.value)} className={control} placeholder="exame, método de estudo, 12ª classe" autoCapitalize="none" />
          <span className="mt-1.5 block text-[13px] font-normal text-texto-2">Separadas por vírgula. No máximo {LIMITS.tagsMax}.</span>
        </label>
      </section>

      {/* 4. Publicação */}
      <section aria-labelledby={`${uid}-publicacao`} className="mt-10 border-t border-linha pt-6 pb-10">
        <h2 id={`${uid}-publicacao`} className={sectionTitle}>Publicação</h2>
        <p className="mt-3 text-[15px] leading-6 text-texto-2">
          {published ? 'Este artigo está publicado. As alterações ficam visíveis assim que guardares.' : 'Os rascunhos são guardados sozinhos. Só a equipa os vê, na pré-visualização.'}
        </p>
        <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
          {published ? (
            <>
              <button type="button" className="btn btn-primario btn-grande" disabled={busy} onClick={() => save('save')}>Guardar alterações</button>
              <button type="button" className="btn btn-secundario btn-grande" disabled={busy} onClick={unpublish}>Despublicar</button>
              <Link href={`/blog/${fields.slug}`} className="btn btn-terciario btn-grande">Ver no site</Link>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primario btn-grande" disabled={busy} onClick={() => save('publish')}>Publicar</button>
              <button type="button" className="btn btn-secundario btn-grande" disabled={busy || fields.title.trim().length < LIMITS.titleMin} onClick={() => save('save')}>Guardar rascunho</button>
              <button type="button" className="btn btn-terciario btn-grande" disabled={busy || fields.title.trim().length < LIMITS.titleMin} onClick={preview}>Pré-visualizar</button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
TWISISA_FIM_10
mkdir -p "components/blog"
cat > "components/blog/article-view.tsx" <<'TWISISA_FIM_11'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpenCheck } from 'lucide-react'
import { BlogBody } from '@/components/blog/blog-body'
import { Toc } from '@/components/blog/toc'
import { ShareButton } from '@/components/blog/share-button'
import { parseBlogMarkdown, showToc, tableOfContents } from '@/lib/blog-markdown'
import { BLOG_TRACK_LABEL, blogPath, dataCurta, dataLonga, practiceLink } from '@/lib/blog-pure'
import { SITE_URL } from '@/lib/seo'
import type { BlogPost, BlogSummary } from '@/lib/blog'

export const categoryLabel = (post: Pick<BlogSummary, 'subjectName' | 'themeName' | 'track'>) =>
  [post.subjectName, post.themeName ?? (post.track ? BLOG_TRACK_LABEL[post.track] : null)].filter(Boolean).join(' · ')

// O artigo (cabeçalho, capa, corpo, praticar, relacionados, partilhar). Serve /blog/[slug] e a pré-visualização da equipa.
export function ArticleView({ post, related }: { post: BlogPost; related: BlogSummary[] }) {
  const blocks = parseBlogMarkdown(post.body)
  const toc = tableOfContents(blocks)
  const practice = practiceLink(post)
  const label = categoryLabel(post)
  const when = post.publishedAt ?? post.updatedAt
  return (
    <>
      <article>
        <header className="mx-auto max-w-[680px]">
          {label && <p className="text-[13px] font-semibold text-marca">{label}</p>}
          <h1 className="mt-2 text-[clamp(1.75rem,1.4rem+1.8vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.035em] text-balance">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-[18px] leading-7 text-texto-2">{post.excerpt}</p>}
          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-texto-2">
            <span>{post.authorName ?? 'Equipa Twisisa'}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={when.toISOString()}>{dataLonga(when)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min de leitura</span>
          </p>
        </header>

        {post.coverUrl && (
          <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-md bg-linha/40">
            <Image src={post.coverUrl} alt={post.coverAlt ?? ''} fill priority sizes="(min-width: 800px) 760px, 100vw" className="object-cover" />
          </div>
        )}

        <div className="mx-auto mt-8 max-w-[680px]">
          {showToc(toc) && <Toc items={toc} />}
          <div className={showToc(toc) ? 'mt-8' : ''}><BlogBody blocks={blocks} /></div>
        </div>
      </article>

      <div className="mx-auto mt-14 max-w-[680px]">
        <section aria-labelledby="praticar" className="border-t border-linha pt-8">
          <h2 id="praticar" className="text-[clamp(1.375rem,1.2rem+0.9vw,1.75rem)] font-semibold leading-[1.25] tracking-[-0.03em]">Agora pratica</h2>
          <p className="mt-2 text-[16px] leading-7 text-texto-2">Ler ajuda. Resolver questões é que fixa a matéria.</p>
          <Link href={practice.href} className="btn btn-primario btn-grande mt-5 w-full sm:w-auto">{practice.label}</Link>
        </section>

        {related.length > 0 && (
          <nav aria-labelledby="relacionados" className="mt-12 border-t border-linha pt-8">
            <h2 id="relacionados" className="flex items-center gap-2 text-[15px] font-semibold text-ajuda"><BookOpenCheck size={18} aria-hidden="true" />Matéria relacionada</h2>
            <ul className="mt-2 divide-y divide-linha">
              {related.map((item) => (
                <li key={item.id}>
                  <Link href={blogPath(item.slug)} className="block py-4 hover:text-marca">
                    <span className="block text-[18px] font-semibold leading-6 tracking-[-0.01em]">{item.title}</span>
                    <span className="mt-1 block text-[14px] text-texto-2">{item.publishedAt ? dataCurta(item.publishedAt) : ''} · {item.readingMinutes} min de leitura</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-10 border-t border-linha pt-4">
          <ShareButton url={`${SITE_URL}${blogPath(post.slug)}`} title={post.title} />
        </div>
      </div>
    </>
  )
}
TWISISA_FIM_11
mkdir -p "components/blog"
cat > "components/blog/blog-body.tsx" <<'TWISISA_FIM_12'
import Link from 'next/link'
import { MathBlock, MathText } from '@/lib/math-text'
import type { Block, Inline } from '@/lib/blog-markdown'

// Desenha a árvore do Markdown do blog como elementos React (nunca HTML em bruto). Serve o artigo, a pré-visualização
// do administrador e o editor. Medidas: texto 17px (18px no desktop), entrelinha 1,75, espaço entre parágrafos 1,25em.
// Tabelas e fórmulas largas rolam dentro do próprio bloco; a página nunca rola na horizontal.

const H2 = 'mt-12 scroll-mt-6 text-[clamp(1.375rem,1.2rem+0.9vw,1.75rem)] font-semibold leading-[1.25] tracking-[-0.03em] text-texto'
const H3 = 'mt-9 scroll-mt-6 text-[clamp(1.125rem,1.05rem+0.4vw,1.25rem)] font-semibold leading-[1.3] tracking-[-0.02em] text-texto'

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((item, index) => {
        switch (item.t) {
          case 'text':
            return <span key={index}>{item.v}</span>
          case 'bold':
            return <strong key={index} className="font-semibold text-texto"><Inlines items={item.c} /></strong>
          case 'italic':
            return <em key={index}><Inlines items={item.c} /></em>
          case 'code':
            return <code key={index} className="rounded bg-linha/40 px-1.5 py-0.5 text-[0.9em]">{item.v}</code>
          case 'math':
            return <MathText key={index} text={`$${item.v}$`} className="!whitespace-normal" />
          case 'link': {
            const className = 'underline decoration-1 underline-offset-[3px] hover:text-marca'
            return item.href.startsWith('/') || item.href.startsWith('#')
              ? <Link key={index} href={item.href} className={className}><Inlines items={item.c} /></Link>
              : <a key={index} href={item.href} rel="noopener noreferrer" className={className}><Inlines items={item.c} /></a>
          }
        }
      })}
    </>
  )
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.t) {
          case 'h':
            return block.level === 2
              ? <h2 key={index} id={block.id} className={H2}><Inlines items={block.c} /></h2>
              : <h3 key={index} id={block.id} className={H3}><Inlines items={block.c} /></h3>
          case 'p':
            return <p key={index} className="mt-[1.25em]"><Inlines items={block.c} /></p>
          case 'ul':
            return <ul key={index} className="mt-[1.25em] list-disc space-y-2 pl-6 marker:text-texto-2">{block.items.map((item, i) => <li key={i} className="pl-1"><Inlines items={item} /></li>)}</ul>
          case 'ol':
            return <ol key={index} start={block.start} className="mt-[1.25em] list-decimal space-y-2 pl-6 marker:text-texto-2">{block.items.map((item, i) => <li key={i} className="pl-1"><Inlines items={item} /></li>)}</ol>
          case 'quote':
            return <blockquote key={index} className="mt-[1.25em] border-l-2 border-linha pl-5 text-texto-2"><Blocks blocks={block.c} /></blockquote>
          case 'code':
            return <pre key={index} className="mt-[1.25em] overflow-x-auto rounded-md bg-linha/40 p-4 text-[14px] leading-6"><code>{block.v}</code></pre>
          case 'math':
            return <div key={index} className="mt-[1.25em] max-w-full overflow-x-auto"><MathBlock text={`$$${block.v}$$`} /></div>
          case 'image':
            return (
              <figure key={index} className="mt-[1.25em] sm:-mx-10">
                {/* Largura total até 760px; sem dimensões conhecidas, a imagem reserva a altura ao carregar. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.src} alt={block.alt} loading="lazy" decoding="async" className="h-auto w-full rounded-md" />
                {block.alt && <figcaption className="mt-2 text-[14px] leading-6 text-texto-2">{block.alt}</figcaption>}
              </figure>
            )
          case 'hr':
            return <hr key={index} className="my-10 border-linha" />
          case 'table':
            return (
              <div key={index} className="mt-[1.25em] overflow-x-auto sm:-mx-10" tabIndex={0} role="region" aria-label="Tabela">
                <table className="w-full min-w-[30rem] border-collapse text-left text-[15px] leading-6">
                  <thead>
                    <tr>{block.head.map((cell, i) => <th key={i} scope="col" style={{ textAlign: block.align[i] ?? undefined }} className="border-b border-texto/30 px-3 py-2 font-semibold"><Inlines items={cell} /></th>)}</tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => <tr key={r}>{row.map((cell, i) => <td key={i} style={{ textAlign: block.align[i] ?? undefined }} className="border-b border-linha px-3 py-2 align-top"><Inlines items={cell} /></td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </>
  )
}

export function BlogBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="text-[17px] leading-[1.75] text-texto sm:text-[18px] [&>*:first-child]:mt-0 [&_h2:first-child]:mt-0">
      <Blocks blocks={blocks} />
    </div>
  )
}
TWISISA_FIM_12
mkdir -p "components/blog"
cat > "components/blog/blog-shell.tsx" <<'TWISISA_FIM_13'
import Link from 'next/link'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Brand } from '@/components/brand'

// Moldura pública do blog: uma só vista para visitantes e para quem tem sessão (só muda a ligação do cabeçalho).
// Sem elementos fixos na base do ecrã: o CookieCard já ocupa essa zona e taparia a leitura.
export async function BlogShell({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  const signedIn = Boolean(session?.user)
  return (
    <div className="min-h-dvh bg-fundo text-texto">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-3 focus:z-10 focus:rounded-md focus:bg-fundo focus:px-3 focus:py-2 focus:text-marca">Saltar para o conteúdo</a>
      <header className="mx-auto flex min-h-16 w-full max-w-[760px] items-center justify-between gap-4 px-5">
        <Brand />
        <Link href={signedIn ? '/aluno' : '/sign-in'} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-marca underline-offset-4 hover:underline">{signedIn ? 'Ir para o painel' : 'Entrar'}</Link>
      </header>
      {children}
      <footer className="mx-auto mt-16 w-full max-w-[760px] border-t border-linha px-5 py-8 text-[14px] text-texto-2">
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5">
          <Link href="/blog" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Blog</Link>
          <Link href="/termos" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Termos</Link>
          <Link href="/privacidade" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Privacidade</Link>
        </nav>
      </footer>
    </div>
  )
}
TWISISA_FIM_13
mkdir -p "components/blog"
cat > "components/blog/share-button.tsx" <<'TWISISA_FIM_14'
'use client'

import { useEffect, useState } from 'react'
import { Link2, Share2 } from 'lucide-react'

// Partilhar: navigator.share no telemóvel (o WhatsApp é o canal principal) e «Copiar ligação» como alternativa.
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [canShare, setCanShare] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => { setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function') }, [])

  async function share() {
    try { await navigator.share({ title, url }) } catch { /* partilha cancelada */ }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Ligação copiada.')
    } catch {
      setMessage('Não foi possível copiar. Copia o endereço da barra do browser.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {canShare && <button type="button" onClick={share} className="btn btn-terciario"><Share2 size={17} aria-hidden="true" />Partilhar</button>}
      <button type="button" onClick={copy} className="btn btn-terciario"><Link2 size={17} aria-hidden="true" />Copiar ligação</button>
      <span role="status" aria-live="polite" className="text-[14px] text-texto-2">{message}</span>
    </div>
  )
}
TWISISA_FIM_14
mkdir -p "components/blog"
cat > "components/blog/toc.tsx" <<'TWISISA_FIM_15'
import type { TocItem } from '@/lib/blog-markdown'

// Índice do artigo: <details> recolhido, sem JavaScript e sem barra lateral.
export function Toc({ items }: { items: TocItem[] }) {
  return (
    <details className="group mt-8 border-y border-linha">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
        Neste artigo
        <span aria-hidden="true" className="text-texto-2 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <nav aria-label="Índice do artigo" className="pb-4">
        <ol className="space-y-1">
          {items.map((item) => (
            <li key={item.id} className={item.level === 3 ? 'pl-5' : ''}>
              <a href={`#${item.id}`} className="inline-flex min-h-11 items-center text-[16px] leading-6 underline-offset-4 hover:text-marca hover:underline">{item.text}</a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  )
}
TWISISA_FIM_15
mkdir -p "database/migrations"
cat > "database/migrations/0039_blog.sql" <<'TWISISA_FIM_16'
-- Blog do Twisisa: artigos de estudo escritos pela administração (Markdown).
-- Escrita: /admin/blog (só administração). Leitura pública: só o que tem status = 'published' e published_at <= now().
CREATE TABLE IF NOT EXISTS blog_posts (
  id              text PRIMARY KEY,
  slug            text NOT NULL,
  title           text NOT NULL,
  excerpt         text NOT NULL DEFAULT '',
  body            text NOT NULL DEFAULT '',
  cover_url       text,
  cover_alt       text,
  status          text NOT NULL DEFAULT 'draft',
  published_at    timestamptz,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  author_id       text REFERENCES "user"(id) ON DELETE SET NULL,
  reading_minutes integer NOT NULL DEFAULT 1,
  track           text,
  subject_id      text REFERENCES library_subjects(id) ON DELETE SET NULL,
  theme_id        text REFERENCES topics(id) ON DELETE SET NULL,
  tags            text[] NOT NULL DEFAULT '{}',
  CONSTRAINT blog_posts_slug_unique UNIQUE (slug),
  CONSTRAINT blog_posts_slug_format CHECK (char_length(slug) BETWEEN 3 AND 90 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT blog_posts_title_len CHECK (char_length(title) BETWEEN 5 AND 120),
  CONSTRAINT blog_posts_excerpt_len CHECK (char_length(excerpt) <= 160),
  CONSTRAINT blog_posts_body_len CHECK (char_length(body) <= 100000),
  CONSTRAINT blog_posts_status CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT blog_posts_track CHECK (track IS NULL OR track IN ('10', '12', 'admissao')),
  CONSTRAINT blog_posts_reading CHECK (reading_minutes BETWEEN 1 AND 240),
  CONSTRAINT blog_posts_cover_url CHECK (cover_url IS NULL OR (cover_url ~ '^https://' AND char_length(cover_url) <= 500)),
  CONSTRAINT blog_posts_cover_alt CHECK (cover_alt IS NULL OR char_length(cover_alt) <= 160),
  CONSTRAINT blog_posts_cover_needs_alt CHECK (cover_url IS NULL OR char_length(btrim(coalesce(cover_alt, ''))) > 0),
  CONSTRAINT blog_posts_tags_len CHECK (cardinality(tags) <= 8),
  CONSTRAINT blog_posts_theme_needs_subject CHECK (theme_id IS NULL OR subject_id IS NOT NULL),
  CONSTRAINT blog_posts_published_complete CHECK (
    status <> 'published' OR (published_at IS NOT NULL AND char_length(btrim(excerpt)) > 0 AND char_length(btrim(body)) > 0)
  )
);
CREATE INDEX IF NOT EXISTS blog_posts_status_published_idx ON blog_posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_subject_idx ON blog_posts (subject_id);
CREATE INDEX IF NOT EXISTS blog_posts_track_idx ON blog_posts (track);

-- Versão anterior de cada gravação (o código guarda as últimas 20 por artigo).
CREATE TABLE IF NOT EXISTS blog_post_revisions (
  id       bigserial PRIMARY KEY,
  post_id  text NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  title    text NOT NULL,
  body     text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  saved_by text REFERENCES "user"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS blog_post_revisions_post_idx ON blog_post_revisions (post_id, saved_at DESC);
TWISISA_FIM_16
mkdir -p "lib"
cat > "lib/blog-markdown.ts" <<'TWISISA_FIM_17'
// Markdown do blog: um subconjunto pequeno e seguro. Código puro (sem React): serve a página, a pré-visualização e os testes.
// Nunca produz HTML: devolve uma árvore que o componente desenha como elementos React, por isso HTML escrito no texto
// aparece como texto. Ligações e imagens passam por uma lista de endereços permitidos.
// Suporta: títulos (# e ## viram h2, ### e seguintes h3: o h1 é o título do artigo), parágrafos, **negrito**, *itálico*,
// `código`, listas, citações, tabelas, ligações, imagens sozinhas numa linha e fórmulas ($...$ e $$...$$).
import { slugify } from './slug'

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; c: Inline[] }
  | { t: 'italic'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'math'; v: string }
  | { t: 'link'; href: string; c: Inline[] }

export type Block =
  | { t: 'h'; level: 2 | 3; id: string; c: Inline[] }
  | { t: 'p'; c: Inline[] }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; start: number; items: Inline[][] }
  | { t: 'quote'; c: Block[] }
  | { t: 'code'; lang: string; v: string }
  | { t: 'math'; v: string }
  | { t: 'image'; src: string; alt: string }
  | { t: 'hr' }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][]; align: ('left' | 'center' | 'right' | null)[] }

const MAX_INLINE = 20_000
const MAX_QUOTE_DEPTH = 3
const ESCAPABLE = '\\`*_$[]()#!>|-+.'

/** Endereço de ligação permitido (https, http, mailto, caminho do site ou âncora). Qualquer outro (javascript:, data:…) é recusado. */
export function safeHref(raw: string): string | null {
  const url = raw.trim()
  if (!url || url.length > 2000) return null
  const probe = url.replace(/[\u0000-\u001f\u007f\s]/g, '')
  if (probe !== url) return null
  if (/^https?:\/\/[^/\s]+/i.test(url)) {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : null
    } catch {
      return null
    }
  }
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(url)) return url
  if (/^\/(?!\/)/.test(url)) return url
  if (/^#[\w-]+$/.test(url)) return url
  return null
}

/** Imagens: só https ou caminhos do próprio site. */
export function safeImageSrc(raw: string): string | null {
  const url = raw.trim()
  if (!url || url.length > 2000 || /[\u0000-\u001f\u007f\s]/.test(url)) return null
  if (/^https:\/\/[^/]+/i.test(url)) return url
  if (/^\/(?!\/)/.test(url)) return url
  return null
}

const MATH = /\$([^$\n]+?)\$/y
const CODE = /`([^`\n]+?)`/y
const BOLD = /\*\*(?!\s)([^\n]+?)(?<!\s)\*\*/y
const ITALIC_STAR = /\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?!\*)/y
const ITALIC_UNDER = /_(?![\s_])([^_\n]+?)(?<![\s_])_(?![\p{L}\p{N}_])/uy
const LINK = /\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"[^"\n]*")?\)/y

function at(re: RegExp, src: string, index: number) {
  re.lastIndex = index
  return re.exec(src)
}

export function parseInline(src: string): Inline[] {
  if (src.length > MAX_INLINE) return [{ t: 'text', v: src }]
  const out: Inline[] = []
  let buf = ''
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf })
    buf = ''
  }
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === '\\' && i + 1 < src.length && ESCAPABLE.includes(src[i + 1])) {
      buf += src[i + 1]
      i += 2
      continue
    }
    if (ch === '`') {
      const m = at(CODE, src, i)
      if (m) { flush(); out.push({ t: 'code', v: m[1] }); i += m[0].length; continue }
    } else if (ch === '$') {
      const m = at(MATH, src, i)
      if (m && !/^\s|\s$/.test(m[1])) { flush(); out.push({ t: 'math', v: m[1] }); i += m[0].length; continue }
    } else if (ch === '*') {
      const bold = at(BOLD, src, i)
      if (bold) { flush(); out.push({ t: 'bold', c: parseInline(bold[1]) }); i += bold[0].length; continue }
      const italic = at(ITALIC_STAR, src, i)
      if (italic) { flush(); out.push({ t: 'italic', c: parseInline(italic[1]) }); i += italic[0].length; continue }
    } else if (ch === '_' && (i === 0 || !/[\p{L}\p{N}_]/u.test(src[i - 1]))) {
      const italic = at(ITALIC_UNDER, src, i)
      if (italic) { flush(); out.push({ t: 'italic', c: parseInline(italic[1]) }); i += italic[0].length; continue }
    } else if (ch === '[') {
      const m = at(LINK, src, i)
      if (m) {
        const href = safeHref(m[2])
        flush()
        const inner = parseInline(m[1])
        // Ligação não permitida: fica só o texto.
        if (href) out.push({ t: 'link', href, c: inner })
        else out.push(...inner)
        i += m[0].length
        continue
      }
    }
    buf += ch
    i += 1
  }
  flush()
  return out
}

export function plainText(inlines: Inline[]): string {
  return inlines.map((item) => (item.t === 'text' || item.t === 'code' || item.t === 'math' ? item.v : plainText(item.c))).join('')
}

/** Divide uma linha de tabela em células sem partir `|` dentro de fórmulas ($|x|$) nem `\|`. */
export function splitCells(line: string): string[] {
  let text = line.trim()
  if (text.startsWith('|')) text = text.slice(1)
  if (text.endsWith('|') && !text.endsWith('\\|')) text = text.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  let inMath = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\\' && text[i + 1] === '|') { cell += '|'; i += 1; continue }
    if (ch === '\\' && text[i + 1] === '$') { cell += '\\$'; i += 1; continue }
    if (ch === '$') inMath = !inMath
    if (ch === '|' && !inMath) { cells.push(cell.trim()); cell = ''; continue }
    cell += ch
  }
  cells.push(cell.trim())
  return cells
}

const FENCE = /^\s*```(\S*)\s*$/
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/
const HR = /^\s*([-*_])(\s*\1){2,}\s*$/
const UL = /^\s*[-*+]\s+(.*)$/
const OL = /^\s*(\d{1,4})[.)]\s+(.*)$/
const IMAGE = /^\s*!\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"\n]*")?\)\s*$/
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/

const startsBlock = (line: string, next: string | undefined) =>
  FENCE.test(line) || HEADING.test(line) || HR.test(line) || UL.test(line) || OL.test(line) || IMAGE.test(line) || /^\s*>/.test(line) || /^\s*\$\$/.test(line) ||
  (line.includes('|') && next !== undefined && TABLE_SEP.test(next) && next.includes('|'))

function parseBlocks(lines: string[], depth: number, used: Map<string, number>): Block[] {
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i += 1; continue }

    if (FENCE.test(line)) {
      const lang = FENCE.exec(line)![1].slice(0, 20)
      const code: string[] = []
      i += 1
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { code.push(lines[i]); i += 1 }
      i += 1
      blocks.push({ t: 'code', lang, v: code.join('\n') })
      continue
    }

    if (/^\s*\$\$/.test(line)) {
      const first = line.trim().slice(2)
      if (first.endsWith('$$') && first.length > 2) { blocks.push({ t: 'math', v: first.slice(0, -2).trim() }); i += 1; continue }
      const parts = [first]
      i += 1
      while (i < lines.length && !lines[i].trim().endsWith('$$')) { parts.push(lines[i]); i += 1 }
      if (i < lines.length) parts.push(lines[i].trim().slice(0, -2))
      i += 1
      const v = parts.join('\n').trim()
      if (v) blocks.push({ t: 'math', v })
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      const c = parseInline(heading[2])
      const base = slugify(plainText(c)) || 'secao'
      const count = used.get(base) ?? 0
      used.set(base, count + 1)
      blocks.push({ t: 'h', level: heading[1].length <= 2 ? 2 : 3, id: count === 0 ? base : `${base}-${count + 1}`, c })
      i += 1
      continue
    }

    if (HR.test(line)) { blocks.push({ t: 'hr' }); i += 1; continue }

    const image = IMAGE.exec(line)
    if (image) {
      const src = safeImageSrc(image[2])
      if (src) blocks.push({ t: 'image', src, alt: image[1].trim() })
      else if (image[1].trim()) blocks.push({ t: 'p', c: [{ t: 'text', v: image[1].trim() }] })
      i += 1
      continue
    }

    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]) && lines[i + 1].includes('|')) {
      const head = splitCells(line)
      const align = splitCells(lines[i + 1]).map((cell) => (cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : cell.startsWith(':') ? 'left' : null)) as ('left' | 'center' | 'right' | null)[]
      const rows: Inline[][][] = []
      i += 2
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        const cells = splitCells(lines[i])
        rows.push(head.map((_, index) => parseInline(cells[index] ?? '')))
        i += 1
      }
      blocks.push({ t: 'table', head: head.map((cell) => parseInline(cell)), rows, align })
      continue
    }

    if (/^\s*>/.test(line)) {
      const inner: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) { inner.push(lines[i].replace(/^\s*> ?/, '')); i += 1 }
      if (depth >= MAX_QUOTE_DEPTH) blocks.push({ t: 'p', c: parseInline(inner.join(' ').trim()) })
      else blocks.push({ t: 'quote', c: parseBlocks(inner, depth + 1, used) })
      continue
    }

    const ordered = OL.exec(line)
    if (UL.test(line) || ordered) {
      const isOrdered = Boolean(ordered)
      const start = ordered ? Number(ordered[1]) : 1
      const items: string[] = []
      while (i < lines.length && lines[i].trim()) {
        const ul = UL.exec(lines[i])
        const ol = OL.exec(lines[i])
        if (isOrdered ? ol : ul) { items.push(((isOrdered ? ol : ul)![isOrdered ? 2 : 1]) ?? ''); i += 1 }
        else if (ul || ol) break
        else if (/^\s{2,}\S/.test(lines[i]) && items.length) { items[items.length - 1] += ` ${lines[i].trim()}`; i += 1 }
        else break
      }
      const parsed = items.map((item) => parseInline(item.trim()))
      blocks.push(isOrdered ? { t: 'ol', start, items: parsed } : { t: 'ul', items: parsed })
      continue
    }

    const para: string[] = [line.trim()]
    i += 1
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i], lines[i + 1])) { para.push(lines[i].trim()); i += 1 }
    blocks.push({ t: 'p', c: parseInline(para.join(' ')) })
  }
  return blocks
}

export function parseBlogMarkdown(src: string): Block[] {
  return parseBlocks(src.replace(/\r\n?/g, '\n').split('\n'), 0, new Map())
}

export type TocItem = { id: string; text: string; level: 2 | 3 }
/** Títulos para o índice. */
export function tableOfContents(blocks: Block[]): TocItem[] {
  return blocks.flatMap((block) => (block.t === 'h' ? [{ id: block.id, text: plainText(block.c), level: block.level }] : []))
}
/** O índice só aparece em artigos com 3 ou mais h2. */
export const showToc = (items: TocItem[]) => items.filter((item) => item.level === 2).length >= 3
TWISISA_FIM_17
mkdir -p "lib"
cat > "lib/blog-pure.ts" <<'TWISISA_FIM_18'
// Regras do blog que não dependem da base de dados nem do React: validação, tempo de leitura, visibilidade.
// Servem o servidor (acções e leitura), o formulário e os testes.
import { slugify } from './slug'

export const BLOG_PAGE_SIZE = 12
export const BLOG_TRACKS = ['10', '12', 'admissao'] as const
export type BlogTrack = (typeof BLOG_TRACKS)[number]
export const BLOG_TRACK_LABEL: Record<BlogTrack, string> = { '10': '10ª classe', '12': '12ª classe', admissao: 'Admissão' }
export const BLOG_STATUSES = ['draft', 'published', 'archived'] as const
export type BlogStatus = (typeof BLOG_STATUSES)[number]
export const BLOG_STATUS_LABEL: Record<BlogStatus, string> = { draft: 'Rascunho', published: 'Publicado', archived: 'Arquivado' }

export const LIMITS = { titleMin: 5, titleMax: 120, slugMin: 3, slugMax: 90, excerptMax: 160, bodyMax: 100_000, altMax: 160, tagsMax: 8, tagMax: 24 } as const
// Endereços que não podem ser de artigos (já têm outro uso dentro de /blog).
export const RESERVED_SLUGS = ['pre-visualizar', 'feed', 'novo']
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const isBlogTrack = (value: unknown): value is BlogTrack => typeof value === 'string' && (BLOG_TRACKS as readonly string[]).includes(value)
export const isBlogStatus = (value: unknown): value is BlogStatus => typeof value === 'string' && (BLOG_STATUSES as readonly string[]).includes(value)

/** Endereço sugerido a partir do título: minúsculas, sem acentos, hífens, no máximo 90 caracteres. */
export function slugFromTitle(title: string) {
  return slugify(title).slice(0, LIMITS.slugMax).replace(/-+$/, '')
}

/** Minutos de leitura (200 palavras por minuto, mínimo 1). Ignora marcas do Markdown, fórmulas, blocos de código e ligações de imagens. */
export function readingMinutes(body: string) {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]+?\$/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|~-]+/g, ' ')
  const words = text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
  return Math.max(1, Math.ceil(words / 200))
}

/** Só é público o que está publicado e já passou a hora de publicação. */
export function isPublicNow(post: { status: string; publishedAt: Date | null }, now: Date = new Date()) {
  return post.status === 'published' && post.publishedAt !== null && post.publishedAt.getTime() <= now.getTime()
}

/** Etiquetas: separadas por vírgula ou linha, em minúsculas, sem repetidas. Devolve também o que foi recusado. */
export function parseTags(raw: string) {
  const tags: string[] = []
  for (const part of raw.split(/[,\n]/)) {
    const tag = part.trim().toLowerCase().replace(/\s+/g, ' ')
    if (tag && !tags.includes(tag)) tags.push(tag)
  }
  return tags
}

export type BlogInput = {
  title: string
  slug: string
  excerpt: string
  body: string
  coverUrl: string
  coverAlt: string
  track: string
  subjectId: string
  themeId: string
  tags: string
}
export type BlogClean = {
  title: string
  slug: string
  excerpt: string
  body: string
  coverUrl: string | null
  coverAlt: string | null
  track: BlogTrack | null
  subjectId: string | null
  themeId: string | null
  tags: string[]
  readingMinutes: number
}
export type BlogCheck = { ok: true; value: BlogClean } | { ok: false; message: string }

/** Validação feita no servidor (o formulário só ajuda). `publish` exige também resumo e corpo. */
export function checkBlogInput(input: BlogInput, mode: 'draft' | 'publish'): BlogCheck {
  const title = input.title.trim()
  const excerpt = input.excerpt.trim()
  const body = input.body.replace(/\r\n/g, '\n').trim()
  const slug = (input.slug.trim() || slugFromTitle(title)).toLowerCase()
  const coverUrl = input.coverUrl.trim()
  const coverAlt = input.coverAlt.trim()
  const tags = parseTags(input.tags)
  const fail = (message: string): BlogCheck => ({ ok: false, message })

  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) return fail(`O título precisa de ${LIMITS.titleMin} a ${LIMITS.titleMax} caracteres.`)
  if (slug.length < LIMITS.slugMin || slug.length > LIMITS.slugMax || !SLUG_PATTERN.test(slug)) return fail(`O endereço precisa de ${LIMITS.slugMin} a ${LIMITS.slugMax} caracteres, só com letras minúsculas, números e hífens.`)
  if (RESERVED_SLUGS.includes(slug)) return fail('Este endereço está reservado. Escolhe outro.')
  if (excerpt.length > LIMITS.excerptMax) return fail(`O resumo pode ter no máximo ${LIMITS.excerptMax} caracteres.`)
  if (body.length > LIMITS.bodyMax) return fail('O texto é demasiado longo. Divide-o em dois artigos.')
  if (coverUrl && !/^https:\/\//.test(coverUrl)) return fail('A capa tem de ser um endereço https.')
  if (coverUrl.length > 500) return fail('O endereço da capa é demasiado longo.')
  if (coverUrl && !coverAlt) return fail('Descreve a capa no texto alternativo.')
  if (coverAlt.length > LIMITS.altMax) return fail(`O texto alternativo pode ter no máximo ${LIMITS.altMax} caracteres.`)
  if (input.track && !isBlogTrack(input.track)) return fail('Percurso inválido.')
  if (input.themeId && !input.subjectId) return fail('Escolhe a disciplina antes do tema.')
  if (tags.length > LIMITS.tagsMax) return fail(`Usa no máximo ${LIMITS.tagsMax} etiquetas.`)
  if (tags.some((tag) => tag.length > LIMITS.tagMax)) return fail(`Cada etiqueta pode ter no máximo ${LIMITS.tagMax} caracteres.`)
  if (mode === 'publish') {
    if (!excerpt) return fail('Escreve o resumo antes de publicar: serve de descrição no Google.')
    if (!body) return fail('Escreve o texto do artigo antes de publicar.')
  }

  return {
    ok: true,
    value: {
      title,
      slug,
      excerpt,
      body,
      coverUrl: coverUrl || null,
      coverAlt: coverUrl ? coverAlt : null,
      track: isBlogTrack(input.track) ? input.track : null,
      subjectId: input.subjectId || null,
      themeId: input.themeId || null,
      tags,
      readingMinutes: readingMinutes(body),
    },
  }
}

const TZ = 'Africa/Maputo'
/** «7 de novembro de 2026» (hora de Maputo). */
export function dataLonga(date: Date) {
  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
}
/** «7 nov. 2026» para listas. */
export function dataCurta(date: Date) {
  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })
}

export const blogPath = (slug: string) => `/blog/${slug}`

/** Botão «Praticar»: leva ao Simulador já na disciplina e no tema do artigo (o Simulador lê d= e t=). */
export function practiceLink(post: { subjectId: string | null; themeId: string | null }) {
  if (!post.subjectId) return { href: '/aluno/simulador', label: 'Praticar no Simulador' }
  const query = new URLSearchParams({ m: 'pratica', d: post.subjectId })
  if (post.themeId) query.set('t', post.themeId)
  return { href: `/aluno/simulador?${query.toString()}`, label: post.themeId ? 'Praticar este tema' : 'Praticar esta disciplina' }
}
TWISISA_FIM_18
mkdir -p "lib"
cat > "lib/blog.ts" <<'TWISISA_FIM_19'
import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { AppError } from '@/lib/action-result'
import { BLOG_PAGE_SIZE, checkBlogInput, isBlogStatus, isBlogTrack, type BlogClean, type BlogInput, type BlogStatus, type BlogTrack } from '@/lib/blog-pure'

// Blog do Twisisa. A tabela e as regras estão em database/migrations/0039_blog.sql.
// Escrita: só a administração (as acções em app/admin/blog/actions.ts verificam a permissão).
// Leitura pública: só o que tem status = 'published' e published_at <= now(). A leitura nunca deve deitar a página abaixo:
// quem a usa recebe { ok: false } (ou uma lista vazia) e mostra o estado de erro em vez de partir.

export type BlogSummary = {
  id: string
  slug: string
  title: string
  excerpt: string
  coverUrl: string | null
  coverAlt: string | null
  status: BlogStatus
  publishedAt: Date | null
  updatedAt: Date
  createdAt: Date
  authorId: string | null
  authorName: string | null
  readingMinutes: number
  track: BlogTrack | null
  subjectId: string | null
  subjectName: string | null
  themeId: string | null
  themeName: string | null
  tags: string[]
}
export type BlogPost = BlogSummary & { body: string }
export type Read<T> = { ok: true; data: T } | { ok: false }

const PUBLIC = `p.status = 'published' AND p.published_at <= now()`
const COLUMNS = `p.id, p.slug, p.title, p.excerpt, p.cover_url, p.cover_alt, p.status, p.published_at, p.updated_at, p.created_at,
  p.author_id, u.name AS author_name, p.reading_minutes, p.track, p.subject_id, s.name AS subject_name, p.theme_id, t.name AS theme_name, p.tags`
const FROM = `FROM blog_posts p
  LEFT JOIN "user" u ON u.id = p.author_id
  LEFT JOIN library_subjects s ON s.id = p.subject_id
  LEFT JOIN topics t ON t.id = p.theme_id`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSummary(row: any): BlogSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverUrl: row.cover_url,
    coverAlt: row.cover_alt,
    status: isBlogStatus(row.status) ? row.status : 'draft',
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    authorId: row.author_id,
    authorName: row.author_name,
    readingMinutes: row.reading_minutes,
    track: isBlogTrack(row.track) ? row.track : null,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    themeId: row.theme_id,
    themeName: row.theme_name,
    tags: row.tags ?? [],
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toPost = (row: any): BlogPost => ({ ...toSummary(row), body: row.body })

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`

// ───────────── Leitura pública ─────────────

export type BlogFilters = { q?: string; track?: string; subjectId?: string; tag?: string; page?: number }
export type BlogPage = { items: BlogSummary[]; total: number; page: number; pages: number }

export async function listPublished(filters: BlogFilters = {}): Promise<Read<BlogPage>> {
  try {
    const where = [PUBLIC]
    const params: unknown[] = []
    const add = (sql: string, value: unknown) => { params.push(value); where.push(sql.replace('$n', `$${params.length}`)) }
    const q = (filters.q ?? '').trim().slice(0, 100)
    if (q) add(`(p.title ILIKE $n OR p.excerpt ILIKE $n OR p.body ILIKE $n)`, likePattern(q))
    if (isBlogTrack(filters.track)) add(`p.track = $n`, filters.track)
    if (filters.subjectId) add(`p.subject_id = $n`, filters.subjectId)
    if (filters.tag) add(`$n = ANY(p.tags)`, filters.tag.trim().toLowerCase().slice(0, 24))
    const clause = where.join(' AND ')
    const total = (await pool.query(`SELECT count(*)::int AS n ${FROM} WHERE ${clause}`, params)).rows[0].n as number
    const pages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE))
    const page = Math.min(Math.max(1, Math.floor(filters.page ?? 1) || 1), pages)
    const rows = (await pool.query(
      `SELECT ${COLUMNS} ${FROM} WHERE ${clause} ORDER BY p.published_at DESC, p.id LIMIT ${BLOG_PAGE_SIZE} OFFSET ${(page - 1) * BLOG_PAGE_SIZE}`,
      params,
    )).rows
    return { ok: true, data: { items: rows.map(toSummary), total, page, pages } }
  } catch (error) {
    console.error('[BLOG] listar publicados', error)
    return { ok: false }
  }
}

/** Artigo público por endereço. `data: null` = não existe ou não está publicado (404); `ok: false` = falha de leitura. */
export async function getPublishedBySlug(slug: string): Promise<Read<BlogPost | null>> {
  try {
    const row = (await pool.query(`SELECT ${COLUMNS}, p.body ${FROM} WHERE p.slug = $1 AND ${PUBLIC}`, [slug.slice(0, 120)])).rows[0]
    return { ok: true, data: row ? toPost(row) : null }
  } catch (error) {
    console.error('[BLOG] obter artigo', error)
    return { ok: false }
  }
}

/** Relacionados: primeiro o mesmo tema, depois a mesma disciplina. Em caso de falha, nenhum. */
export async function listRelated(post: Pick<BlogSummary, 'id' | 'themeId' | 'subjectId'>, limit = 3): Promise<BlogSummary[]> {
  if (!post.themeId && !post.subjectId) return []
  try {
    const rows = (await pool.query(
      `SELECT ${COLUMNS} ${FROM}
       WHERE ${PUBLIC} AND p.id <> $1 AND (($2::text IS NOT NULL AND p.theme_id = $2) OR ($3::text IS NOT NULL AND p.subject_id = $3))
       ORDER BY ($2::text IS NOT NULL AND p.theme_id = $2) DESC, p.published_at DESC LIMIT $4`,
      [post.id, post.themeId, post.subjectId, limit],
    )).rows
    return rows.map(toSummary)
  } catch (error) {
    console.error('[BLOG] relacionados', error)
    return []
  }
}

/** Disciplinas que têm artigos publicados (para o filtro). */
export async function listBlogSubjects(): Promise<{ id: string; name: string }[]> {
  try {
    const rows = (await pool.query(
      `SELECT DISTINCT s.id, s.name FROM blog_posts p JOIN library_subjects s ON s.id = p.subject_id WHERE ${PUBLIC} ORDER BY s.name`,
    )).rows
    return rows.map((row) => ({ id: row.id, name: row.name }))
  } catch (error) {
    console.error('[BLOG] disciplinas do filtro', error)
    return []
  }
}

export async function listLatest(limit = 3): Promise<BlogSummary[]> {
  try {
    return (await pool.query(`SELECT ${COLUMNS} ${FROM} WHERE ${PUBLIC} ORDER BY p.published_at DESC LIMIT $1`, [limit])).rows.map(toSummary)
  } catch (error) {
    console.error('[BLOG] últimos artigos', error)
    return []
  }
}

export async function listSitemapPosts(): Promise<{ slug: string; updatedAt: Date }[]> {
  try {
    const rows = (await pool.query(`SELECT p.slug, p.updated_at FROM blog_posts p WHERE ${PUBLIC} ORDER BY p.published_at DESC LIMIT 5000`)).rows
    return rows.map((row) => ({ slug: row.slug, updatedAt: row.updated_at }))
  } catch (error) {
    console.error('[BLOG] sitemap', error)
    return []
  }
}

export async function listFeedPosts(limit = 30): Promise<Read<BlogSummary[]>> {
  try {
    return { ok: true, data: (await pool.query(`SELECT ${COLUMNS} ${FROM} WHERE ${PUBLIC} ORDER BY p.published_at DESC LIMIT $1`, [limit])).rows.map(toSummary) }
  } catch (error) {
    console.error('[BLOG] feed', error)
    return { ok: false }
  }
}

// ───────────── Administração ─────────────

export async function listAdminPosts(filters: { status?: string; q?: string } = {}): Promise<BlogSummary[]> {
  const where: string[] = ['true']
  const params: unknown[] = []
  if (isBlogStatus(filters.status)) { params.push(filters.status); where.push(`p.status = $${params.length}`) }
  const q = (filters.q ?? '').trim().slice(0, 100)
  if (q) { params.push(likePattern(q)); where.push(`(p.title ILIKE $${params.length} OR p.slug ILIKE $${params.length})`) }
  const rows = (await pool.query(`SELECT ${COLUMNS} ${FROM} WHERE ${where.join(' AND ')} ORDER BY p.updated_at DESC LIMIT 200`, params)).rows
  return rows.map(toSummary)
}

/** Qualquer artigo, publicado ou não (editor e pré-visualização). */
export async function getAdminPost(id: string): Promise<BlogPost | null> {
  const row = (await pool.query(`SELECT ${COLUMNS}, p.body ${FROM} WHERE p.id = $1`, [id.slice(0, 80)])).rows[0]
  return row ? toPost(row) : null
}

/** Disciplinas e temas ativos, para os seletores dependentes do editor. */
export async function listClassification() {
  const [subjects, topics] = await Promise.all([
    pool.query(`SELECT id, name FROM library_subjects WHERE active ORDER BY name`),
    pool.query(`SELECT id, subject_id, name FROM topics WHERE active ORDER BY sort_order, name`),
  ])
  return {
    subjects: subjects.rows.map((row) => ({ id: row.id as string, name: row.name as string })),
    topics: topics.rows.map((row) => ({ id: row.id as string, subjectId: row.subject_id as string, name: row.name as string })),
  }
}

export const inputFromPost = (post: BlogPost): BlogInput => ({
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt,
  body: post.body,
  coverUrl: post.coverUrl ?? '',
  coverAlt: post.coverAlt ?? '',
  track: post.track ?? '',
  subjectId: post.subjectId ?? '',
  themeId: post.themeId ?? '',
  tags: post.tags.join(', '),
})

async function assertClassification(clean: BlogClean) {
  if (clean.subjectId) {
    const subject = await pool.query(`SELECT 1 FROM library_subjects WHERE id = $1`, [clean.subjectId])
    if (subject.rowCount === 0) throw new AppError('A disciplina escolhida já não existe.')
  }
  if (clean.themeId) {
    const theme = await pool.query(`SELECT 1 FROM topics WHERE id = $1 AND subject_id = $2`, [clean.themeId, clean.subjectId])
    if (theme.rowCount === 0) throw new AppError('O tema não pertence a esta disciplina.')
  }
}

const MAX_REVISIONS = 20

function mapWriteError(error: unknown): never {
  const e = error as { code?: string; constraint?: string }
  if (e?.code === '23505') throw new AppError('Já existe um artigo com este endereço. Escolhe outro.')
  if (e?.code === '23514') throw new AppError('Algum campo não cumpre as regras (tamanho ou formato). Revê o formulário.')
  throw error
}

/** Cria (sem id) ou atualiza (com id). `publish` publica; sem ele o estado não muda. Cada gravação guarda a versão anterior (últimas 20). */
export async function saveBlogPost(args: { id: string | null; clean: BlogClean; publish: boolean; userId: string }): Promise<{ id: string; slug: string; status: BlogStatus; previousSlug: string | null; wasPublished: boolean }> {
  const { id, clean, publish, userId } = args
  await assertClassification(clean)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const values = [clean.slug, clean.title, clean.excerpt, clean.body, clean.coverUrl, clean.coverAlt, clean.track, clean.subjectId, clean.themeId, clean.tags, clean.readingMinutes]
    if (!id) {
      const newId = randomUUID()
      const created = await client.query(
        `INSERT INTO blog_posts (id, slug, title, excerpt, body, cover_url, cover_alt, track, subject_id, theme_id, tags, reading_minutes, author_id, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CASE WHEN $15 THEN now() ELSE NULL END)
         RETURNING id, slug, status`,
        [newId, ...values, userId, publish ? 'published' : 'draft', publish],
      )
      await client.query('COMMIT')
      return { id: created.rows[0].id, slug: created.rows[0].slug, status: created.rows[0].status, previousSlug: null, wasPublished: false }
    }
    const current = (await client.query(`SELECT slug, title, body, status FROM blog_posts WHERE id = $1 FOR UPDATE`, [id])).rows[0]
    if (!current) throw new AppError('Este artigo já não existe.')
    if (current.title !== clean.title || current.body !== clean.body) {
      await client.query(`INSERT INTO blog_post_revisions (post_id, title, body, saved_by) VALUES ($1, $2, $3, $4)`, [id, current.title, current.body, userId])
      await client.query(
        `DELETE FROM blog_post_revisions WHERE post_id = $1 AND id NOT IN (SELECT id FROM blog_post_revisions WHERE post_id = $1 ORDER BY saved_at DESC, id DESC LIMIT ${MAX_REVISIONS})`,
        [id],
      )
    }
    const updated = await client.query(
      `UPDATE blog_posts SET slug = $2, title = $3, excerpt = $4, body = $5, cover_url = $6, cover_alt = $7, track = $8, subject_id = $9, theme_id = $10, tags = $11,
              reading_minutes = $12, updated_at = now(),
              status = CASE WHEN $13 THEN 'published' ELSE status END,
              published_at = CASE WHEN $13 THEN COALESCE(published_at, now()) ELSE published_at END
       WHERE id = $1 RETURNING id, slug, status`,
      [id, ...values, publish],
    )
    await client.query('COMMIT')
    return { id: updated.rows[0].id, slug: updated.rows[0].slug, status: updated.rows[0].status, previousSlug: current.slug === clean.slug ? null : current.slug, wasPublished: current.status === 'published' }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    if (error instanceof AppError) throw error
    return mapWriteError(error)
  } finally {
    client.release()
  }
}

/** Publicar, despublicar (volta a rascunho) ou arquivar um artigo que já existe. Ao publicar, volta a validar o que está guardado. */
export async function setBlogStatus(id: string, status: BlogStatus): Promise<{ slug: string; title: string; previous: BlogStatus }> {
  const post = await getAdminPost(id)
  if (!post) throw new AppError('Este artigo já não existe.')
  if (status === 'published') {
    const check = checkBlogInput(inputFromPost(post), 'publish')
    if (!check.ok) throw new AppError(check.message)
  }
  try {
    await pool.query(
      `UPDATE blog_posts SET status = $2, updated_at = now(), published_at = CASE WHEN $2 = 'published' THEN COALESCE(published_at, now()) ELSE published_at END WHERE id = $1`,
      [id, status],
    )
  } catch (error) {
    return mapWriteError(error)
  }
  return { slug: post.slug, title: post.title, previous: post.status }
}

export async function deleteBlogPost(id: string): Promise<{ slug: string; title: string; wasPublished: boolean }> {
  const result = await pool.query(`DELETE FROM blog_posts WHERE id = $1 RETURNING slug, title, status`, [id])
  if (result.rowCount === 0) throw new AppError('Este artigo já não existe.')
  const row = result.rows[0]
  return { slug: row.slug, title: row.title, wasPublished: row.status === 'published' }
}

export async function blogSlugTaken(slug: string, exceptId: string | null): Promise<boolean> {
  const row = await pool.query(`SELECT 1 FROM blog_posts WHERE slug = $1 AND ($2::text IS NULL OR id <> $2)`, [slug, exceptId])
  return (row.rowCount ?? 0) > 0
}
TWISISA_FIM_19
mkdir -p "tests"
cat > "tests/blog.test.ts" <<'TWISISA_FIM_20'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { slugify } from '../lib/slug'
import { checkBlogInput, isPublicNow, parseTags, readingMinutes, slugFromTitle, type BlogInput } from '../lib/blog-pure'
import { parseBlogMarkdown, parseInline, safeHref, safeImageSrc, showToc, splitCells, tableOfContents } from '../lib/blog-markdown'

const base: BlogInput = { title: 'Como estudar para o exame', slug: '', excerpt: 'Um guia curto.', body: 'Texto do artigo.', coverUrl: '', coverAlt: '', track: '', subjectId: '', themeId: '', tags: '' }

test('slugify: acentos, símbolos e limites', () => {
  assert.equal(slugify('Como estudar Matemática: funções & limites!'), 'como-estudar-matematica-funcoes-limites')
  assert.equal(slugify('  --Educação Física--  '), 'educacao-fisica')
  assert.equal(slugFromTitle('a'.repeat(120)).length, 90)
  assert.equal(slugFromTitle('x'.repeat(89) + ' yyyy').endsWith('-'), false)
})

test('tempo de leitura: 200 palavras por minuto, mínimo 1, ignora fórmulas e código', () => {
  assert.equal(readingMinutes(''), 1)
  assert.equal(readingMinutes('palavra '.repeat(200)), 1)
  assert.equal(readingMinutes('palavra '.repeat(201)), 2)
  assert.equal(readingMinutes('palavra '.repeat(400)), 2)
  assert.equal(readingMinutes(`${'palavra '.repeat(10)}\n\n$$${'x + '.repeat(500)}$$\n\n\`\`\`\n${'codigo '.repeat(500)}\n\`\`\``), 1)
  assert.equal(readingMinutes(`[${'a '.repeat(200).trim()}](https://exemplo.mz/${'b'.repeat(2000)})`), 1)
})

test('visibilidade: só publicado e já na hora', () => {
  const now = new Date('2026-11-07T10:00:00Z')
  assert.equal(isPublicNow({ status: 'published', publishedAt: new Date('2026-11-07T09:59:59Z') }, now), true)
  assert.equal(isPublicNow({ status: 'published', publishedAt: new Date('2026-11-07T10:00:00Z') }, now), true)
  assert.equal(isPublicNow({ status: 'published', publishedAt: new Date('2026-11-07T10:00:01Z') }, now), false)
  assert.equal(isPublicNow({ status: 'published', publishedAt: null }, now), false)
  assert.equal(isPublicNow({ status: 'draft', publishedAt: new Date('2026-01-01') }, now), false)
  assert.equal(isPublicNow({ status: 'archived', publishedAt: new Date('2026-01-01') }, now), false)
})

test('validação: rascunho, publicação e limites', () => {
  const ok = checkBlogInput(base, 'publish')
  assert.equal(ok.ok, true)
  if (ok.ok) assert.equal(ok.value.slug, 'como-estudar-para-o-exame')
  assert.equal(checkBlogInput({ ...base, title: 'Curto' }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, title: 'Four' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, title: 'x'.repeat(121) }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, slug: 'Maiúsculas' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, slug: 'ab' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, slug: 'dois--hifens' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, slug: 'pre-visualizar' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, excerpt: 'x'.repeat(161) }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, excerpt: 'x'.repeat(160) }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, excerpt: '', body: '' }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, excerpt: '' }, 'publish').ok, false)
  assert.equal(checkBlogInput({ ...base, body: '  ' }, 'publish').ok, false)
  assert.equal(checkBlogInput({ ...base, coverUrl: 'http://x.mz/a.jpg', coverAlt: 'a' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, coverUrl: 'https://x.mz/a.jpg' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, coverUrl: 'https://x.mz/a.jpg', coverAlt: 'Alunos a estudar' }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, track: '11' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, track: 'admissao' }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, themeId: 't1' }, 'draft').ok, false)
  assert.equal(checkBlogInput({ ...base, subjectId: 's1', themeId: 't1' }, 'draft').ok, true)
  assert.equal(checkBlogInput({ ...base, tags: 'a,b,c,d,e,f,g,h,i' }, 'draft').ok, false)
})

test('etiquetas: minúsculas, sem repetidas', () => {
  assert.deepEqual(parseTags('Exame, exame ,  Dicas de Estudo\n\n12ª classe'), ['exame', 'dicas de estudo', '12ª classe'])
})

test('Markdown: títulos, ids únicos e índice só com 3 ou mais h2', () => {
  const blocks = parseBlogMarkdown('# Um\n\nTexto\n\n## Dois\n\n### Sub\n\n## Dois\n')
  const toc = tableOfContents(blocks)
  assert.deepEqual(toc.map((item) => [item.level, item.id]), [[2, 'um'], [2, 'dois'], [3, 'sub'], [2, 'dois-2']])
  assert.equal(showToc(toc), true)
  assert.equal(showToc(toc.slice(0, 2)), false)
})

test('Markdown: listas, citações, tabelas e fórmulas', () => {
  const src = '- a\n- b **forte**\n\n1. um\n2. dois\n\n> citação\n\n| x | y |\n|---|:-:|\n| $|a|$ | 2 |\n\n$$\\frac{a}{b}$$\n\nTexto com $x^2$ e \\$5.'
  const blocks = parseBlogMarkdown(src)
  assert.deepEqual(blocks.map((block) => block.t), ['ul', 'ol', 'quote', 'table', 'math', 'p'])
  const table = blocks[3]
  assert.equal(table.t === 'table' && table.rows[0][0][0].t, 'math')
  assert.equal(table.t === 'table' && table.align[1], 'center')
  assert.deepEqual(splitCells('| a | $|b|$ | c\\|d |'), ['a', '$|b|$', 'c|d'])
  const para = blocks[5]
  assert.equal(para.t === 'p' && para.c.some((item) => item.t === 'math' && item.v === 'x^2'), true)
  assert.equal(para.t === 'p' && para.c.some((item) => item.t === 'text' && item.v.includes('$5')), true)
})

test('sanitização: HTML fica texto e endereços perigosos são recusados', () => {
  const html = parseBlogMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')
  assert.equal(html.every((block) => block.t === 'p' && block.c.every((item) => item.t === 'text')), true)
  assert.equal(safeHref('javascript:alert(1)'), null)
  assert.equal(safeHref('JaVaScRiPt:alert(1)'), null)
  assert.equal(safeHref('java\nscript:alert(1)'), null)
  assert.equal(safeHref(' javascript:alert(1)'), null)
  assert.equal(safeHref('data:text/html;base64,AAAA'), null)
  assert.equal(safeHref('vbscript:x'), null)
  assert.equal(safeHref('//evil.com/x'), null)
  assert.equal(safeHref('https://twisisa.com/blog'), 'https://twisisa.com/blog')
  assert.equal(safeHref('/aluno/simulador'), '/aluno/simulador')
  assert.equal(safeHref('mailto:ajuda@twisisa.com'), 'mailto:ajuda@twisisa.com')
  assert.equal(safeHref('#secao-1'), '#secao-1')
  assert.equal(safeImageSrc('http://x.mz/a.png'), null)
  assert.equal(safeImageSrc('javascript:alert(1)'), null)
  assert.equal(safeImageSrc('https://res.cloudinary.com/x/a.png'), 'https://res.cloudinary.com/x/a.png')

  const link = parseInline('[ver](javascript:alert(1)) e [ok](https://twisisa.com)')
  assert.equal(link.some((item) => item.t === 'link' && item.href.startsWith('javascript')), false)
  assert.equal(link.some((item) => item.t === 'link' && item.href === 'https://twisisa.com'), true)
  assert.deepEqual(parseBlogMarkdown('![x](javascript:alert(1))').map((block) => block.t), ['p'])
  assert.deepEqual(parseBlogMarkdown('![Capa](https://res.cloudinary.com/x/a.png)').map((block) => block.t), ['image'])
})

test('Markdown: texto enorme ou marcas por fechar não rebentam', () => {
  const started = Date.now()
  parseBlogMarkdown('**'.repeat(9000))
  parseBlogMarkdown(`${'['.repeat(5000)}x`)
  parseBlogMarkdown('> '.repeat(50) + 'fundo')
  assert.equal(parseBlogMarkdown('**aberto sem fechar').length, 1)
  assert.equal(Date.now() - started < 3000, true)
})
TWISISA_FIM_20

echo "3/4 A alterar os ficheiros existentes (com Node)…"
node - <<'TWISISA_NODE'
// Alterações aos ficheiros existentes. Cada uma é idempotente (se já foi aplicada, salta) e falha se não encontrar o sítio onde mexer.
const fs = require('fs')

function patch(file, applied, pairs) {
  let s = fs.readFileSync(file, 'utf8')
  if (s.includes(applied)) { console.log('  já aplicado:', file); return }
  for (const [from, to] of pairs) {
    if (typeof from === 'string') {
      if (!s.includes(from)) throw new Error(`${file}: não encontrei «${from.slice(0, 70)}». O ficheiro mudou desde a versão analisada.`)
      s = s.replace(from, () => to)
    } else {
      if (!from.test(s)) throw new Error(`${file}: não encontrei o padrão ${from}`)
      s = s.replace(from, to)
    }
  }
  fs.writeFileSync(file, s)
  console.log('  alterado:', file)
}

patch('app/sitemap.ts', 'listSitemapPosts', [
  ["import { articles } from '@/lib/blog'", "import { listSitemapPosts } from '@/lib/blog'"],
  ["  const exams = await listExamSitemapPaths().catch(() => [])\n", "  const exams = await listExamSitemapPaths().catch(() => [])\n  // Só artigos publicados (o que se despublica ou apaga sai daqui na revalidação).\n  const posts = await listSitemapPosts()\n  const blogUpdated = posts.reduce<Date | undefined>((latest, post) => (!latest || post.updatedAt > latest ? post.updatedAt : latest), undefined)\n"],
  ["    { url: `${SITE_URL}/blog` },", "    { url: `${SITE_URL}/blog`, lastModified: blogUpdated },"],
  ["    ...articles.map((article) => ({ url: `${SITE_URL}/blog/${article.slug}` })),", "    ...posts.map((post) => ({ url: `${SITE_URL}/blog/${post.slug}`, lastModified: post.updatedAt })),"],
])

patch('components/home-page.tsx', 'HomePost', [
  ["import { articles } from '@/lib/blog'\n", "// Artigos reais do blog (últimos publicados), enviados por app/page.tsx. Sem artigos, a secção do blog não aparece.\nexport type HomePost = { slug: string; category: string; title: string; description: string }\n"],
  ["function Visual({ k }: { k: string }) {", "function Visual({ k, posts }: { k: string; posts: HomePost[] }) {"],
  ["{articles.slice(0, 3).map((a) =>", "{posts.slice(0, 3).map((a) =>"],
  ["export default function Page({ signedIn = false }: { signedIn?: boolean }) {", "export default function Page({ signedIn = false, posts = [] }: { signedIn?: boolean; posts?: HomePost[] }) {"],
  [/\{\/\* BLOG: artigos reais \*\/\}\n(\s*)<section className="tw-sec" style=\{\{ paddingTop: 0 \}\}>([\s\S]*?)<\/div><\/section>/, (m, ind, inner) => `{/* BLOG: artigos reais da base de dados; sem artigos publicados a secção não aparece */}\n${ind}{posts.length > 0 && <section className="tw-sec" style={{ paddingTop: 0 }}>${inner}</div></section>}`],
  ["{articles.map((a, n) =>", "{posts.map((a, n) =>"],
])

patch('app/page.tsx', 'listLatest', [
  ["import HomePage from '@/components/home-page'\n", "import HomePage from '@/components/home-page'\nimport { listLatest } from '@/lib/blog'\nimport { BLOG_TRACK_LABEL } from '@/lib/blog-pure'\n"],
  ["  return <HomePage signedIn={Boolean(session?.user)} />", "  // Últimos artigos reais do blog; se a leitura falhar ou não houver artigos, a secção não aparece.\n  const latest = await listLatest(3)\n  const posts = latest.map((post) => ({ slug: post.slug, category: post.subjectName ?? (post.track ? BLOG_TRACK_LABEL[post.track] : 'Artigo'), title: post.title, description: post.excerpt }))\n  return <HomePage signedIn={Boolean(session?.user)} posts={posts} />"],
])

// Simulador: aceitar o tema (?t=) para o botão «Praticar este tema» do blog.
{
  const file = 'lib/simulator.ts'
  const s = fs.readFileSync(file, 'utf8')
  if (s.includes('getActiveTopic')) console.log('  já aplicado:', file)
  else {
    fs.appendFileSync(file, `
/** Tema ativo de uma disciplina (para o Simulador abrir já filtrado, p. ex. a partir de um artigo do blog). */
export async function getActiveTopic(topicId: string, subjectId: string): Promise<{ id: string; name: string } | null> {
  const row = (await pool.query(\`SELECT id, name FROM topics WHERE id = $1 AND subject_id = $2 AND active\`, [topicId.slice(0, 120), subjectId])).rows[0]
  return row ? { id: row.id as string, name: row.name as string } : null
}
`)
    console.log('  alterado:', file)
  }
}
patch('app/aluno/simulador/page.tsx', 'getActiveTopic', [
  ["import { getSimulatorHub, getVariants } from '@/lib/simulator'", "import { getActiveTopic, getSimulatorHub, getVariants } from '@/lib/simulator'"],
  ["searchParams: Promise<{ d?: string; m?: string }>", "searchParams: Promise<{ d?: string; m?: string; t?: string }>"],
  ["const { d, m } = await searchParams", "const { d, m, t } = await searchParams"],
  ["  const named = catalog?.variants ?? []\n", "  const named = catalog?.variants ?? []\n  // ?t= abre a prática já filtrada pelo tema (ligação «Praticar este tema» dos artigos do blog).\n  const topic = t && chosen && mode && mode !== 'revisao' ? await getActiveTopic(t, chosen.id).catch(() => null) : null\n"],
  ["<StartCard mode={mode} subjectId={chosen.id} title=\"Todas as provas\" caption={count(Math.min(size, catalog?.total ?? 0))} />", "<StartCard mode={mode} subjectId={chosen.id} topicId={topic?.id ?? null} title=\"Todas as provas\" caption={topic ? `Tema: ${topic.name}` : count(Math.min(size, catalog?.total ?? 0))} />"],
  ["<StartCard key={item.name} mode={mode} subjectId={chosen.id} variant={item.name} title={item.name} caption={count(Math.min(size, item.count))} />", "<StartCard key={item.name} mode={mode} subjectId={chosen.id} topicId={topic?.id ?? null} variant={item.name} title={item.name} caption={topic ? `Tema: ${topic.name}` : count(Math.min(size, item.count))} />"],
  ["<StartCard mode={mode} subjectId={chosen.id} title=\"Começar\" caption={count(Math.min(size, catalog?.total ?? 0))} disabled", "<StartCard mode={mode} subjectId={chosen.id} topicId={topic?.id ?? null} title=\"Começar\" caption={topic ? `Tema: ${topic.name}` : count(Math.min(size, catalog?.total ?? 0))} disabled"],
])
patch('components/simulador/start-actions.tsx', 'topicId', [
  ["variant?: string | null; title: string;", "variant?: string | null; topicId?: string | null; title: string;"],
  ["{ mode, subjectId, variant = null, title,", "{ mode, subjectId, variant = null, topicId = null, title,"],
  ["startSession({ mode, subjectId, variant })", "startSession({ mode, subjectId, variant, topicId })"],
])

patch('lib/admin-sections.ts', "/admin/blog", [
  ["Megaphone, Sparkles,", "Megaphone, PenLine, Sparkles,"],
  ["  {\n    href: '/admin/importar',", "  {\n    href: '/admin/blog',\n    label: 'Blog',\n    description: 'Escreve e publica guias, explicações por tema e dicas de exame.',\n    icon: PenLine,\n  },\n  {\n    href: '/admin/importar',"],
])

patch('app/api/admin/cloudinary-sign/route.ts', 'estuda-mz/blog', [
  ["  logotipos: 'estuda-mz/logotipos',\n", "  logotipos: 'estuda-mz/logotipos',\n  blog: 'estuda-mz/blog',\n"],
])

if (fs.existsSync('State.md')) {
  patch('State.md', 'blog_posts', [
    ["| `/blog` | FEITO | 5 artigos em `lib/blog.ts`. |", "| `/blog` | FEITO, FALTA TESTE | Artigos reais da base de dados (`blog_posts`, migração 0039), escritos em `/admin/blog`. Listagem em `/blog`, artigo em `/blog/[slug]`, pré-visualização em `/blog/pre-visualizar/[id]`, RSS em `/blog/feed.xml`. Sem artigos publicados mostra o estado vazio. |"],
    ["Jonas (modelo). Todas FEITO", "Jonas (modelo), Blog (artigos). Todas FEITO"],
  ])
}
TWISISA_NODE

# Nada pode ficar a apontar para o blog antigo.
if grep -rIn --include=*.ts --include=*.tsx --exclude-dir=node_modules --exclude-dir=.next -E "editorial-feed|public-blog|import \{ articles \}" . ; then
  echo "Ainda há referências ao blog antigo (acima). Corrige-as antes de continuar." >&2
  exit 1
fi

echo "4/4 Pronto."
echo
echo "Falta correr a migração (cria blog_posts e blog_post_revisions):"
echo "    npm run migrate"
echo
if [ "${SKIP_CHECKS:-0}" != "1" ]; then
  echo "A verificar: tsc, testes e build…"
  npx tsc --noEmit
  npm test
  npm run build
  echo "Tudo passou."
fi
