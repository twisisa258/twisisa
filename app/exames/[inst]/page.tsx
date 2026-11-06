import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { getPublicInstitution, listPublicSubjects } from '@/lib/exames'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ inst: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const institution = await getPublicInstitution((await params).inst).catch(() => null)
  if (!institution) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  return pageMetadata({
    title: `Exames de admissão ${institution.shortName}: disciplinas, temas e exames anteriores | Twisisa`,
    description: `Prepara o exame de admissão da ${institution.name} (${institution.shortName}): escolhe a disciplina e vê os temas principais, exames anteriores e prática com questões reais.`,
    path: `/exames/${institution.slug}`,
  })
}

export default async function InstitutionExamsPage({ params }: Props) {
  const { inst } = await params
  const institution = await getPublicInstitution(inst).catch(() => null)
  if (!institution) notFound()
  const subjects = await listPublicSubjects(institution).catch(() => [])
  const base = `/exames/${institution.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', url: `${SITE_URL}${base}`, name: `Exames de admissão ${institution.shortName}`, inLanguage: 'pt-MZ', mainEntity: { '@type': 'ItemList', itemListElement: subjects.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}${base}/${item.slug}`, name: `Exame de admissão de ${item.name} ${institution.shortName}` })) } },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames de admissão', path: '/exames' }, { name: institution.shortName, path: base }]),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames de admissão', href: '/exames' }, { name: institution.shortName }]} />
      <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Exames de admissão {institution.shortName}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-texto-2">{institution.name}. Escolhe a disciplina que vais fazer no exame de admissão.</p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {subjects.map((item) => (
          <li key={item.id}>
            <Link href={`${base}/${item.slug}`} className="block rounded-2xl border border-linha bg-white p-5 text-texto no-underline transition-colors hover:border-marca">
              <span className="block text-lg font-semibold">{item.name}</span>
              <span className="mt-1 block text-xs text-texto-2">{item.topics > 0 ? `${item.topics} temas principais` : 'Exames anteriores'}{item.exams > 0 ? ` · ${item.exams} ${item.exams === 1 ? 'exame' : 'exames'}` : ''}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PublicShell>
  )
}
