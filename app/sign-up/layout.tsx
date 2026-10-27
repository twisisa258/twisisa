import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Criar conta | Twisisa',
  description: 'Cria a tua conta Twisisa e começa a preparar os teus exames.',
  path: '/sign-up',
  index: false,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
