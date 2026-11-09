import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { FaqList } from '@/components/exames/faq'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { faqJsonLd, faqSubject } from '@/lib/exames-pure'
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

const SHOWN_EXAMS = 4

// «Matemática UEM 2023 (I)»: o título sem o prefixo, que já se percebe pela página. O título completo fica na ligação (Google e leitores de ecrã).
function ExamLine({ base, exam }: { base: string; exam: { id: string; heading: string } }) {
  return (
    <Link href={`${base}/${exam.id}`} className="tw5-row" title={exam.heading} aria-label={exam.heading}>
      <b>{exam.heading.replace(/^Exame de admissão de /, '')}</b>
      <ChevronRight size={16} aria-hidden />
    </Link>
  )
}

// Cursos agrupados pela faculdade/unidade (os maiores grupos primeiro; sem unidade vão para o fim).
function groupCourses(courses: { name: string; unit: string | null }[]) {
  const map = new Map<string, string[]>()
  for (const course of courses) {
    const unit = course.unit?.trim() || 'Outros cursos'
    map.set(unit, [...(map.get(unit) ?? []), course.name])
  }
  return [...map.entries()]
    .map(([unit, names]) => ({ unit, names }))
    .sort((x, y) => (x.unit === 'Outros cursos' ? 1 : y.unit === 'Outros cursos' ? -1 : y.names.length - x.names.length || x.unit.localeCompare(y.unit)))
}

export default async function SubjectExamPage({ params }: Props) {
  const { inst, disc } = await params
  const page = await getSubjectPage(inst, disc).catch(() => null)
  if (!page) notFound()
  const { institution, subject, topics, exams, courses } = page
  const base = `/exames/${institution.slug}/${subject.slug}`
  const otherSubjects = (await listPublicSubjects(institution).catch(() => [])).filter((item) => item.slug !== subject.slug)
  const groups = groupCourses(courses)
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
        <h1 className="tw5-h1">{subject.name} {institution.shortName}</h1>
        <p className="tw5-sub">Exame de admissão</p>
        <div className="tw5-actions">
          <Link href="/sign-up" className="tw-btn"><ArrowRight size={17} aria-hidden /> Praticar</Link>
          {topics.length > 0 && <a href={`${base}/temas.pdf`} className="tw-btn ol"><Download size={17} aria-hidden /> Temas em PDF</a>}
        </div>
      </section>

      {exams.length > 0 && (
        <section className="tw5-sec" aria-labelledby="exames">
          <div className="tw6-lh"><h2 id="exames" className="tw5-h2">Exames anteriores</h2><span>{exams.length}</span></div>
          <ul className="tw5-rows">
            {exams.slice(0, SHOWN_EXAMS).map((exam) => <li key={exam.id}><ExamLine base={base} exam={exam} /></li>)}
          </ul>
          {exams.length > SHOWN_EXAMS && (
            <details className="tw6-more">
              <summary>Ver mais {exams.length - SHOWN_EXAMS}</summary>
              <ul className="tw5-rows">
                {exams.slice(SHOWN_EXAMS).map((exam) => <li key={exam.id}><ExamLine base={base} exam={exam} /></li>)}
              </ul>
            </details>
          )}
        </section>
      )}

      {topics.length > 0 && (
        <section className="tw5-sec" aria-labelledby="temas">
          <div className="tw6-lh"><h2 id="temas" className="tw5-h2">Temas principais</h2><span>{topics.length}</span></div>
          <div className="tw5-faq" style={{ marginTop: 8 }}>
            {topics.map((topic) => (
              <details key={topic.position}>
                <summary><i className="n">{topic.position}</i>{topic.title}<b aria-hidden="true">+</b></summary>
                <p>{topic.summary}</p>
                {topic.tips && <p className="dica">Dica: {topic.tips}</p>}
              </details>
            ))}
          </div>
        </section>
      )}

      {courses.length > 0 && (
        <section className="tw5-sec" aria-labelledby="cursos">
          <div className="tw6-lh"><h2 id="cursos" className="tw5-h2">Cursos que pedem {subject.name}</h2><span>{courses.length}</span></div>
          {groups.length === 1 ? (
            <ul className="tw6-cur" style={{ marginTop: 10 }}>{groups[0].names.map((name) => <li key={name}>{name}</li>)}</ul>
          ) : (
            <div className="tw5-faq" style={{ marginTop: 8 }}>
              {groups.map((group) => (
                <details key={group.unit}>
                  <summary>{group.unit}<small>{group.names.length}</small><b aria-hidden="true">+</b></summary>
                  <ul className="tw6-cur">{group.names.map((name) => <li key={name}>{name}</li>)}</ul>
                </details>
              ))}
            </div>
          )}
        </section>
      )}

      {otherSubjects.length > 0 && (
        <section className="tw5-sec" aria-labelledby="outras">
          <div className="tw6-lh"><h2 id="outras" className="tw5-h2">Outras disciplinas</h2></div>
          <ul className="tw5-chips sc" style={{ marginTop: 10 }}>
            {otherSubjects.map((item) => <li key={item.id}><Link href={`/exames/${institution.slug}/${item.slug}`}>{item.name}</Link></li>)}
          </ul>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}
