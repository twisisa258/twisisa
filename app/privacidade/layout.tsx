import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Política de privacidade | Twisisa',
  description: 'Como o Twisisa recolhe, usa e protege os teus dados pessoais e quais são os teus direitos.',
  path: '/privacidade',
  index: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
