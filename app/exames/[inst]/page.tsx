import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Target } from 'lucide-react'
import { notFound } from 'next/navigation'
import { ExamRow } from '@/components/exames/exam-row'
import { FaqList } from '@/components/exames/faq'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
import { faqInstitution, faqJsonLd, yearPath } from '@/lib/exames-pure'
import { findExams, getPublicInstitution, listExamYears, listPublicSubjects } from '@/lib/exames'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ inst: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const institution = await getPublicInstitution((await params).inst).catch(() => null)
  if (!institution) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  return pageMetadata({
    title: `Exames de admissão ${institution.shortName}: disciplinas, anos e temas | Twisisa`,
    description: `Exames de admissão da ${institution.name} (${institution.shortName}): lê os exames anteriores sem conta, vê os temas principais de cada disciplina e treina com questões reais.`,
    path: `/exames/${institution.slug}`,
  })
}

export default async function InstitutionExamsPage({ params }: Props) {
  const { inst } = await params
  const institution = await getPublicInstitution(inst).catch(() => null)
  if (!institution) notFound()
  const [subjects, years, recent] = await Promise.all([
    listPublicSubjects(institution).catch(() => []),
    listExamYears(institution.id).catch(() => []),
    findExams({ institutionId: institution.id, limit: 8 }).catch(() => ({ items: [], total: 0 })),
  ])
  const base = `/exames/${institution.slug}`
  const faq = faqInstitution(institution, subjects.map((item) => item.name), years.map((item) => item.year))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', url: `${SITE_URL}${base}`, name: `Exames de admissão ${institution.shortName}`, inLanguage: 'pt-MZ', isPartOf: { '@id': `${SITE_URL}/#website` }, mainEntity: { '@type': 'ItemList', itemListElement: subjects.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}${base}/${item.slug}`, name: `Exame de admissão de ${item.name} ${institution.shortName}` })) } },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames', path: '/exames' }, { name: institution.shortName, path: base }]),
      faqJsonLd(faq),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: institution.shortName }]} />
      <section className="tw5-top">
        <h1 className="tw5-h1">Exames <em>{institution.shortName}.</em></h1>
        <p className="tw5-sub">{institution.name}</p>
        <div className="tw5-actions">
          <Link href="/sign-up" className="tw-btn lg"><ArrowRight size={18} aria-hidden /> Praticar</Link>
          <Link href="/simulado" className="tw-btn lg ol"><Target size={18} aria-hidden /> Ver o simulador</Link>
        </div>
      </section>

      {subjects.length > 0 && (
        <section className="tw5-sec" aria-labelledby="disciplinas">
          <h2 id="disciplinas" className="tw5-h2">Disciplinas</h2>
          <ul className="tw5-tiles">
            {subjects.map((item, index) => (
              <Reveal as="li" key={item.id} delay={Math.min(index, 5) * 0.06}>
                <Link href={`${base}/${item.slug}`} className="tw5-tile">
                  <b>{item.name}</b>
                  <span>{item.topics > 0 ? `${item.topics} temas` : 'Exames'}{item.exams > 0 ? ` · ${item.exams} ${item.exams === 1 ? 'exame' : 'exames'}` : ''} →</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {years.length > 0 && (
        <section className="tw5-sec">
          <h2 className="tw5-h2">Por ano</h2>
          <ul className="tw5-chips">
            {years.map((item) => <li key={item.year}><Link href={yearPath(institution.slug, item.year)}>{item.year} · {item.count}</Link></li>)}
          </ul>
        </section>
      )}

      {recent.items.length > 0 && (
        <section className="tw5-sec" aria-labelledby="recentes">
          <h2 id="recentes" className="tw5-h2">Mais recentes</h2>
          <ul className="tw5-rows">
            {recent.items.map((exam) => <li key={exam.id}><ExamRow exam={exam} /></li>)}
          </ul>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}
