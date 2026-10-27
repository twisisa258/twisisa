import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, RotateCcw, Target, Timer } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getHistory } from '@/lib/simulator'
import { MODE_META, formatGrade, percent, type AttemptMode } from '@/lib/simulator-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Histórico | Simulador | Twisisa' }

const ICONS: Record<AttemptMode, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = { pratica: Target, rapido: Timer, revisao: RotateCcw }
const formatDate = (iso: string) => new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maputo' }).format(new Date(iso))

export default async function HistoricoPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const history = await getHistory(session.user.id).catch((error) => {
    console.error('[HISTORICO]', error)
    return null
  })
  const totals = history?.entries.reduce((acc, e) => ({ correct: acc.correct + e.correct, total: acc.total + e.total }), { correct: 0, total: 0 })

  return (
    <StudentFeatureShell firstName={session.user.name.split(' ')[0]} eyebrow="Simulador" title="Histórico" hideBackLink>
      <div className="max-w-2xl space-y-5">
        <Link href="/aluno/simulador" className="inline-flex items-center gap-2 text-xs font-semibold text-[#68716a] hover:text-[#1d4d41]"><ArrowLeft size={14} aria-hidden />Voltar ao Simulador</Link>

        {!history ? (
          <div role="alert" className="rounded-2xl bg-gradient-to-br from-white to-[#f3f6f0] shadow-[0_1px_2px_rgba(20,50,40,0.05)] px-5 py-10 text-center">
            <h2 className="text-base font-semibold">Não foi possível carregar o histórico</h2>
            <Link href="/aluno/simulador/historico" className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#1d4d41] px-5 text-sm font-semibold text-white">Tentar de novo</Link>
          </div>
        ) : history.entries.length === 0 && history.open.length === 0 ? (
          <EmptyState title="Ainda não tens sessões" description="Faz a tua primeira prática e os resultados ficam aqui, só para ti." actionLabel="Começar a treinar" actionHref="/aluno/simulador" />
        ) : (
          <>
            {totals && totals.total > 0 && (
              <p className="rounded-2xl bg-gradient-to-br from-white to-[#f3f6f0] shadow-[0_1px_2px_rgba(20,50,40,0.05)] px-4 py-3 text-sm text-[#68736a]">
                <span className="font-semibold text-[#202321]">{history.entries.length} {history.entries.length === 1 ? 'sessão' : 'sessões'}</span> · {percent(totals.correct, totals.total)}% de acertos no total
              </p>
            )}
            <ul className="space-y-2.5">
              {history.open.map((item) => (
                <li key={item.id}>
                  <Link href={`/aluno/simulador/sessao/${item.id}`} className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-[#235a4b] to-[#1d4d41] px-4 py-3.5 text-white">
                    <span className="min-w-0 flex-1 text-sm font-semibold">Continuar {MODE_META[item.mode].label}</span>
                    <span className="text-xs text-white/70">Em curso</span>
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                </li>
              ))}
              {history.entries.map((entry) => {
                const Icon = ICONS[entry.mode]
                const pct = percent(entry.correct, entry.total)
                return (
                  <li key={entry.id}>
                    <Link href={`/aluno/simulador/sessao/${entry.id}`} className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-white to-[#f3f6f0] shadow-[0_1px_2px_rgba(20,50,40,0.05)] px-4 py-3.5 transition-transform hover:-translate-y-0.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#1d4d41]/[0.08] text-[#1d4d41]"><Icon size={20} aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{MODE_META[entry.mode].label}{entry.subject ? ` · ${entry.subject}` : ''}</span>
                        <span className="block text-xs text-[#7d857e]">{formatDate(entry.finishedAt)}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={`block text-sm font-semibold ${pct >= 60 ? 'text-[#1f6b45]' : pct >= 40 ? 'text-[#805f19]' : 'text-[#9a3030]'}`}>{entry.correct}/{entry.total}</span>
                        <span className="block text-[11px] text-[#7d857e]">{entry.grade === null ? '–' : formatGrade(entry.grade)}/20 · {pct}%</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </StudentFeatureShell>
  )
}
