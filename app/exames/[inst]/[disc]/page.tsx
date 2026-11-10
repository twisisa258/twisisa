import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { CursosPanel } from '@/components/exames/cursos-panel'
import { DisciplinaTabs, type DisciplinaTab } from '@/components/exames/disciplina-tabs'
import { FaqList } from '@/components/exames/faq'
import { PublicShell } from '@/components/exames/public-shell'
import { faqJsonLd, faqSubject } from '@/lib/exames-pure'
import { examLabel, groupCourses, practiceLabel, subjectHue } from '@/lib/exames-ui'
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

const SHOWN_YEARS = 3

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

  const label = (exam: { heading: string; year: number | null }) => examLabel(exam.heading, institution.shortName, exam.year)
  const [latest, ...older] = exams
  const tabs: DisciplinaTab[] = []

  if (latest) {
    tabs.push({
      id: 'exames',
      label: 'Exames',
      count: exams.length,
      panel: (
        <>
          <h2 className="ex2-sr">Exames anteriores de {subject.name} {institution.shortName}</h2>
          <div className="ex2-feat">
            <div className="t">
              <span className="ex2-tag">Mais recente</span>
              <p className="ex2-year">{label(latest)}</p>
              <p className="ex2-fs">Exame de admissão de {subject.name} {institution.shortName}</p>
              <Link href={`${base}/${latest.id}`} className="tw-btn sm" title={latest.heading} aria-label={`Ler ${latest.heading}`}>Ler exame</Link>
            </div>
            <div className="ex2-paper" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</div>
          </div>
          {older.length > 0 && (
            <>
              <ul className="ex2-yl">
                {older.slice(0, SHOWN_YEARS).map((exam) => <li key={exam.id}><YearRow href={`${base}/${exam.id}`} heading={exam.heading} text={label(exam)} /></li>)}
              </ul>
              {older.length > SHOWN_YEARS && (
                <details className="ex2-more">
                  <summary>Ver mais {older.length - SHOWN_YEARS}</summary>
                  <ul className="ex2-yl">
                    {older.slice(SHOWN_YEARS).map((exam) => <li key={exam.id}><YearRow href={`${base}/${exam.id}`} heading={exam.heading} text={label(exam)} /></li>)}
                  </ul>
                </details>
              )}
            </>
          )}
        </>
      ),
    })
  }

  if (topics.length > 0) {
    tabs.push({
      id: 'temas',
      label: 'Temas',
      count: topics.length,
      panel: (
        <>
          <h2 className="ex2-sr">Temas principais do exame de {subject.name} {institution.shortName}</h2>
          <div className="ex2-tm">
            {topics.map((topic, index) => (
              <details key={topic.position} open={index === 0}>
                <summary><span className="nn">{topic.position}</span>{topic.title}</summary>
                <p>{topic.summary}</p>
                {topic.tips && <div className="dc">Dica: {topic.tips}</div>}
              </details>
            ))}
          </div>
        </>
      ),
    })
  }

  if (courses.length > 0) {
    tabs.push({
      id: 'cursos',
      label: 'Cursos',
      count: courses.length,
      panel: (
        <>
          <h2 className="ex2-sr">Cursos da {institution.shortName} que pedem {subject.name}</h2>
          <CursosPanel subject={subject.name} groups={groups} />
        </>
      ),
    })
  }

  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Link href={`/exames/${institution.slug}`} className="ex2-back"><ChevronLeft size={16} aria-hidden />{institution.shortName}</Link>

      <header className="ex2-ti">
        <div className="ex2-tile" style={{ '--hue': subjectHue(subject.slug) } as CSSProperties} aria-hidden="true">{subject.name.trim().slice(0, 1).toUpperCase()}</div>
        <div>
          <h1 className="ex2-h1">{subject.name}</h1>
          <p className="ex2-sub">{institution.shortName} · Exame de admissão</p>
        </div>
      </header>

      <div className="ex2-acts">
        <Link href="/sign-up" className="tw-btn ex2-main ex2-pub">{practiceLabel(subject.name)}</Link>
        <Link href="/aluno/simulador" className="tw-btn ex2-main ex2-al">{practiceLabel(subject.name)}</Link>
        {topics.length > 0 && <a href={`${base}/temas.pdf`} className="tw-btn ol" aria-label="Temas em PDF"><Download size={17} aria-hidden />PDF</a>}
      </div>

      <DisciplinaTabs tabs={tabs} label={`${subject.name} ${institution.shortName}`} />

      {otherSubjects.length > 0 && (
        <section className="ex2-oth" aria-labelledby="outras">
          <h2 id="outras">Outras disciplinas</h2>
          <ul className="ex2-chips">
            {otherSubjects.map((item) => <li key={item.id}><Link href={`/exames/${institution.slug}/${item.slug}`}>{item.name}</Link></li>)}
          </ul>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}

function YearRow({ href, heading, text }: { href: string; heading: string; text: string }) {
  return (
    <Link href={href} className="ex2-yr" title={heading} aria-label={heading}>
      <b>{text}</b><span>Exame de admissão</span><ChevronRight size={16} aria-hidden />
    </Link>
  )
}
