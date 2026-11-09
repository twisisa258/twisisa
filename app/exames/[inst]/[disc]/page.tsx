import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { FaqList } from '@/components/exames/faq'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
import { faqJsonLd, faqSubject, yearPath } from '@/lib/exames-pure'
import { getSubjectPage, listPublicSubjects } from '@/lib/exames'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ inst: string; disc: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { inst, disc } = await params
  const page = await getSubjectPage(inst, disc).catch(() => null)
  if (!page) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  const { institution, subject, topics, exams } = page
  return pageMetadata({
    title: `Exame de admissão de ${subject.name} ${institution.shortName}: temas e exames anteriores | Twisisa`,
    description: `Exame de admissão de ${subject.name} na ${institution.shortName}: ${topics.length > 0 ? `os ${topics.length} temas principais a estudar` : 'o que estudar'}${exams.length > 0 ? `, ${exams.length} ${exams.length === 1 ? 'exame anterior' : 'exames anteriores'} para ler` : ''} e prática com questões reais.`,
    path: `/exames/${institution.slug}/${subject.slug}`,
  })
}

export default async function SubjectExamPage({ params }: Props) {
  const { inst, disc } = await params
  const page = await getSubjectPage(inst, disc).catch(() => null)
  if (!page) notFound()
  const { institution, subject, topics, exams, courses } = page
  const base = `/exames/${institution.slug}/${subject.slug}`
  const otherSubjects = (await listPublicSubjects(institution).catch(() => [])).filter((item) => item.slug !== subject.slug)
  const years = [...new Set(exams.map((exam) => exam.year).filter((year): year is number => year !== null))].sort((a, b) => b - a)
  const faq = faqSubject({ subject: subject.name, institution: institution.shortName, topics: topics.map((topic) => topic.title), examYears: exams.map((exam) => exam.year), examCount: exams.length })
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        url: `${SITE_URL}${base}`,
        name: `Exame de admissão de ${subject.name} ${institution.shortName}`,
        inLanguage: 'pt-MZ',
        about: { '@type': 'Thing', name: `Exame de admissão de ${subject.name}` },
        mainEntity: { '@type': 'ItemList', itemListElement: topics.map((topic) => ({ '@type': 'ListItem', position: topic.position, name: topic.title })) },
      },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames', path: '/exames' }, { name: institution.shortName, path: `/exames/${institution.slug}` }, { name: subject.name, path: base }]),
      faqJsonLd(faq),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: institution.shortName, href: `/exames/${institution.slug}` }, { name: subject.name }]} />
      <section className="tw5-top">
        <h1 className="tw5-h1">{subject.name} <em>{institution.shortName}.</em></h1>
        <p className="tw5-sub">Exame de admissão</p>
        <div className="tw5-actions">
          <Link href="/sign-up" className="tw-btn lg">Praticar</Link>
          {topics.length > 0 && <a href={`${base}/temas.pdf`} className="tw-btn lg ol">Temas em PDF</a>}
        </div>
      </section>

      {topics.length > 0 && (
        <section className="tw5-sec" aria-labelledby="temas">
          <h2 id="temas" className="tw5-h2">{topics.length} temas principais</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {topics.map((topic) => (
              <Reveal as="li" key={topic.position} className="tw5-topic">
                <h3><i>{topic.position}</i>{topic.title}</h3>
                <p>{topic.summary}</p>
                {topic.tips && <p className="dica">Dica: {topic.tips}</p>}
              </Reveal>
            ))}
          </ol>
        </section>
      )}

      {exams.length > 0 && (
        <section className="tw5-sec" aria-labelledby="exames">
          <h2 id="exames" className="tw5-h2">Exames anteriores</h2>
          <ul className="tw5-rows">
            {exams.map((exam) => (
              <li key={exam.id}>
                <Link href={`${base}/${exam.id}`} className="tw5-row"><b>{exam.heading}</b>{exam.year && <em>{exam.year}</em>}<u>Ler</u></Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {courses.length > 0 && (
        <section className="tw5-sec" aria-labelledby="cursos">
          <h2 id="cursos" className="tw5-h2">Cursos que pedem {subject.name}</h2>
          <ul className="tw5-chips">
            {courses.map((course) => <li key={course.name}><span>{course.name}</span></li>)}
          </ul>
        </section>
      )}

      {years.length > 0 && (
        <section className="tw5-sec">
          <h2 className="tw5-h2">Por ano</h2>
          <ul className="tw5-chips">
            {years.map((year) => <li key={year}><Link href={yearPath(institution.slug, year)}>{year}</Link></li>)}
          </ul>
        </section>
      )}

      {otherSubjects.length > 0 && (
        <section className="tw5-sec">
          <h2 className="tw5-h2">Outras disciplinas</h2>
          <ul className="tw5-chips">
            {otherSubjects.map((item) => <li key={item.id}><Link href={`/exames/${institution.slug}/${item.slug}`}>{item.name}</Link></li>)}
          </ul>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}
