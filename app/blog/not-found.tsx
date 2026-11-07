import type { Metadata } from 'next'
import { BlogShell } from '@/components/blog/blog-shell'
import { EmptyState } from '@/components/states/empty-state'

export const metadata: Metadata = { title: 'Artigo não encontrado | Twisisa', robots: { index: false, follow: true } }

export default function BlogNotFound() {
  return (
    <BlogShell>
      <main id="conteudo" className="mx-auto w-full max-w-[680px] px-5 py-10">
        <EmptyState title="Este artigo não existe" description="Pode ter sido retirado ou o endereço estar errado. Vê os artigos disponíveis." actionLabel="Ir para o blog" actionHref="/blog" />
      </main>
    </BlogShell>
  )
}
