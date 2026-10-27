import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Comunidade académica | Twisisa',
  description: 'Aprende em conjunto com outros estudantes do Twisisa.',
  path: '/comunidade',
  index: false,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
