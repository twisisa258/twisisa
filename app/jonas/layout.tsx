import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Jonas, explicador académico | Twisisa',
  description: 'Explicações passo a passo para compreender conceitos e resolver exercícios.',
  path: '/jonas',
  index: false,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
