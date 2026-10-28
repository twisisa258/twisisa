import Link from 'next/link'
import { Brand } from '@/components/brand'
import { JsonLd } from '@/components/json-ld'
import { articles } from '@/lib/blog'
import { SITE_NAME, SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

export function PublicBlog() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/blog#page`,
        url: `${SITE_URL}/blog`,
        name: `Blog | ${SITE_NAME}`,
        inLanguage: 'pt-MZ',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: articles.map((article, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/blog/${article.slug}`,
            name: article.title,
          })),
        },
      },
      breadcrumbJsonLd([
        { name: 'Início', path: '/' },
        { name: 'Blog', path: '/blog' },
      ]),
    ],
  }

  return (
    <main className="min-h-screen bg-[#f8f8f5] text-[#202321]">
      <JsonLd data={jsonLd} />
      <header className="border-b border-[#e5e6df] bg-[#f8f8f5]/95">
        <div className="mx-auto flex h-[72px] max-w-[900px] items-center justify-between px-5">
          <Brand />
          <Link href="/" className="text-sm font-medium text-[#1d4d41]">Voltar ao início</Link>
        </div>
      </header>
      <section className="mx-auto max-w-[760px] px-5 py-14 sm:py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1d4d41]">Conteúdos para avançar</p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.06em] sm:text-5xl">Blog e novidades</h1>
        <p className="mt-5 text-base leading-7 text-[#626a62]">Guias de estudo, dicas para exames e novidades úteis para estudantes moçambicanos.</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {articles.map((article) => (
            <article key={article.slug} className="rounded-[24px] border border-[#e1e4db] bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a9188]">{article.category}</p>
              <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em]">
                <Link href={`/blog/${article.slug}`} className="hover:text-[#1d4d41]">{article.title}</Link>
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#626a62]">{article.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
