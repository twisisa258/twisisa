import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { EditorialFeed } from '@/components/editorial-feed'

export default async function BlogPage() { const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) redirect('/sign-in'); const firstName = session.user.name.split(' ')[0]; return <StudentFeatureShell firstName={firstName} eyebrow="Conteúdos para avançar" title="Blog e novidades." description="Guias de estudo, dicas para exames e novidades úteis para estudantes moçambicanos."><EditorialFeed /></StudentFeatureShell> }
