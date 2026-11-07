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
