import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  // Pré-visualizações da Vercel nunca devem ser indexadas.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/aluno/', '/pagamentos/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
