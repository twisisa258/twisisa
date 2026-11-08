import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, ExternalLink } from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { ExamRow } from '@/components/exames/exam-row'
import { FaqList } from '@/components/exames/faq'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
import { faqExam, faqJsonLd, yearPath } from '@/lib/exames-pure'
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
  // Outros exames da mesma disciplina e universidade: liga as páginas entre si (e ajuda quem procura outro ano).
  const siblings = (await findExams({ institutionId: exam.institution.id, subjectId: exam.subject.id, limit: 9 }).catch(() => ({ items: [], total: 0 }))).items.filter((item) => item.id !== exam.id).slice(0, 8)
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
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames', href: '/exames' }, { name: exam.institution.shortName, href: `/exames/${exam.institution.slug}` }, { name: exam.subject.name, href: subjectPath }, { name: exam.heading }]} />
      <section className="rv-hero space-y-3">
      <h1 className="text-[clamp(1.8rem,1.3rem+2.2vw,2.8rem)] font-semibold leading-[1.1] tracking-[-0.04em]">{exam.heading}</h1>
      <p className="max-w-[62ch] text-[17px] leading-7 text-texto-2">
        {exam.description || `Exame de admissão de ${exam.subject.name} da ${exam.institution.name}${exam.year ? `, de ${exam.year}` : ''}.`} Lê-o aqui, sem criar conta. Para o descarregar em PDF é preciso uma conta gratuita.
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <a href={viewer} target="_blank" rel="noopener" className="btn btn-secundario btn-grande"><ExternalLink size={17} aria-hidden /> Abrir o exame</a>
        <a href={`/api/biblioteca/${exam.id}/ficheiro?baixar=1`} className="btn btn-primario btn-grande"><Download size={17} aria-hidden /> Descarregar o PDF</a>
      </div>
      {exam.year && <p className="text-sm text-texto-2">Ver todos os <Link href={yearPath(exam.institution.slug, exam.year)} className="font-semibold text-marca no-underline hover:underline">exames da {exam.institution.shortName} de {exam.year}</Link>.</p>}
      </section>

      <iframe src={`${viewer}#toolbar=0&navpanes=0`} title={exam.heading} className="mt-6 hidden h-[78dvh] w-full rounded-2xl border border-linha bg-white md:block" />
      <p className="mt-3 text-xs text-texto-2 md:hidden">No telemóvel, toca em «Abrir o exame» para o ler.</p>

      <Reveal as="section" className="mt-10 rounded-2xl border border-linha bg-white p-5">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">Pratica este exame</h2>
        <p className="mt-2 text-[15px] leading-7 text-texto-2">No Twisisa podes treinar com questões reais de {exam.subject.name} da {exam.institution.shortName}, ver a explicação do Jonas quando errares e acompanhar a tua evolução.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/sign-up" className="btn btn-primario">Criar conta gratuita</Link>
          <Link href={subjectPath} className="btn btn-terciario">Ver os temas principais de {exam.subject.name}</Link>
        </div>
      </Reveal>

      {siblings.length > 0 && (
        <section className="mt-10" aria-labelledby="outros">
          <h2 id="outros" className="text-xl font-semibold tracking-[-0.02em]">Outros exames de {exam.subject.name} da {exam.institution.shortName}</h2>
          <ul className="mt-4 grid gap-2.5 md:grid-cols-2">
            {siblings.map((item, index) => <Reveal as="li" key={item.id} delay={Math.min(index, 4) * 0.05}><ExamRow exam={item} /></Reveal>)}
          </ul>
        </section>
      )}

      <Reveal><FaqList items={faq} /></Reveal>
    </PublicShell>
  )
}
