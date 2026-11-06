import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, ExternalLink } from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { getPublicExam } from '@/lib/exames'
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
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames de admissão', path: '/exames' }, { name: exam.institution.shortName, path: `/exames/${exam.institution.slug}` }, { name: exam.subject.name, path: subjectPath }, { name: exam.heading, path }]),
    ],
  }
  const viewer = `/api/publico/exames/${exam.id}`
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames de admissão', href: '/exames' }, { name: exam.institution.shortName, href: `/exames/${exam.institution.slug}` }, { name: exam.subject.name, href: subjectPath }, { name: exam.heading }]} />
      <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{exam.heading}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-texto-2">
        {exam.description || `Exame de admissão de ${exam.subject.name} da ${exam.institution.name}${exam.year ? `, de ${exam.year}` : ''}.`} Lê-o aqui, sem criar conta. Para o descarregar em PDF é preciso uma conta gratuita.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <a href={viewer} target="_blank" rel="noopener" className="btn btn-secundario btn-grande"><ExternalLink size={17} aria-hidden /> Abrir o exame</a>
        <a href={`/api/biblioteca/${exam.id}/ficheiro?baixar=1`} className="btn btn-primario btn-grande"><Download size={17} aria-hidden /> Descarregar o PDF</a>
      </div>

      <iframe src={`${viewer}#toolbar=0&navpanes=0`} title={exam.heading} className="mt-6 hidden h-[78dvh] w-full rounded-2xl border border-linha bg-white md:block" />
      <p className="mt-3 text-xs text-texto-2 md:hidden">No telemóvel, toca em «Abrir o exame» para o ler.</p>

      <section className="mt-10 rounded-2xl border border-linha bg-white p-5">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">Pratica este exame</h2>
        <p className="mt-2 text-[15px] leading-7 text-texto-2">No Twisisa podes treinar com questões reais de {exam.subject.name} da {exam.institution.shortName}, ver a explicação do Jonas quando errares e acompanhar a tua evolução.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/sign-up" className="btn btn-primario">Criar conta gratuita</Link>
          <Link href={subjectPath} className="btn btn-terciario">Ver os temas principais de {exam.subject.name}</Link>
        </div>
      </section>
    </PublicShell>
  )
}
