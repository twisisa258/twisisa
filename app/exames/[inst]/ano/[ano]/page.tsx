import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExamRow } from '@/components/exames/exam-row'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
import { examPath, isYear, yearPath } from '@/lib/exames-pure'
import { getYearPage } from '@/lib/exames'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ inst: string; ano: string }> }

async function load(params: Props['params']) {
  const { inst, ano } = await params
  if (!isYear(ano)) return null
  return getYearPage(inst, Number(ano)).catch(() => null)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load(params)
  if (!page) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  const { institution, year, exams } = page
  return pageMetadata({
    title: `Exames de admissão ${institution.shortName} ${year}: ${exams.length === 1 ? '1 exame' : `${exams.length} exames`} para ler | Twisisa`,
    description: `Exames de admissão da ${institution.shortName} de ${year}: ${[...new Set(exams.map((exam) => exam.subjectName))].slice(0, 4).join(', ')}. Lê sem conta e descarrega o PDF com uma conta gratuita.`,
    path: yearPath(institution.slug, year),
  })
}

export default async function YearExamsPage({ params }: Props) {
  const page = await load(params)
  if (!page) notFound()
  const { institution, year, exams, years } = page
  const path = yearPath(institution.slug, year)
  const bySubject = new Map<string, typeof exams>()
  for (const exam of exams) bySubject.set(exam.subjectName, [...(bySubject.get(exam.subjectName) ?? []), exam])
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', url: `${SITE_URL}${path}`, name: `Exames de admissão ${institution.shortName} ${year}`, inLanguage: 'pt-MZ', isPartOf: { '@id': `${SITE_URL}/#website` }, mainEntity: { '@type': 'ItemList', itemListElement: exams.map((exam, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}${examPath(exam)}`, name: exam.heading })) } },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames', path: '/exames' }, { name: institution.shortName, path: `/exames/${institution.slug}` }, { name: String(year), path }]),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: institution.shortName, href: `/exames/${institution.slug}` }, { name: String(year) }]} />
      <section className="rv-hero">
        <h1 className="text-[clamp(1.9rem,1.4rem+2.4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.04em]">Exames de admissão {institution.shortName} {year}</h1>
        <p className="mt-3 max-w-[60ch] text-[17px] leading-7 text-texto-2">Todos os exames da {institution.name} de {year} que temos no Twisisa. Lê-os sem conta; para descarregar o PDF cria uma conta gratuita.</p>
      </section>

      {[...bySubject.entries()].map(([subject, list]) => (
        <section key={subject} className="mt-10">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">{subject}</h2>
          <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
            {list.map((exam, index) => <Reveal as="li" key={exam.id} delay={Math.min(index, 4) * 0.05}><ExamRow exam={exam} /></Reveal>)}
          </ul>
        </section>
      ))}

      {years.length > 1 && (
        <Reveal as="section" className="mt-12">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Outros anos da {institution.shortName}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {years.filter((item) => item.year !== year).map((item) => <li key={item.year}><Link href={yearPath(institution.slug, item.year)} className="ex-card inline-flex items-center gap-2 rounded-full border border-linha bg-white px-4 py-2 text-sm font-semibold text-texto no-underline">{item.year}<span className="text-xs font-medium text-texto-2">{item.count}</span></Link></li>)}
          </ul>
        </Reveal>
      )}
    </PublicShell>
  )
}
