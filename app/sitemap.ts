import type { MetadataRoute } from 'next'
import { listBlogSubjects, listBlogTags, listSitemapPosts } from '@/lib/blog'
import { blogSubjectPath, blogTagPath } from '@/lib/blog-pure'
import { listExamSitemapPaths } from '@/lib/exames'
import { SITE_URL } from '@/lib/seo'

export const revalidate = 3600

// Só entram páginas públicas e indexáveis. Rotas com sessão obrigatória ou noindex (aluno, biblioteca, planos, sign-in) ficam de fora.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const exams = await listExamSitemapPaths().catch(() => [])
  // Só artigos publicados (o que se despublica ou apaga sai daqui na revalidação).
  const posts = await listSitemapPosts()
  const [blogSubjects, blogTags] = await Promise.all([listBlogSubjects(), listBlogTags()])
  const blogUpdated = posts.reduce<Date | undefined>((latest, post) => (!latest || post.updatedAt > latest ? post.updatedAt : latest), undefined)
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/simulado` },
    { url: `${SITE_URL}/blog`, lastModified: blogUpdated },
    ...blogSubjects.map((subject) => ({ url: `${SITE_URL}${blogSubjectPath(subject.name)}`, lastModified: blogUpdated })),
    ...blogTags.map((item) => ({ url: `${SITE_URL}${blogTagPath(item.tag)}`, lastModified: blogUpdated })),
    { url: `${SITE_URL}/termos` },
    { url: `${SITE_URL}/privacidade` },
    ...posts.map((post) => ({ url: `${SITE_URL}/blog/${post.slug}`, lastModified: post.updatedAt })),
    ...exams.map((item) => ({ url: `${SITE_URL}${item.path}`, lastModified: item.lastModified })),
  ]
}
