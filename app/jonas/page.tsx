import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import dynamic from 'next/dynamic'
const JonasChat = dynamic(() => import('@/components/jonas-chat').then((m) => m.JonasChat), { loading: () => <div className="h-64 animate-pulse rounded-2xl bg-[#eef0e9]" aria-label="A carregar conversa" /> })

export default async function JonasPage() { const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) redirect('/sign-in'); const firstName = session.user.name.split(' ')[0]; return <StudentFeatureShell firstName={firstName} eyebrow="Explicador académico" title="Pergunta ao Jonas." description="Explicações passo a passo para compreender conceitos, resolver exercícios e organizar o teu estudo."><JonasChat /></StudentFeatureShell> }
