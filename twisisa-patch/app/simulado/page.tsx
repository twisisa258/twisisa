import Link from 'next/link'
import { Clock, RotateCcw, Target } from 'lucide-react'
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

const MODES = [
  { icon: Target, mode: MODE_META.pratica },
  { icon: Clock, mode: MODE_META.rapido },
  { icon: RotateCcw, mode: MODE_META.revisao },
] as const

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
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Simulado' }]} />

      <section className="rv-hero">
        <h1 className="max-w-[20ch] text-[clamp(2rem,1.4rem+3vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.045em]">Simulado de exame de admissão</h1>
        <p className="mt-4 max-w-[58ch] text-[17px] leading-7 text-texto-2">Treina com questões de exames anteriores, vê a correção a cada resposta e acaba com uma nota de 0 a 20. Sem decorar: o Jonas explica o que erraste.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/sign-up" className="btn btn-primario btn-grande">Começar a treinar</Link>
          <Link href="/exames" className="btn btn-secundario btn-grande">Ler exames anteriores</Link>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="modos">
        <h2 id="modos" className="text-2xl font-semibold tracking-[-0.03em]">Três formas de treinar</h2>
        <ul className="mt-5 grid gap-3 md:grid-cols-3">
          {MODES.map(({ icon: Icon, mode }, index) => (
            <Reveal as="li" key={mode.label} delay={index * 0.08} className="rounded-2xl border border-linha bg-white p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-marca-suave text-marca"><Icon size={20} aria-hidden /></span>
              <h3 className="mt-3 text-[18px] font-semibold">{mode.label}</h3>
              <p className="mt-1.5 text-[15px] leading-6 text-texto-2">{mode.tagline}.</p>
              <p className="mt-3 text-xs font-semibold text-marca">{mode.meta}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      <Reveal as="section" className="mt-12 rounded-2xl border border-linha bg-white p-6">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">Como contam os pontos e a nota</h2>
        <ul className="mt-4 space-y-3 text-[15px] leading-7 text-texto-2">
          <li><strong className="text-texto">Pontos:</strong> cada questão certa vale entre {POINTS_MIN} e {POINTS_MAX} pontos, conforme a dificuldade. Errar vale 0. Uma questão que já viste vale menos, para o treino não virar decoreba. Cada dica que pedes tira 25 % dos pontos dessa questão.</li>
          <li><strong className="text-texto">Nota (0 a 20):</strong> é 20 × (pontos ganhos ÷ pontos possíveis). É a nota que terias se este simulado fosse o exame.</li>
          <li><strong className="text-texto">Ranking:</strong> soma os teus pontos na semana (recomeça à segunda-feira) ou no total, entre estudantes do mesmo percurso.</li>
        </ul>
      </Reveal>

      {institutions.length > 0 && (
        <Reveal as="section" className="mt-12">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Prepara a tua universidade</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {institutions.map((item) => <li key={item.id}><Link href={`/exames/${item.slug}`} className="ex-card inline-flex rounded-full border border-linha bg-white px-4 py-2 text-sm font-semibold text-texto no-underline">Exames {item.shortName}</Link></li>)}
          </ul>
        </Reveal>
      )}

      <Reveal><FaqList items={faq} /></Reveal>
    </PublicShell>
  )
}
