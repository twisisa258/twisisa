import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Recuperar conta | Twisisa',
    description: 'Recupera o acesso à tua conta Twisisa.',
    path: '/esqueci-a-senha',
    index: false,
  }),
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
