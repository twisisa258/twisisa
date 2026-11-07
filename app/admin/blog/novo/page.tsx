import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/admin'
import { listClassification } from '@/lib/blog'
import { BlogEditor } from '@/components/admin/blog-editor'
import { AdminLoadError } from '@/components/admin/page-parts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Novo artigo | Administração | Twisisa' }

export default async function NewBlogPostPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const classification = await listClassification().catch((error) => { console.error('[ADMIN BLOG] classificação', error); return null })
  if (!classification) return <AdminLoadError href="/admin/blog/novo" />
  return <BlogEditor post={null} subjects={classification.subjects} topics={classification.topics} />
}
