import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog | Twisisa',
  description: 'Guias de estudo, dicas para exames e novidades úteis para estudantes.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
