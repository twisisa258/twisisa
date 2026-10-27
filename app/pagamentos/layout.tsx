import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Pagamentos | Twisisa',
  description: 'Estado dos pagamentos do Twisisa.',
  path: '/pagamentos',
  index: false,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
