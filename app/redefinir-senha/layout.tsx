import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Nova palavra-passe | Twisisa',
    description: 'Escolhe uma nova palavra-passe para a tua conta Twisisa.',
    path: '/redefinir-senha',
    index: false,
  }),
  // O endereço leva o código de uso único: não o partilhar com outros sites.
  referrer: 'no-referrer',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
