import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TopicListing } from '@/components/blog/topic-listing'
import { listBlogSubjects, listPublished } from '@/lib/blog'
import { blogSubjectPath } from '@/lib/blog-pure'
import { slugify } from '@/lib/slug'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

async function load({ params, searchParams }: Props) {
  const { slug } = await params
  const raw = (await searchParams).pagina
  const page = Math.max(1, parseInt((Array.isArray(raw) ? raw[0] : raw) ?? '', 10) || 1)
  const subject = (await listBlogSubjects()).find((item) => slugify(item.name) === slug)
  if (!subject) return null
  const result = await listPublished({ subjectId: subject.id, page })
  if (!result.ok || result.data.total === 0) return null
  return { subject, ...result.data }
}

// Uma página por disciplina com artigos: apanha pesquisas como «matemática exame de admissão» e liga os artigos entre si.
export async function generateMetadata(props: Props): Promise<Metadata> {
  const data = await load(props)
  if (!data) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  const path = blogSubjectPath(data.subject.name)
  return pageMetadata({
    title: `${data.subject.name}: guias e explicações para exames${data.page > 1 ? `, página ${data.page}` : ''} | Blog Twisisa`,
    description: `${data.total} ${data.total === 1 ? 'artigo' : 'artigos'} de ${data.subject.name} para estudantes moçambicanos: explicações por tema, dicas de exame e preparação para a admissão.`,
    path: data.page > 1 ? `${path}?pagina=${data.page}` : path,
  })
}

export default async function BlogSubjectPage(props: Props) {
  const data = await load(props)
  if (!data) notFound()
  return (
    <TopicListing
      title={`${data.subject.name}: guias e explicações`}
      intro={`Artigos de ${data.subject.name} para estudar com calma: explicações por tema, dicas de exame e preparação para a admissão.`}
      path={blogSubjectPath(data.subject.name)}
      items={data.items}
      total={data.total}
      page={data.page}
      pages={data.pages}
      crumbName={data.subject.name}
      practiceHref={`/aluno/simulador?${new URLSearchParams({ m: 'pratica', d: data.subject.id }).toString()}`}
    />
  )
}
