import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import HomePage from '@/components/home-page'
import { listLatest } from '@/lib/blog'
import { listPublicInstitutions } from '@/lib/exames'
import { BLOG_TRACK_LABEL } from '@/lib/blog-pure'
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...pageMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: '/' }),
  title: { absolute: SITE_TITLE },
}

export default async function Page() {
  // A página inicial mostra «Painel» a quem já iniciou sessão. Se a verificação falhar, mostra-se como a um visitante.
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  // Últimos artigos reais do blog; se a leitura falhar ou não houver artigos, a secção não aparece.
  const latest = await listLatest(3)
  // Universidades com exames públicos: ligações da página inicial para /exames/<universidade>.
  const institutions = (await listPublicInstitutions().catch(() => [])).map((item) => ({ slug: item.slug, shortName: item.shortName, name: item.name, exams: item.exams }))
  const posts = latest.map((post) => ({ slug: post.slug, category: post.subjectName ?? (post.track ? BLOG_TRACK_LABEL[post.track] : 'Artigo'), title: post.title, description: post.excerpt }))
  return <HomePage signedIn={Boolean(session?.user)} posts={posts} institutions={institutions} />
}
