import Link from 'next/link'
import { Clock, Info, Trophy } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { isTrack, trackLabel } from '@/lib/percurso'
import { getRanking, parsePeriod, type RankingData, type RankingPeriod } from '@/lib/ranking'
import { reinicioDaSemana } from '@/lib/ranking-tempo'
import { formatPoints } from '@/lib/simulator-shared'
import { cn } from '@/lib/utils'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { Avatar } from '@/components/aluno/avatar'
import { Podio } from '@/components/ranking/podio'
import { RegrasRanking } from '@/components/ranking/regras-ranking'
import { Segmentado } from '@/components/ui/segmentado'
import { EmptyState } from '@/components/states/empty-state'
import { ErrorState } from '@/components/states/error-state'
import { requireStudent } from '@/lib/require-student'

export const metadata = { title: 'Ranking | Twisisa', description: 'Os pontos do Simulador, entre estudantes do teu percurso.' }
export const dynamic = 'force-dynamic'

const TOP = 50

// Linha da lista (a partir do 4.º lugar). A barra fina compara os pontos com os do 1.º: dá para ver a distância sem ler números.
function Row({ row, lider }: { row: RankingData['rows'][number]; lider: number }) {
  const parte = lider > 0 ? Math.max(4, Math.round((row.points / lider) * 100)) : 0
  return (
    <li className={cn('flex items-center gap-3 px-4 py-3', row.isMe && 'bg-marca-suave')} aria-current={row.isMe ? 'true' : undefined}>
      <span className="num w-7 shrink-0 text-center text-[15px] font-semibold text-texto-2">{row.position}</span>
      <Avatar name={row.name} image={row.image} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold leading-5 text-texto">
          {row.name}
          {row.isMe && <span className="ml-1.5 text-[12px] font-medium text-marca">(tu)</span>}
        </span>
        <span className="block truncate text-[12px] leading-4 text-texto-2">{row.nickname ? `@${row.nickname}` : `${row.correct} ${row.correct === 1 ? 'certa' : 'certas'}`}</span>
        <span aria-hidden="true" className="mt-1.5 block h-1 overflow-hidden rounded-full bg-linha">
          <span className={cn('block h-full rounded-full', row.isMe ? 'bg-marca' : 'bg-[#b7c9bd]')} style={{ width: `${parte}%` }} />
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="num block text-[15px] font-semibold leading-5 text-texto">{formatPoints(row.points)}</span>
        <span className="block text-[11px] leading-4 text-texto-2">pontos</span>
      </span>
    </li>
  )
}

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const session = await requireStudent('/aluno/ranking')
  const pedido = (await searchParams).p
  const explicito = pedido === 'semana' || pedido === 'geral'
  let period: RankingPeriod = parsePeriod(pedido)

  const [profile] = await db
    .select({ track: studentProfiles.track, showInRanking: studentProfiles.showInRanking })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id))
    .limit(1)
  const track = isTrack(profile?.track) ? profile.track : null
  const hidden = profile ? !profile.showInRanking : false

  let data: RankingData | null = null
  let semanaVazia = false
  if (track) {
    try {
      data = await getRanking({ userId: session.user.id, track, period, limit: TOP })
      // Semana sem pontuações e o aluno não escolheu: mostra o Geral, para a página nunca abrir vazia.
      if (period === 'semana' && !explicito && data.rows.length === 0) {
        const geral = await getRanking({ userId: session.user.id, track, period: 'geral', limit: TOP })
        if (geral.rows.length > 0) {
          data = geral
          period = 'geral'
          semanaVazia = true
        }
      }
    } catch (error) {
      console.error('[RANKING]', error)
    }
  }

  const me = data?.me ?? null
  const rows = data?.rows ?? []
  const fora = me && me.position > TOP
  const lider = rows[0]?.points ?? 0
  const reinicio = reinicioDaSemana(Date.now())

  return (
    <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="Ranking" title="Ranking" hideTitle hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <header className="tom-conquista flex items-center gap-3.5">
          <span className="ic-tom ic-tom-lg"><Trophy size={24} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">Ranking</h1>
            <p className="truncate text-[14px] leading-5 text-texto-2">{track ? `Estudantes de ${trackLabel(track)}` : 'Sem percurso'}</p>
          </div>
          <RegrasRanking />
        </header>

        {track && (
          <div className="flex flex-col gap-2">
            <Segmentado
              label="Período"
              items={[
                { href: '/aluno/ranking?p=semana', label: 'Semana', active: period === 'semana' },
                { href: '/aluno/ranking?p=geral', label: 'Geral', active: period === 'geral' },
              ]}
            />
            {period === 'semana' && (
              <p className="tom-conquista flex items-center gap-1.5 px-1 text-[12px] font-medium text-[color:var(--tom-texto)]"><Clock size={13} aria-hidden="true" />{reinicio.texto}</p>
            )}
          </div>
        )}

        {!track ? (
          <EmptyState tone="conquista" icon={Trophy} title="Escolhe o teu percurso" description="O ranking compara estudantes do mesmo percurso." actionLabel="Escolher percurso" actionHref="/aluno/percurso" />
        ) : !data ? (
          <ErrorState title="Não foi possível carregar o ranking" description="Tenta outra vez daqui a pouco." />
        ) : (
          <>
            {semanaVazia && (
              <p className="sf-tom tom-conquista flex items-start gap-2.5 px-3.5 py-3 text-[13px] leading-5 text-[color:var(--tom-texto)]">
                <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                Ainda ninguém pontuou esta semana. Estás a ver o ranking geral.
              </p>
            )}

            {hidden ? (
              <p className="sf px-4 py-3.5 text-[14px] leading-6 text-texto-2">
                Estás fora do ranking. <Link href="/aluno/perfil" className="font-semibold text-marca underline-offset-2 hover:underline">Voltar a aparecer no perfil</Link>
              </p>
            ) : me ? (
              <section aria-label="A tua posição" className="sf-noite p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-white/75">A tua posição</p>
                    <p className="num mt-1 text-[44px] font-semibold leading-none tracking-[-0.05em]">#{me.position}</p>
                  </div>
                  <p className="num text-right text-[17px] font-semibold leading-6">
                    {formatPoints(me.points)} pts
                    <span className="block text-[12px] font-normal text-white/70">{me.correct} {me.correct === 1 ? 'certa' : 'certas'}</span>
                  </p>
                </div>
                <p className="mt-4 rounded-xl bg-white/10 px-3 py-2.5 text-[13px] leading-5 text-white/90">
                  {me.missing === null ? 'Estás no topo.' : `Faltam ${formatPoints(me.missing)} pts para subires.`}
                </p>
              </section>
            ) : rows.length > 0 ? (
              <div className="sf flex items-center justify-between gap-3 p-4">
                <p className="text-[14px] leading-5 text-texto-2">{period === 'semana' ? 'Ainda não pontuaste esta semana.' : 'Ainda não pontuaste.'}</p>
                <Link href="/aluno/simulador" className="btn btn-aura shrink-0 whitespace-nowrap px-5">Praticar</Link>
              </div>
            ) : null}

            {rows.length === 0 ? (
              <EmptyState
                tone="conquista"
                icon={Trophy}
                title="Ainda sem pontuações"
                description={period === 'semana' ? 'Ninguém pontuou esta semana. Sê a primeira pessoa.' : 'Resolve questões no Simulador para entrares no ranking.'}
                actionLabel="Ir ao Simulador"
                actionHref="/aluno/simulador"
              />
            ) : (
              <>
                <Podio rows={rows.slice(0, 3)} />
                {(rows.length > 3 || Boolean(fora)) && (
                  <ol className="sf divide-y divide-linha overflow-hidden">
                    {rows.slice(3).map((row) => <Row key={row.userId} row={row} lider={lider} />)}
                    {fora && me && (
                      <>
                        <li aria-hidden="true" className="py-1 text-center text-xs text-texto-2">···</li>
                        <Row row={me} lider={lider} />
                      </>
                    )}
                  </ol>
                )}
              </>
            )}

            {fora && me && (
              <div className="sticky bottom-[max(12px,env(safe-area-inset-bottom))] z-20">
                <p className="sf-noite sf-flutua flex items-center justify-between gap-3 px-4 py-3 text-[14px] font-semibold">
                  <span className="num">#{me.position} · {formatPoints(me.points)} pts</span>
                  <span className="text-[13px] font-medium text-white/80">{me.missing === null ? 'No topo' : `faltam ${formatPoints(me.missing)} pts`}</span>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
