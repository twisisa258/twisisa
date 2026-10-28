import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { articles, getArticle } from '@/lib/blog'
import { OG_IMAGE, SITE_LOCALE, SITE_NAME, SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle((await params).slug)
  if (!article) return { title: `Artigo não encontrado | ${SITE_NAME}`, robots: { index: false, follow: false } }
  const path = `/blog/${article.slug}`
  const title = `${article.title} | ${SITE_NAME}`
  return {
    title,
    description: article.description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article',
      locale: SITE_LOCALE,
      siteName: SITE_NAME,
      url: path,
      title: article.title,
      description: article.description,
      section: article.category,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: [OG_IMAGE.url],
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const article = getArticle((await params).slug)
  if (!article) notFound()

  const url = `${SITE_URL}/blog/${article.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.description,
        articleSection: article.category,
        inLanguage: 'pt-MZ',
        url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        image: `${SITE_URL}${OG_IMAGE.url}`,
        author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` },
        },
      },
      breadcrumbJsonLd([
        { name: 'Início', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: article.title, path: `/blog/${article.slug}` },
      ]),
    ],
  }

  return (
    <main className="min-h-screen bg-[#f8f8f5] px-5 py-8 text-[#202321] sm:px-8">
      <JsonLd data={jsonLd} />
      <article className="mx-auto max-w-2xl">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d4d41]">
          <ArrowLeft size={16} /> Voltar ao blog
        </Link>
        <p className="mt-14 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4d41]">{article.category}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{article.title}</h1>
        <div className="mt-8 space-y-5 text-base leading-8 text-[#626a62]">
          {article.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  )
}
