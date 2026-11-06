import Link from 'next/link'
import { JsonLd } from '@/components/json-ld'
import { Crumbs, PublicShell } from '@/components/exames/public-shell'
import { listPublicInstitutions } from '@/lib/exames'
import { SITE_URL, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'

export const revalidate = 3600

export const metadata = pageMetadata({
  title: 'Exames de admissão em Moçambique: temas, exames anteriores e prática | Twisisa',
  description: 'Exames de admissão das universidades moçambicanas (UEM, UP e outras): os temas principais de cada disciplina, exames anteriores para ler e prática com questões reais.',
  path: '/exames',
})

export default async function ExamesPage() {
  const institutions = await listPublicInstitutions().catch(() => [])
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${SITE_URL}/exames#page`, url: `${SITE_URL}/exames`, name: 'Exames de admissão em Moçambique', inLanguage: 'pt-MZ', mainEntity: { '@type': 'ItemList', itemListElement: institutions.map((item, index) => ({ '@type': 'ListItem', position: index + 1, url: `${SITE_URL}/exames/${item.slug}`, name: `Exames de admissão ${item.shortName}` })) } },
      breadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Exames de admissão', path: '/exames' }]),
    ],
  }
  return (
    <PublicShell>
      <JsonLd data={jsonLd} />
      <Crumbs items={[{ name: 'Início', href: '/' }, { name: 'Exames de admissão' }]} />
      <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Exames de admissão em Moçambique</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-texto-2">Escolhe a universidade e a disciplina. Vais encontrar os temas principais a estudar, exames de anos anteriores para ler e a prática com questões reais.</p>
      {institutions.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-[#d5dacd] bg-white p-5 text-sm text-texto-2">Estamos a preparar este conteúdo. Volta em breve.</p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {institutions.map((item) => (
            <li key={item.id}>
              <Link href={`/exames/${item.slug}`} className="block rounded-2xl border border-linha bg-white p-5 text-texto no-underline transition-colors hover:border-marca">
                <span className="block text-lg font-semibold">{item.shortName}</span>
                <span className="mt-0.5 block text-sm text-texto-2">{item.name}</span>
                <span className="mt-3 block text-xs text-texto-2">{item.exams} {item.exams === 1 ? 'exame' : 'exames'} · {item.courses} {item.courses === 1 ? 'curso' : 'cursos'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  )
}
