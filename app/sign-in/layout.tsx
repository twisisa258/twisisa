import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Entrar | Twisisa',
  description: 'Entra na tua conta Twisisa para continuar a estudar.',
  path: '/sign-in',
  index: false,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
