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
