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
