import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Bookmark, Search } from 'lucide-react'
import { auth } from '@/lib/auth'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { FeatureCard } from '@/components/feature-card'

export default async function FavoritosPage() { const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) redirect('/sign-in'); const firstName = session.user.name.split(' ')[0]; return <StudentFeatureShell firstName={firstName} eyebrow="A minha biblioteca" title="Materiais guardados." description="Guarda apontamentos, fichas e exames para voltares a eles quando precisares."><div className="grid gap-4 sm:grid-cols-2"><FeatureCard icon={Bookmark} title="Ainda não tens favoritos" text="Explora a biblioteca e guarda os materiais mais úteis para o teu estudo." href="/biblioteca" /><FeatureCard icon={Search} title="Explorar materiais" text="Pesquisa por disciplina, instituição ou tipo de recurso." href="/biblioteca" /></div></StudentFeatureShell> }
