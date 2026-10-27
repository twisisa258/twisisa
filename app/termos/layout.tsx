import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Termos de utilização | Twisisa',
  description: 'Condições de utilização da plataforma Twisisa: conta, comunidade, materiais de estudo, planos e pagamentos.',
  path: '/termos',
  index: true,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
