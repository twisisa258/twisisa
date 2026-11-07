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
