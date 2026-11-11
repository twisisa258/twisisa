import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExamRow } from '@/components/exames/exam-row'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
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
      <section className="tw5-top">
        <h1 className="tw5-h1"><span className="ex2-sr">Exames de admissão </span>{institution.shortName} <em>{year}.</em></h1>
        <p className="tw5-sub">{exams.length} {exams.length === 1 ? 'exame' : 'exames'}</p>
      </section>

      {[...bySubject.entries()].map(([subject, list]) => (
        <section key={subject} className="tw5-sec">
          <h2 className="tw5-h2">{subject}</h2>
          <ul className="tw5-rows">
            {list.map((exam) => <li key={exam.id}><ExamRow exam={exam} /></li>)}
          </ul>
        </section>
      ))}

      {years.length > 1 && (
        <section className="tw5-sec">
          <h2 className="tw5-h2">Outros anos</h2>
          <ul className="tw5-chips">
            {years.filter((item) => item.year !== year).map((item) => <li key={item.year}><Link href={yearPath(institution.slug, item.year)}>{item.year} · {item.count}</Link></li>)}
          </ul>
        </section>
      )}
    </PublicShell>
  )
}
