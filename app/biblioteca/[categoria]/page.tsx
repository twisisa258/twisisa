import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCategoryName } from '@/lib/library'
import { MAIN_SECTIONS, parseListParams } from '@/lib/library-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { UrlFeedback } from '@/components/url-feedback'
import { Listing } from '@/components/biblioteca/listing'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ categoria: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params
  const main = MAIN_SECTIONS.find((section) => section.slug === categoria)
  return { title: `${main?.title ?? 'Biblioteca'} | Twisisa`, robots: { index: false } }
}

// Página própria de uma secção: só mostra materiais daquela categoria (exames, livros, guias, ...).
export default async function CategoriaPage({ params, searchParams }: Props) {
  const { categoria } = await params
  if (!/^[a-z0-9-]{1,40}$/.test(categoria)) notFound()

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const main = MAIN_SECTIONS.find((section) => section.slug === categoria)
  const name = main?.title ?? (await getCategoryName(categoria).catch(() => null))
  if (!name) notFound()

  const firstName = session.user.name.split(' ')[0]
  const parsed = parseListParams(await searchParams)

  return (
    <StudentFeatureShell
      firstName={firstName}
      eyebrow="Biblioteca"
      title={name}
      backHref={main ? '/biblioteca' : '/biblioteca/explorar'}
      backLabel={main ? 'Biblioteca' : 'Explorar'}
    >
      <UrlFeedback />
      <Listing userId={session.user.id} basePath={`/biblioteca/${categoria}`} category={categoria} params={parsed} />
    </StudentFeatureShell>
  )
}
