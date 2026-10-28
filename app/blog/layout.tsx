import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Blog | Twisisa',
  description: 'Guias de estudo, dicas para exames e novidades úteis para estudantes moçambicanos.',
  path: '/blog',
  index: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
