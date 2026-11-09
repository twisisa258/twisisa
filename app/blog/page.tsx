import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { BlogShell } from '@/components/blog/blog-shell'
import { Crumbs } from '@/components/exames/public-shell'
import { categoryLabel } from '@/components/blog/article-view'
import { JsonLd } from '@/components/json-ld'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'
import { Segmentado } from '@/components/ui/segmentado'
import { listBlogSubjects, listPublished, type BlogSummary } from '@/lib/blog'
import { BLOG_TRACKS, blogPath, blogSubjectPath, dataCurta, isBlogTrack } from '@/lib/blog-pure'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

type Params = Promise<Record<string, string | string[] | undefined>>
const one = (value: string | string[] | undefined) => ((Array.isArray(value) ? value[0] : value) ?? '').trim()
const DESCRIPTION = 'Guias de estudo, explicações por tema e dicas de exame e de admissão para estudantes moçambicanos. Lê, pratica e prepara-te com exames anteriores.'
const TITLE = 'Blog de estudos: guias, explicações e dicas de exame | Twisisa'

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
  const base = pageMetadata({ title: f.pagina > 1 ? `Blog de estudos, página ${f.pagina} | Twisisa` : TITLE, description: DESCRIPTION, path: f.pagina > 1 ? `/blog?pagina=${f.pagina}` : '/blog' })
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
        <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Blog' }]} />
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

        {subjects.length > 0 && (
          <nav aria-label="Disciplinas" className="mt-5 flex flex-wrap gap-2">
            {subjects.map((subject) => <Link key={subject.id} href={blogSubjectPath(subject.name)} className="inline-flex min-h-9 items-center rounded-full border border-linha px-3.5 text-[14px] font-semibold text-texto no-underline hover:border-marca hover:text-marca">{subject.name}</Link>)}
          </nav>
        )}

        <div className="mt-5">
          <Segmentado label="Percurso" items={[{ href: url({ percurso: undefined, pagina: undefined }), label: 'Todos', active: !f.percurso }, ...BLOG_TRACKS.map((track) => ({ href: url({ percurso: track, pagina: undefined }), label: track === 'admissao' ? 'Admissão' : `${track}ª`, active: f.percurso === track }))]} />
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
