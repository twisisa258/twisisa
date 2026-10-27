import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Planos | Twisisa',
  description: 'Conhece o Twisisa Plus: simulados premium, materiais avançados e histórico de progresso.',
  path: '/planos',
  index: false,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
