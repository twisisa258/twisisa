import type { MetadataRoute } from 'next'
import { articles } from '@/lib/blog'
import { listExamSitemapPaths } from '@/lib/exames'
import { SITE_URL } from '@/lib/seo'

export const revalidate = 3600

// Só entram páginas públicas e indexáveis. Rotas com sessão obrigatória ou noindex (aluno, biblioteca, planos, sign-in) ficam de fora.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const exams = await listExamSitemapPaths().catch(() => [])
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/blog` },
    { url: `${SITE_URL}/termos` },
    { url: `${SITE_URL}/privacidade` },
    ...articles.map((article) => ({ url: `${SITE_URL}/blog/${article.slug}` })),
    ...exams.map((item) => ({ url: `${SITE_URL}${item.path}`, lastModified: item.lastModified })),
  ]
}
