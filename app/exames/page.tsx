import Link from 'next/link'
import { Search, Target } from 'lucide-react'
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

      <section className="tw5-top">
        <h1 className="tw5-h1">Exames de <em>admissão.</em></h1>
        <form role="search" action="/exames/pesquisa" method="get" className="tw5-search">
          <div>
            <label htmlFor="exames-q" className="sr-only">Pesquisar exames</label>
            <input id="exames-q" name="q" type="search" maxLength={80} autoComplete="off" placeholder="Ex.: Matemática UEM 2023" />
          </div>
          <button type="submit" className="tw-btn"><Search size={18} aria-hidden /> Pesquisar</button>
        </form>
      </section>

      <section className="tw5-sec" aria-labelledby="universidades">
        <h2 id="universidades" className="tw5-h2">Universidades</h2>
        {institutions.length === 0 ? (
          <p className="tw5-vazio">Ainda sem exames publicados.</p>
        ) : (
          <ul className="tw5-tiles">
            {institutions.map((item, index) => (
              <Reveal as="li" key={item.id} delay={Math.min(index, 5) * 0.06}>
                <Link href={`/exames/${item.slug}`} className="tw5-tile">
                  <b>{item.shortName}</b>
                  <small>{item.name}</small>
                  <span>{item.exams} {item.exams === 1 ? 'exame' : 'exames'} →</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        )}
      </section>

      {recent.items.length > 0 && (
        <section className="tw5-sec" aria-labelledby="recentes">
          <h2 id="recentes" className="tw5-h2">Mais recentes</h2>
          <ul className="tw5-rows">
            {recent.items.map((exam) => <li key={exam.id}><ExamRow exam={exam} /></li>)}
          </ul>
          {recent.total > recent.items.length && <div className="tw5-actions"><Link href="/exames/pesquisa" className="tw-btn ol">Ver os {recent.total} exames</Link></div>}
        </section>
      )}

      {others.length > 0 && (
        <section className="tw5-sec" aria-labelledby="outros">
          <h2 id="outros" className="tw5-h2">Outros materiais</h2>
          <ul className="tw5-chips">
            {others.map((item) => <li key={item.slug}><Link href={`/biblioteca/${item.slug}`}>{item.name} · {item.total}</Link></li>)}
          </ul>
        </section>
      )}

      <div className="tw5-band">
        <h2>Treina o que leste.</h2>
        <div className="tw-cta"><Link href="/simulado" className="tw-btn lg wh"><Target size={18} aria-hidden /> Ver o simulador</Link></div>
      </div>

      <FaqList items={faq} />
    </PublicShell>
  )
}
