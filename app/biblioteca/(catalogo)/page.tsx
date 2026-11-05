import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, ChevronRight, Library } from 'lucide-react'
import { getHub, getSavedIds } from '@/lib/library'
import { withParams } from '@/lib/library-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { UrlFeedback } from '@/components/url-feedback'
import { LibraryProvider } from '@/components/biblioteca/library-provider'
import { LibrarySearch } from '@/components/biblioteca/library-search'
import { SectionRow } from '@/components/biblioteca/section-row'
import { EmptyState } from '@/components/states/empty-state'
import { requireStudent } from '@/lib/require-student'

export const metadata = {
  title: 'Biblioteca académica | Twisisa',
  description: 'Pesquisa exames anteriores, livros, manuais e guias de estudo em Moçambique.',
}

export const dynamic = 'force-dynamic'

export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  // Endereços antigos (/biblioteca?q=...) passam para a página de resultados.
  if (q.trim()) redirect(withParams('/biblioteca/pesquisa', { q: q.trim().slice(0, 80) }))

  const session = await requireStudent('/biblioteca')

  const firstName = session.user.name.split(' ')[0]
  const [hub, savedIds] = await Promise.all([getHub(), getSavedIds(session.user.id).catch(() => [] as string[])])
  const sections = hub.sections.filter((section) => section.items.length > 0)

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Biblioteca" title="Biblioteca" hideTitle hideBackLink>
      <UrlFeedback />
      <div className="space-y-8">
        <header className="tom-ajuda flex items-center gap-3.5">
          <span className="ic-tom ic-tom-lg"><Library size={24} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">Biblioteca</h1>
            {hub.total > 0 && <p className="text-[14px] leading-5 text-texto-2">{hub.total === 1 ? '1 material' : `${hub.total} materiais`} para estudar</p>}
          </div>
        </header>

        <LibrarySearch />

        {hub.failed && hub.total === 0 ? (
          <EmptyState tone="ajuda" title="Não foi possível carregar a biblioteca" description="Tenta outra vez dentro de instantes." icon={BookOpen} />
        ) : hub.total === 0 ? (
          <EmptyState tone="ajuda" title="A biblioteca ainda não tem materiais" description="Quando houver exames e apontamentos, aparecem aqui." icon={BookOpen} />
        ) : (
          <LibraryProvider savedIds={savedIds}>
            {hub.popular.length > 0 && <SectionRow title="Mais populares" slug="populares" items={hub.popular} />}
            {sections.map((section) => (
              <SectionRow key={section.slug} title={section.title} slug={section.slug} href={`/biblioteca/${section.slug}`} items={section.items} />
            ))}
            <Link
              href="/biblioteca/explorar"
              className="btn btn-tom tom-ajuda btn-grande w-full"
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
