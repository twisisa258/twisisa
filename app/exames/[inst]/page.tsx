import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
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
      <section className="rv-hero">
        <h1 className="text-[clamp(1.9rem,1.4rem+2.4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.04em]">Exames de admissão {institution.shortName}</h1>
        <p className="mt-3 max-w-[60ch] text-[17px] leading-7 text-texto-2">{institution.name}. Escolhe a disciplina, lê os exames de anos anteriores e treina com questões reais.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/sign-up" className="btn btn-primario btn-grande">Praticar com questões reais</Link>
          <Link href="/simulado" className="btn btn-secundario btn-grande">Como funciona o simulado</Link>
        </div>
      </section>

      {subjects.length > 0 && (
        <section className="mt-12" aria-labelledby="disciplinas">
          <h2 id="disciplinas" className="text-2xl font-semibold tracking-[-0.03em]">Disciplinas</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((item, index) => (
              <Reveal as="li" key={item.id} delay={Math.min(index, 5) * 0.06}>
                <Link href={`${base}/${item.slug}`} className="ex-card flex h-full items-start justify-between gap-3 rounded-2xl border border-linha bg-white p-5 text-texto no-underline">
                  <span>
                    <span className="block text-lg font-semibold tracking-[-0.02em]">{item.name}</span>
                    <span className="mt-1 block text-xs font-semibold text-marca">{item.topics > 0 ? `${item.topics} temas principais` : 'Exames anteriores'}{item.exams > 0 ? ` · ${item.exams} ${item.exams === 1 ? 'exame' : 'exames'}` : ''}</span>
                  </span>
                  <ArrowRight size={18} aria-hidden className="mt-1 shrink-0 text-marca" />
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {years.length > 0 && (
        <Reveal as="section" className="mt-12">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Exames {institution.shortName} por ano</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {years.map((item) => <li key={item.year}><Link href={yearPath(institution.slug, item.year)} className="ex-card inline-flex items-center gap-2 rounded-full border border-linha bg-white px-4 py-2 text-sm font-semibold text-texto no-underline">{item.year}<span className="text-xs font-medium text-texto-2">{item.count}</span></Link></li>)}
          </ul>
        </Reveal>
      )}

      {recent.items.length > 0 && (
        <section className="mt-12" aria-labelledby="recentes">
          <h2 id="recentes" className="text-2xl font-semibold tracking-[-0.03em]">Exames mais recentes da {institution.shortName}</h2>
          <ul className="mt-5 grid gap-2.5 md:grid-cols-2">
            {recent.items.map((exam, index) => <Reveal as="li" key={exam.id} delay={Math.min(index, 4) * 0.05}><ExamRow exam={exam} /></Reveal>)}
          </ul>
        </section>
      )}

      <Reveal><FaqList items={faq} /></Reveal>
    </PublicShell>
  )
}
