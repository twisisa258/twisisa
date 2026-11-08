import Image from 'next/image'
import Link from 'next/link'
import { BlogShell } from '@/components/blog/blog-shell'
import { categoryLabel } from '@/components/blog/article-view'
import { JsonLd } from '@/components/json-ld'
import { Reveal } from '@/components/ui/reveal'
import type { BlogSummary } from '@/lib/blog'
import { blogPath, dataCurta } from '@/lib/blog-pure'
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

// Página de tema do blog (por disciplina ou por etiqueta): lista indexável de artigos, com paginação e ligação aos exames.
export function TopicListing({ title, intro, path, items, total, page, pages, crumbName, practiceHref }: { title: string; intro: string; path: string; items: BlogSummary[]; total: number; page: number; pages: number; crumbName: string; practiceHref?: string }) {
  const link = (n: number) => (n > 1 ? `${path}?pagina=${n}` : path)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', url: `${SITE_URL}${path}`, name: title, description: intro, inLanguage: 'pt-MZ', isPartOf: { '@id': `${SITE_URL}/#website` }, mainEntity: { '@type': 'ItemList', itemListElement: items.map((post, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}${blogPath(post.slug)}`, name: post.title })) } },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Blog', path: '/blog' }, { name: crumbName, path }]),
    ],
  }
  return (
    <BlogShell>
      <JsonLd data={jsonLd} />
      <main id="conteudo" className="mx-auto w-full max-w-[720px] px-5 pt-6">
        <nav aria-label="Caminho" className="mb-4 text-[14px]"><Link href="/blog" className="inline-flex min-h-11 items-center text-texto-2 underline-offset-4 hover:text-marca hover:underline">← Blog</Link></nav>
        <section className="rv-hero">
          <h1 className="text-[clamp(1.75rem,1.4rem+1.8vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.035em]">{title}</h1>
          <p className="mt-3 max-w-[52ch] text-[17px] leading-7 text-texto-2">{intro}</p>
          <p className="mt-4 flex flex-wrap gap-2">
            {practiceHref && <Link href={practiceHref} className="btn btn-primario">Praticar no Simulador</Link>}
            <Link href="/exames" className="btn btn-secundario">Ver exames anteriores</Link>
          </p>
        </section>
        <p className="mt-8 text-[14px] text-texto-2">{total} {total === 1 ? 'artigo' : 'artigos'}</p>
        <div className="mt-2">
          {items.map((post, index) => (
            <Reveal as="article" key={post.id} delay={Math.min(index, 4) * 0.05} className="flex items-start gap-4 border-t border-linha py-6">
              <div className="min-w-0 flex-1">
                {categoryLabel(post) && <p className="text-[13px] font-semibold text-marca">{categoryLabel(post)}</p>}
                <h2 className="mt-1 text-[20px] font-semibold leading-[1.3] tracking-[-0.02em]"><Link href={blogPath(post.slug)} className="hover:text-marca">{post.title}</Link></h2>
                <p className="mt-2 line-clamp-2 text-[16px] leading-6 text-texto-2">{post.excerpt}</p>
                <p className="mt-2 text-[14px] text-texto-2">{post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{dataCurta(post.publishedAt)}</time>} · {post.readingMinutes} min de leitura</p>
              </div>
              {post.coverUrl && (
                <Link href={blogPath(post.slug)} tabIndex={-1} aria-hidden="true" className="relative block size-[88px] shrink-0 overflow-hidden rounded-md bg-linha/40">
                  <Image src={post.coverUrl} alt="" fill sizes="88px" className="object-cover" />
                </Link>
              )}
            </Reveal>
          ))}
        </div>
        {pages > 1 && (
          <nav aria-label="Paginação" className="mt-4 flex items-center justify-between gap-3 border-t border-linha pt-6">
            {page > 1 ? <Link href={link(page - 1)} rel="prev" className="btn btn-secundario btn-grande">Anterior</Link> : <span />}
            <span className="text-[14px] text-texto-2">Página {page} de {pages}</span>
            {page < pages ? <Link href={link(page + 1)} rel="next" className="btn btn-secundario btn-grande">Seguinte</Link> : <span />}
          </nav>
        )}
      </main>
    </BlogShell>
  )
}
