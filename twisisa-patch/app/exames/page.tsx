import Link from 'next/link'
import { ArrowRight, BookOpen, Download, FileText, Search, Target } from 'lucide-react'
import { ExamRow } from '@/components/exames/exam-row'
import { FaqList } from '@/components/exames/faq'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
import { faqHub, faqJsonLd } from '@/lib/exames-pure'
import { findExams, listOtherCategories, listPublicInstitutions } from '@/lib/exames'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

export const metadata = pageMetadata({
  title: 'Exames de admissão em Moçambique: ler, baixar e praticar | Twisisa',
  description: 'Exames de admissão anteriores da UEM, UP e de outras universidades moçambicanas. Lê sem conta, descarrega o PDF, vê os temas a estudar e treina com questões reais.',
  path: '/exames',
})

export default async function ExamesPage() {
  const [institutions, recent, others] = await Promise.all([
    listPublicInstitutions().catch(() => []),
    findExams({ limit: 8 }).catch(() => ({ items: [], total: 0 })),
    listOtherCategories().catch(() => []),
  ])
  const faq = faqHub(institutions.map((item) => item.shortName))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/exames#pagina`,
        url: `${SITE_URL}/exames`,
        name: 'Exames de admissão em Moçambique',
        inLanguage: 'pt-MZ',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: { '@type': 'ItemList', itemListElement: institutions.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}/exames/${item.slug}`, name: `Exames de admissão ${item.shortName}` })) },
      },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames', path: '/exames' }]),
      faqJsonLd(faq),
    ],
  }

  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames' }]} />

      <section className="rv-hero">
        <h1 className="max-w-[18ch] text-[clamp(2rem,1.4rem+3vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.045em]">Exames de admissão em Moçambique</h1>
        <p className="mt-4 max-w-[58ch] text-[17px] leading-7 text-texto-2">Lê os exames de anos anteriores sem criar conta, descarrega o PDF, vê os temas que mais saem e treina com questões reais.</p>
        <form role="search" action="/exames/pesquisa" method="get" className="mt-6 flex max-w-[560px] items-center gap-2">
          <label htmlFor="exames-q" className="sr-only">Pesquisar exames</label>
          <div className="relative min-w-0 flex-1">
            <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-texto-2" />
            <input id="exames-q" name="q" type="search" maxLength={80} autoComplete="off" placeholder="Ex.: Matemática UEM 2023" className="h-13 min-h-[52px] w-full rounded-2xl border border-linha bg-white pl-11 pr-4 text-[16px] outline-none placeholder:text-texto-2 focus:border-marca" />
          </div>
          <button type="submit" className="btn btn-primario btn-grande shrink-0">Pesquisar</button>
        </form>
        <p className="mt-3 text-sm text-texto-2">Ler é grátis e sem conta. Descarregar o PDF e praticar pedem uma conta gratuita.</p>
      </section>

      <section className="mt-12" aria-labelledby="universidades">
        <h2 id="universidades" className="text-2xl font-semibold tracking-[-0.03em]">Escolhe a universidade</h2>
        {institutions.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-linha bg-white p-5 text-sm text-texto-2">Estamos a preparar este conteúdo. Volta em breve.</p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {institutions.map((item, index) => (
              <Reveal as="li" key={item.id} delay={Math.min(index, 5) * 0.06}>
                <Link href={`/exames/${item.slug}`} className="ex-card block h-full rounded-2xl border border-linha bg-white p-5 text-texto no-underline">
                  <span className="flex items-start justify-between gap-3">
                    <span className="block text-xl font-semibold tracking-[-0.03em]">{item.shortName}</span>
                    <ArrowRight size={18} aria-hidden className="mt-1 shrink-0 text-marca" />
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-texto-2">{item.name}</span>
                  <span className="mt-4 block text-xs font-semibold text-marca">{item.exams} {item.exams === 1 ? 'exame' : 'exames'}{item.courses > 0 ? ` · ${item.courses} ${item.courses === 1 ? 'curso' : 'cursos'}` : ''}</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        )}
      </section>

      {recent.items.length > 0 && (
        <section className="mt-12" aria-labelledby="recentes">
          <h2 id="recentes" className="text-2xl font-semibold tracking-[-0.03em]">Exames mais recentes</h2>
          <ul className="mt-5 grid gap-2.5 md:grid-cols-2">
            {recent.items.map((exam, index) => <Reveal as="li" key={exam.id} delay={Math.min(index, 4) * 0.05}><ExamRow exam={exam} /></Reveal>)}
          </ul>
          {recent.total > recent.items.length && <p className="mt-4"><Link href="/exames/pesquisa" className="text-[15px] font-semibold text-marca no-underline hover:underline">Ver os {recent.total} exames</Link></p>}
        </section>
      )}

      <Reveal as="section" className="mt-12">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">Como funciona</h2>
        <ol className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            { icon: FileText, title: 'Lê o exame', text: 'Abre qualquer exame no site, sem conta, e vê o que costuma sair.' },
            { icon: Download, title: 'Descarrega o PDF', text: 'Com uma conta gratuita guardas o exame para estudar offline.' },
            { icon: Target, title: 'Treina e vê a tua nota', text: 'No Simulador respondes a questões reais e recebes uma nota de 0 a 20.' },
          ].map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-linha bg-white p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-marca-suave text-marca"><step.icon size={20} aria-hidden /></span>
              <h3 className="mt-3 text-[17px] font-semibold"><span className="mr-1.5 text-marca">{index + 1}.</span>{step.title}</h3>
              <p className="mt-1.5 text-[15px] leading-6 text-texto-2">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/sign-up" className="btn btn-primario btn-grande">Criar conta gratuita</Link>
          <Link href="/simulado" className="btn btn-secundario btn-grande">Como funciona o simulado</Link>
        </div>
      </Reveal>

      {others.length > 0 && (
        <Reveal as="section" className="mt-12">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Outros materiais de estudo</h2>
          <p className="mt-1 text-sm text-texto-2">Disponíveis com conta gratuita.</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((item) => <li key={item.slug}><Link href={`/biblioteca/${item.slug}`} className="inline-flex items-center gap-2 rounded-full border border-linha bg-white px-4 py-2 text-sm font-semibold text-texto no-underline hover:border-marca hover:text-marca"><BookOpen size={15} aria-hidden />{item.name} · {item.total}</Link></li>)}
          </ul>
        </Reveal>
      )}

      <Reveal><FaqList items={faq} /></Reveal>
    </PublicShell>
  )
}
