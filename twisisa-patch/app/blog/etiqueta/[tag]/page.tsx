import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TopicListing } from '@/components/blog/topic-listing'
import { listPublished } from '@/lib/blog'
import { blogTagPath } from '@/lib/blog-pure'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ tag: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

function decode(value: string) {
  try {
    return decodeURIComponent(value).trim().toLowerCase().slice(0, 24)
  } catch {
    return ''
  }
}

async function load({ params, searchParams }: Props) {
  const tag = decode((await params).tag)
  if (!tag) return null
  const raw = (await searchParams).pagina
  const page = Math.max(1, parseInt((Array.isArray(raw) ? raw[0] : raw) ?? '', 10) || 1)
  const result = await listPublished({ tag, page })
  if (!result.ok || result.data.total === 0) return null
  return { tag, ...result.data }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const data = await load(props)
  if (!data) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  const path = blogTagPath(data.tag)
  return pageMetadata({
    title: `${data.tag}: artigos de estudo${data.page > 1 ? `, página ${data.page}` : ''} | Blog Twisisa`,
    description: `${data.total} ${data.total === 1 ? 'artigo' : 'artigos'} sobre ${data.tag} no blog do Twisisa: guias de estudo, explicações e dicas de exame.`,
    path: data.page > 1 ? `${path}?pagina=${data.page}` : path,
  })
}

export default async function BlogTagPage(props: Props) {
  const data = await load(props)
  if (!data) notFound()
  return (
    <TopicListing
      title={`Artigos sobre ${data.tag}`}
      intro={`Guias de estudo, explicações e dicas de exame sobre ${data.tag}.`}
      path={blogTagPath(data.tag)}
      items={data.items}
      total={data.total}
      page={data.page}
      pages={data.pages}
      crumbName={data.tag}
    />
  )
}
