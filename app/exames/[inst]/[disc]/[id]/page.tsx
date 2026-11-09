import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download } from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { examYearLabel } from '@/components/exames/exam-row'
import { PdfPreview } from '@/components/exames/pdf-preview'
import { FaqList } from '@/components/exames/faq'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { examPath, faqExam, faqJsonLd } from '@/lib/exames-pure'
import { findExams, getPublicExam } from '@/lib/exames'
import { OG_IMAGE, SITE_LOCALE, SITE_NAME, SITE_URL, breadcrumbJsonLd } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ inst: string; disc: string; id: string }> }

async function load(params: Props['params']) {
  const { inst, disc, id } = await params
  if (!/^[\w-]{1,100}$/.test(id)) return null
  const exam = await getPublicExam(id).catch(() => null)
  // O endereço tem de bater com o documento: evita páginas duplicadas.
  if (!exam || exam.institution.slug !== inst || exam.subject.slug !== disc) return null
  return exam
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const exam = await load(params)
  if (!exam) return { title: 'Página não encontrada | Twisisa', robots: { index: false, follow: false } }
  const path = `/exames/${exam.institution.slug}/${exam.subject.slug}/${exam.id}`
  const description = `${exam.heading}: lê o exame em PDF, sem conta. Estuda os temas principais e pratica com questões reais da ${exam.institution.shortName} no Twisisa.`
  return {
    title: `${exam.heading} | ${SITE_NAME}`,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: { type: 'article', locale: SITE_LOCALE, siteName: SITE_NAME, url: path, title: exam.heading, description, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: exam.heading, description, images: [OG_IMAGE.url] },
  }
}

export default async function ExamPage({ params }: Props) {
  const exam = await load(params)
  if (!exam) notFound()
  const subjectPath = `/exames/${exam.institution.slug}/${exam.subject.slug}`
  const path = `${subjectPath}/${exam.id}`
  // Outros anos da mesma disciplina e universidade (inclui este): liga as páginas entre si e ajuda quem procura outro ano.
  const sameSubject = (await findExams({ institutionId: exam.institution.id, subjectId: exam.subject.id, limit: 12 }).catch(() => ({ items: [], total: 0 }))).items
  const faq = faqExam({ heading: exam.heading, subject: exam.subject.name, institution: exam.institution.shortName })
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        name: exam.heading,
        url: `${SITE_URL}${path}`,
        inLanguage: 'pt-MZ',
        learningResourceType: 'Exame de admissão',
        about: { '@type': 'Thing', name: exam.subject.name },
        provider: { '@type': 'CollegeOrUniversity', name: exam.institution.name },
        ...(exam.year ? { datePublished: String(exam.year) } : {}),
        isAccessibleForFree: true,
      },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames', path: '/exames' }, { name: exam.institution.shortName, path: `/exames/${exam.institution.slug}` }, { name: exam.subject.name, path: subjectPath }, { name: exam.heading, path }]),
      faqJsonLd(faq),
    ],
  }
  const viewer = `/api/publico/exames/${exam.id}`
  const download = `/api/biblioteca/${exam.id}/ficheiro?baixar=1`
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: exam.institution.shortName, href: `/exames/${exam.institution.slug}` }, { name: exam.subject.name, href: subjectPath }, { name: exam.heading }]} />
      <section className="tw5-top">
        <h1 className="tw5-h1">{exam.heading}</h1>
        <div className="tw5-actions">
          <a href={download} className="tw-btn"><Download size={17} aria-hidden /> Descarregar PDF</a>
        </div>
      </section>

      {/* O exame aparece aqui, folha a folha, sem tocar em nenhum botão. */}
      <PdfPreview src={viewer} title={exam.heading} downloadHref={download} />

      {sameSubject.length > 1 && (
        <section className="tw5-sec" aria-labelledby="outros">
          <div className="tw6-lh"><h2 id="outros" className="tw5-h2">Outros anos</h2></div>
          <ul className="tw5-chips sc" style={{ marginTop: 10 }}>
            {sameSubject.map((item) => (
              <li key={item.id}>
                {item.id === exam.id
                  ? <span aria-current="page">{examYearLabel(item) || item.title}</span>
                  : <Link href={examPath(item)} title={item.heading}>{examYearLabel(item) || item.title}</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="tw6-tr">
        <b>Pratica {exam.subject.name}</b>
        <Link href="/sign-up" className="tw-btn sm">Criar conta</Link>
      </div>

      <FaqList items={faq} />
    </PublicShell>
  )
}
