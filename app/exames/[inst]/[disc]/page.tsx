import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, FileText } from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { getSubjectPage } from '@/lib/exames'
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
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames de admissão', path: '/exames' }, { name: institution.shortName, path: `/exames/${institution.slug}` }, { name: subject.name, path: base }]),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames de admissão', href: '/exames' }, { name: institution.shortName, href: `/exames/${institution.slug}` }, { name: subject.name }]} />
      <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Exame de admissão de {subject.name} {institution.shortName}</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-texto-2">
        Tudo o que precisas para o exame de {subject.name} da {institution.name}: os temas a que deves dar prioridade, exames de anos anteriores para ler e praticar, e questões reais para treinares no Twisisa.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/sign-up" className="btn btn-primario btn-grande">Praticar com questões reais</Link>
        {topics.length > 0 && <a href={`${base}/temas.pdf`} className="btn btn-secundario btn-grande"><Download size={17} aria-hidden /> Descarregar os temas em PDF</a>}
      </div>
      {topics.length > 0 && <p className="mt-2 text-xs text-texto-2">Para descarregar é preciso criar uma conta gratuita.</p>}

      {topics.length > 0 && (
        <section className="mt-10" aria-labelledby="temas">
          <h2 id="temas" className="text-2xl font-semibold tracking-[-0.03em]">Os {topics.length} temas principais de {subject.name}</h2>
          <ol className="mt-5 space-y-4">
            {topics.map((topic) => (
              <li key={topic.position} className="rounded-2xl border border-linha bg-white p-5">
                <h3 className="text-lg font-semibold"><span className="mr-2 text-marca">{topic.position}.</span>{topic.title}</h3>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-[#4f574f]">{topic.summary}</p>
                {topic.tips && <p className="mt-3 rounded-xl bg-marca-suave px-3.5 py-2.5 text-sm leading-6 text-marca"><strong className="font-semibold">Dica:</strong> {topic.tips}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {exams.length > 0 && (
        <section className="mt-10" aria-labelledby="exames">
          <h2 id="exames" className="text-2xl font-semibold tracking-[-0.03em]">Exames anteriores de {subject.name} na {institution.shortName}</h2>
          <p className="mt-2 text-sm text-texto-2">Podes ler todos sem conta. Para os descarregar em PDF, cria uma conta gratuita.</p>
          <ul className="mt-4 divide-y divide-[#edf0e9] rounded-2xl border border-linha bg-white">
            {exams.map((exam) => (
              <li key={exam.id}>
                <Link href={`${base}/${exam.id}`} className="flex items-center gap-3 px-4 py-3.5 text-texto no-underline hover:bg-[#f6f8f3]">
                  <FileText size={18} className="shrink-0 text-marca" aria-hidden />
                  <span className="min-w-0 flex-1 text-[15px] font-semibold">{exam.heading}</span>
                  <span className="shrink-0 text-sm font-semibold text-marca">Ler</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {courses.length > 0 && (
        <section className="mt-10" aria-labelledby="cursos">
          <h2 id="cursos" className="text-2xl font-semibold tracking-[-0.03em]">Cursos da {institution.shortName} que pedem {subject.name}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {courses.map((course) => <li key={course.name} className="rounded-full border border-linha bg-white px-3.5 py-1.5 text-sm">{course.name}</li>)}
          </ul>
        </section>
      )}
    </PublicShell>
  )
}
