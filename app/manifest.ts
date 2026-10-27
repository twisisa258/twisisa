import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Twisisa',
    short_name: 'Twisisa',
    description: SITE_DESCRIPTION,
    lang: 'pt-MZ',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbfbf9',
    theme_color: '#14704a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
