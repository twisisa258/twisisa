import { notFound, redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/admin'
import { getAdminPost, inputFromPost, listClassification } from '@/lib/blog'
import { BlogEditor } from '@/components/admin/blog-editor'
import { AdminLoadError } from '@/components/admin/page-parts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Editar artigo | Administração | Twisisa' }

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const { id } = await params
  let loaded: { post: Awaited<ReturnType<typeof getAdminPost>>; classification: Awaited<ReturnType<typeof listClassification>> } | null = null
  try {
    const [post, classification] = await Promise.all([getAdminPost(id), listClassification()])
    loaded = { post, classification }
  } catch (error) {
    console.error('[ADMIN BLOG] editor', error)
  }
  if (!loaded) return <AdminLoadError href={`/admin/blog/${id}`} />
  if (!loaded.post) notFound()
  return <BlogEditor key={loaded.post.id} post={{ id: loaded.post.id, status: loaded.post.status, fields: inputFromPost(loaded.post) }} subjects={loaded.classification.subjects} topics={loaded.classification.topics} />
}
