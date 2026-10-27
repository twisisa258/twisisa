import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import dynamic from 'next/dynamic'
const CommunityFeed = dynamic(() => import('@/components/community-feed').then((m) => m.CommunityFeed), { loading: () => <div className="h-36 animate-pulse rounded-2xl bg-[#eef0e9]" aria-label="A carregar publicações" /> })
const SocialNetwork = dynamic(() => import('@/components/social-network').then((m) => m.SocialNetwork), { loading: () => <div className="h-36 animate-pulse rounded-2xl bg-[#eef0e9]" aria-label="A carregar estudantes" /> })

export default async function ComunidadePage() { const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) redirect('/sign-in'); const firstName = session.user.name.split(' ')[0]; return <StudentFeatureShell firstName={firstName} eyebrow="Aprender em conjunto" title="Comunidade académica." ><div className="space-y-6"><CommunityFeed /><section><h2 className="mb-1 text-lg font-semibold tracking-[-0.03em]">Estudantes para acompanhar</h2><SocialNetwork /></section></div></StudentFeatureShell> }
