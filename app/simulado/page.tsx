import Link from 'next/link'
import { BookOpen, Target } from 'lucide-react'
import { FaqList } from '@/components/exames/faq'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { Reveal } from '@/components/ui/reveal'
import { faqJsonLd, faqSimulado } from '@/lib/exames-pure'
import { listPublicInstitutions } from '@/lib/exames'
import { MODE_META, POINTS_MAX, POINTS_MIN } from '@/lib/simulator-shared'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

export const metadata = pageMetadata({
  title: 'Simulado de exame de admissão online: pratica e vê a tua nota | Twisisa',
  description: 'Testa-te para o exame de admissão com questões de exames anteriores: prática com correção, modo rápido a contar o tempo e revisão dos erros. Nota de 0 a 20.',
  path: '/simulado',
})

const MODES = [{ mode: MODE_META.pratica }, { mode: MODE_META.rapido }, { mode: MODE_META.revisao }] as const

export default async function SimuladoPage() {
  const institutions = await listPublicInstitutions().catch(() => [])
  const faq = faqSimulado()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${SITE_URL}/simulado#pagina`, url: `${SITE_URL}/simulado`, name: 'Simulado de exame de admissão online', inLanguage: 'pt-MZ', isPartOf: { '@id': `${SITE_URL}/#website` } },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Simulado', path: '/simulado' }]),
      faqJsonLd(faq),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Simulador' }]} />

      <section className="tw5-top">
        <h1 className="tw5-h1">Treina como no <em>exame.</em></h1>
        <p className="tw5-sub">Questões reais, correção na hora, nota de 0 a 20.</p>
        <div className="tw5-actions">
          <Link href="/aluno/simulador" className="tw-btn lg"><Target size={18} aria-hidden /> Começar a treinar</Link>
          <Link href="/exames" className="tw-btn lg ol"><BookOpen size={18} aria-hidden /> Ver exames</Link>
        </div>
      </section>

      <section className="tw5-sec" aria-labelledby="modos">
        <h2 id="modos" className="tw5-h2">Três formas de treinar</h2>
        <div className="tw4-modes" style={{ padding: 0 }}>
          <ul style={{ marginTop: 0 }}>
            {MODES.map(({ mode }, index) => (
              <Reveal as="li" key={mode.label} delay={index * 0.07}>
                <b>{mode.label}</b><span>{mode.tagline}</span><em>{mode.meta}</em>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="tw5-sec" aria-labelledby="pontos">
        <h2 id="pontos" className="tw5-h2">Pontos e nota</h2>
        <ul className="tw5-rows">
          <li className="tw5-row"><b>Cada questão certa</b><em>{POINTS_MIN} a {POINTS_MAX} pontos</em></li>
          <li className="tw5-row"><b>Dica pedida</b><em>−25 % dos pontos</em></li>
          <li className="tw5-row"><b>Nota</b><em>20 × ganhos ÷ possíveis</em></li>
        </ul>
      </section>

      {institutions.length > 0 && (
        <section className="tw5-sec">
          <h2 className="tw5-h2">Escolhe a universidade</h2>
          <ul className="tw5-chips">
            {institutions.map((item) => <li key={item.id}><Link href={`/exames/${item.slug}`}>{item.shortName}</Link></li>)}
          </ul>
        </section>
      )}

      <FaqList items={faq} />
    </PublicShell>
  )
}
