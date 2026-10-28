import type { MetadataRoute } from 'next'
import { articles } from '@/lib/blog'
import { SITE_URL } from '@/lib/seo'

// Só entram páginas públicas e indexáveis. Rotas com sessão obrigatória, noindex ou
// que redireccionam (biblioteca, exames, planos, sign-in, sign-up) ficam de fora.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/blog` },
    { url: `${SITE_URL}/termos` },
    { url: `${SITE_URL}/privacidade` },
    ...articles.map((article) => ({ url: `${SITE_URL}/blog/${article.slug}` })),
  ]
}
