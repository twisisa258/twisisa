import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { BookOpen, ChevronRight, Library } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getHub, getSavedIds } from '@/lib/library'
import { withParams } from '@/lib/library-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { UrlFeedback } from '@/components/url-feedback'
import { LibraryProvider } from '@/components/biblioteca/library-provider'
import { LibrarySearch } from '@/components/biblioteca/library-search'
import { SectionRow } from '@/components/biblioteca/section-row'
import { EmptyState } from '@/components/states/empty-state'

export const metadata = {
  title: 'Biblioteca académica | Twisisa',
  description: 'Pesquisa exames anteriores, livros, manuais e guias de estudo em Moçambique.',
}

export const dynamic = 'force-dynamic'

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  // Endereços antigos (/biblioteca?q=...) passam para a página de resultados.
  if (q.trim()) redirect(withParams('/biblioteca/pesquisa', { q: q.trim().slice(0, 80) }))

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const firstName = session.user.name.split(' ')[0]
  const [hub, savedIds] = await Promise.all([getHub(), getSavedIds(session.user.id).catch(() => [] as string[])])
  const sections = hub.sections.filter((section) => section.items.length > 0)

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Biblioteca" title="Biblioteca" hideTitle hideBackLink>
      <UrlFeedback />
      <div className="space-y-8">
        <header className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2f7260] to-[#1d4d41] text-white">
            <Library size={20} aria-hidden="true" />
          </span>
          <h1 className="text-[15px] font-bold uppercase tracking-[0.16em] text-[#1d4d41]">Biblioteca</h1>
        </header>

        <LibrarySearch />

        {hub.failed && hub.total === 0 ? (
          <EmptyState title="Não foi possível carregar a biblioteca" description="Tenta outra vez dentro de instantes." icon={BookOpen} />
        ) : hub.total === 0 ? (
          <EmptyState title="A biblioteca ainda não tem materiais" icon={BookOpen} />
        ) : (
          <LibraryProvider savedIds={savedIds}>
            {hub.popular.length > 0 && <SectionRow title="Mais populares" items={hub.popular} />}
            {sections.map((section) => (
              <SectionRow key={section.slug} title={section.title} href={`/biblioteca/${section.slug}`} items={section.items} />
            ))}
            <Link
              href="/biblioteca/explorar"
              className="flex h-12 items-center justify-center gap-1 rounded-2xl bg-gradient-to-br from-[#eaf1ec] to-[#d6e6dc] text-sm font-semibold text-[#1d4d41]"
            >
              Explorar mais
              <ChevronRight size={16} />
            </Link>
          </LibraryProvider>
        )}
      </div>
    </StudentFeatureShell>
  )
}
