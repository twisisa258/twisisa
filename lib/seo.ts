import type { Metadata } from 'next'

export const SITE_NAME = 'Twisisa'
export const SITE_LOCALE = 'pt_MZ'

export const SITE_TITLE =
  'Exames Nacionais e de Admissão em Moçambique | Twisisa'

export const SITE_DESCRIPTION =
  'O Twisisa é a plataforma de aprendizagem para estudantes moçambicanos que querem compreender as matérias, esclarecer dúvidas e preparar-se melhor para os testes e exames. Aprende, pratica e evolui gratuitamente!'

// NEXT_PUBLIC_SITE_URL > domínio oficial
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (explicit) {
    return (
      /^https?:\/\//.test(explicit)
        ? explicit
        : `https://${explicit}`
    ).replace(/\/+$/, '')
  }

  return 'https://twisisa.site'
}

export const SITE_URL = resolveSiteUrl()

export const OG_IMAGE = {
  url: '/og/twisisa-og.png',
  width: 1200,
  height: 630,
  alt: 'Twisisa | Plataforma de estudos e preparação para exames em Moçambique.',
}

type PageSeo = {
  title: string
  description: string
  path: string
  index?: boolean
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: PageSeo): Metadata {
  if (!index) {
    return {
      title,
      description,
      robots: {
        index: false,
        follow: true,
      },
    }
  }

  const canonical = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`

  return {
    title,
    description,

    alternates: {
      canonical,
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },

    openGraph: {
      type: 'website',
      locale: SITE_LOCALE,
      siteName: SITE_NAME,
      url: canonical,
      title,
      description,
      images: [OG_IMAGE],
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE.url],
    },
  }
}
// Dados estruturados do site (Organization + WebSite), injectados no layout raiz.
export const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      areaServed: { '@type': 'Country', name: 'Moçambique' },
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icons/icon-512.png`,
        width: 512,
        height: 512,
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: 'pt-MZ',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
}

// Trilho de navegação (BreadcrumbList) para juntar ao @graph de uma página.
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}
