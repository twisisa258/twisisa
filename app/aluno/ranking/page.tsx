import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { isTrack, trackLabel } from '@/lib/percurso'
import { getRanking, parsePeriod, type RankingData, type RankingPeriod } from '@/lib/ranking'
import { formatPoints } from '@/lib/simulator-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { Avatar } from '@/components/aluno/avatar'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'

export const metadata = { title: 'Ranking | Twisisa', description: 'Os pontos do Simulador, entre estudantes do teu percurso.' }
export const dynamic = 'force-dynamic'

const TOP = 20

function Row({ row }: { row: RankingData['rows'][number] }) {
  const podium = row.position <= 3
  return (
    <li className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${row.isMe ? 'bg-[#eef3ee]' : ''}`} aria-current={row.isMe ? 'true' : undefined}>
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${podium ? 'bg-[#1d4d41] text-white' : 'bg-[#f1f2ec] text-[#68716a]'}`}>{row.position}</span>
      <Avatar name={row.name} image={row.image} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#202321]">{row.name}{row.isMe && <span className="ml-1.5 text-xs font-medium text-[#1d4d41]">(tu)</span>}</span>
        {row.nickname && <span className="block truncate text-xs text-[#737c75]">@{row.nickname}</span>}
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-bold text-[#1d4d41]">{formatPoints(row.points)} pts</span>
        <span className="block text-xs text-[#737c75]">{row.correct} {row.correct === 1 ? 'certa' : 'certas'}</span>
      </span>
    </li>
  )
}

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const period: RankingPeriod = parsePeriod((await searchParams).p)

  const [profile] = await db
    .select({ track: studentProfiles.track, showInRanking: studentProfiles.showInRanking })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id))
    .limit(1)
  const track = isTrack(profile?.track) ? profile.track : null
  const hidden = profile ? !profile.showInRanking : false

  let data: RankingData | null = null
  if (track) {
    try {
      data = await getRanking({ userId: session.user.id, track, period, limit: TOP })
    } catch (error) {
      console.error('[RANKING]', error)
    }
  }

  const pill = (value: RankingPeriod, label: string) => (
    <Link
      href={value === 'semana' ? '/aluno/ranking' : '/aluno/ranking?p=geral'}
      aria-current={period === value ? 'page' : undefined}
      className={`flex h-9 flex-1 items-center justify-center rounded-full text-sm font-semibold transition-colors ${period === value ? 'bg-white text-[#1d4d41] shadow-sm' : 'text-[#68716a] hover:text-[#1d4d41]'}`}
    >
      {label}
    </Link>
  )

  const me = data?.me ?? null
  const outside = me && me.position > TOP

  return (
    <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="Ranking" title="Ranking" hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[#68716a]">{track ? `Estudantes de ${trackLabel(track)}` : 'Sem percurso'}</p>
          <nav aria-label="Período" className="flex w-52 gap-1 rounded-full bg-[#e8ebe3] p-1">{pill('semana', 'Esta semana')}{pill('geral', 'Geral')}</nav>
        </div>

        {!track ? (
          <EmptyState title="Escolhe o teu percurso" description="O ranking compara estudantes do mesmo percurso." actionLabel="Escolher percurso" actionHref="/aluno/percurso" icon={Trophy} />
        ) : !data ? (
          <ErrorState title="Não foi possível carregar o ranking" description="Tenta outra vez daqui a pouco." />
        ) : (
          <>
            {hidden ? (
              <div className="rounded-2xl border border-[#e3e6dc] bg-white p-4 text-sm text-[#68716a] sm:p-5">
                Estás fora do ranking. <Link href="/aluno/perfil" className="font-semibold text-[#1d4d41] hover:underline">Voltar a aparecer no perfil</Link>
              </div>
            ) : me ? (
              <div className="rounded-2xl bg-gradient-to-br from-[#2a6a57] to-[#1d4d41] p-5 text-white shadow-[0_10px_26px_-14px_rgba(29,77,65,0.7)]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">A tua posição</p>
                <p className="mt-1 flex items-baseline gap-3"><span className="text-4xl font-semibold tracking-[-0.04em]">#{me.position}</span><span className="text-base font-semibold">{formatPoints(me.points)} pts</span></p>
                <p className="mt-1 text-sm text-white/80">{me.missing === null ? 'Estás no topo.' : `Faltam ${formatPoints(me.missing)} pts para subires.`}</p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e3e6dc] bg-white p-4 sm:p-5">
                <p className="text-sm text-[#68716a]">{period === 'semana' ? 'Ainda não pontuaste esta semana.' : 'Ainda não pontuaste.'}</p>
                <Link href="/aluno/simulador" className="inline-flex h-10 shrink-0 items-center rounded-xl bg-[#1d4d41] px-4 text-sm font-semibold text-white hover:bg-[#173f35]">Praticar</Link>
              </div>
            )}

            {data.rows.length === 0 ? (
              <EmptyState title="Ainda sem pontuações" description={period === 'semana' ? 'Ninguém pontuou esta semana. Sê a primeira pessoa.' : 'Resolve questões no Simulador para entrares no ranking.'} actionLabel="Ir ao Simulador" actionHref="/aluno/simulador" icon={Trophy} />
            ) : (
              <ol className="divide-y divide-[#eceee7] overflow-hidden rounded-2xl border border-[#e3e6dc] bg-white">
                {data.rows.map((row) => <Row key={row.userId} row={row} />)}
                {outside && me && (
                  <>
                    <li aria-hidden="true" className="py-1 text-center text-xs text-[#9aa29c]">···</li>
                    <Row row={me} />
                  </>
                )}
              </ol>
            )}

            <p className="flex items-start gap-2 text-xs leading-5 text-[#737c75]"><Trophy size={14} className="mt-0.5 shrink-0 text-[#1d4d41]" aria-hidden="true" />Os pontos vêm das questões que acertas no Simulador. Questões repetidas valem menos. Só aparece o teu nome abreviado e o @nickname.</p>
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
