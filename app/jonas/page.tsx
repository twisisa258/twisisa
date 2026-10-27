import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getConversation, getStudyContext, listConversations, listStudySubjects, type ConversationSummary } from '@/lib/jonas'
import { JonasChat } from '@/components/jonas-chat'

export const dynamic = 'force-dynamic'

// O Jonas ocupa o ecrã todo (sem menu do estudante) para nada distrair a conversa: histórico à esquerda, chat ao centro.
export default async function JonasPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const { c } = await searchParams
  const userId = session.user.id
  const firstName = session.user.name.split(' ')[0]

  let conversations: ConversationSummary[] = []
  let subjects: { id: string; name: string }[] = []
  let trackLabel: string | null = null
  let initial: Awaited<ReturnType<typeof getConversation>> = null
  let loadFailed = false
  try {
    const [list, studySubjects, context] = await Promise.all([listConversations(userId), listStudySubjects(userId), getStudyContext(userId, null, null)])
    conversations = list
    subjects = studySubjects
    trackLabel = context.trackLabel
    if (c && c.length <= 100) initial = await getConversation(userId, c)
  } catch (error) {
    loadFailed = true
    console.error('[JONAS] página', error)
  }

  return <JonasChat key={initial?.summary.id ?? 'nova'} firstName={firstName} trackLabel={trackLabel} subjects={subjects} initialConversations={conversations} loadFailed={loadFailed} initialConversation={initial} />
}
