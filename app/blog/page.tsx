import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { EditorialFeed } from '@/components/editorial-feed'
import { PublicBlog } from '@/components/public-blog'

export default async function BlogPage() {
  // Visitantes vêem a lista pública (indexável); quem tem sessão continua com a vista de estudante.
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  if (!session?.user) return <PublicBlog />

  const firstName = session.user.name.split(' ')[0]
  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Conteúdos para avançar" title="Blog e novidades." description="Guias de estudo, dicas para exames e novidades úteis para estudantes moçambicanos.">
      <EditorialFeed />
    </StudentFeatureShell>
  )
}
