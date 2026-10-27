import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Área do aluno | Twisisa',
  description: 'Painel pessoal do estudante no Twisisa.',
  path: '/aluno',
  index: false,
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
