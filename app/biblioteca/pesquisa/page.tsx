import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { parseListParams } from '@/lib/library-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { UrlFeedback } from '@/components/url-feedback'
import { Listing } from '@/components/biblioteca/listing'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Pesquisa na biblioteca | Twisisa', robots: { index: false } }

// Resultados da pesquisa em toda a biblioteca (sem texto, mostra todos os materiais com os mesmos filtros).
export default async function PesquisaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const firstName = session.user.name.split(' ')[0]
  const parsed = parseListParams(await searchParams)

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Biblioteca" title={parsed.q ? 'Resultados' : 'Todos os materiais'} backHref="/biblioteca" backLabel="Biblioteca">
      <UrlFeedback />
      <Listing userId={session.user.id} basePath="/biblioteca/pesquisa" params={parsed} />
    </StudentFeatureShell>
  )
}
