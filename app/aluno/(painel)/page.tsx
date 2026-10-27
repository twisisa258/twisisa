import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin'
import { getStaffRole } from '@/lib/staff'
import { getGreeting } from '@/lib/greeting'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { getAlunoOverview, type MaterialItem, type Part } from '@/lib/aluno-overview'
import { isTrack, trackLabel, type Track } from '@/lib/percurso'
import { relativeTime } from '@/lib/relative-time'
import { cn } from '@/lib/utils'
import { StudentSidebar } from '@/components/student-sidebar'
import { UrlFeedback } from '@/components/url-feedback'
import { AlunoMenuButton } from '@/components/aluno/aluno-menu-button'
import { Ic } from '@/components/aluno/icons'

export const dynamic = 'force-dynamic'

const DASH = '—'
const fileHref = (id: string) => `/api/biblioteca/${encodeURIComponent(id)}/ficheiro`
const days = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)

// Sem bordas pesadas: a separação vem de uma sombra suave e de degradês na mesma família verde da plataforma.
const soft = 'shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)]'

function ListEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-[16px] py-[14px]">
      <p className="text-[14px] font-medium text-[#202321]">{title}</p>
      <p className="mt-[2px] text-[12px] text-[#6b756e]">{text}</p>
    </div>
  )
}

function MaterialCard({ tone, items, emptyTitle, emptyText }: { tone: 'white' | 'sand'; items: Part<MaterialItem[]>; emptyTitle: string; emptyText: string }) {
  const sand = tone === 'sand'
  return (
    <div className={cn('overflow-hidden rounded-[18px]', soft, sand ? 'bg-gradient-to-br from-[#fbf8ee] to-[#f2ecd9]' : 'bg-gradient-to-br from-white to-[#f6f8f3]')}>
      {!items.ok ? (
        <ListEmpty title="Não foi possível carregar" text="Tenta outra vez mais tarde." />
      ) : items.value.length === 0 ? (
        <ListEmpty title={emptyTitle} text={emptyText} />
      ) : (
        items.value.map((item, index) => (
          <a
            key={item.id}
            href={fileHref(item.id)}
            target="_blank"
            rel="noopener"
            className={cn(
              'flex h-[48px] items-center gap-[12px] px-[16px] text-[14px] font-medium text-inherit no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1d4d41]',
              index > 0 && 'border-t border-black/[0.05]',
            )}
          >
            <Ic name="file" size={16} className="text-[#6b756e]" />
            <p className="min-w-0 truncate">{item.title}</p>
            <small className="ml-auto flex-none whitespace-nowrap text-[12px] font-normal text-[#6b756e]">{relativeTime(item.at)}</small>
          </a>
        ))
      )}
    </div>
  )
}

const rowBase = 'flex h-[64px] items-center gap-[12px] rounded-[16px] px-[16px] text-[16px] font-semibold no-underline'
const iconBox = 'flex size-[40px] flex-none items-center justify-center rounded-[12px]'
const sectionLabel = 'text-[11px] uppercase tracking-[0.12em] text-[#202321] [font-family:inherit]'

export default async function StudentPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const [profile] = await db
    .select({ track: studentProfiles.track, institutionId: studentProfiles.institutionId })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id))
    .limit(1)

  const firstName = session.user.name.split(' ')[0]
  const isAdmin = isAdminEmail(session.user.email)
  // Entrada na administração para quem tem papel na equipa (admin ou revisor). Se a consulta falhar, a página continua sem o botão.
  const staffRole = isAdmin ? ('admin' as const) : await getStaffRole(session.user).catch(() => null)
  const rawTrack = profile?.track
  const track: Track | null = isTrack(rawTrack) ? rawTrack : null
  // Primeiro acesso: o aluno escolhe o percurso. A administração fica de fora para poder criar as instituições antes de escolher.
  if (!track && !isAdmin) redirect('/aluno/percurso')

  const { progress, unread, downloads, saved, recent, savedItems, institution, simulador } = await getAlunoOverview({
    userId: session.user.id,
    track,
    institutionId: profile?.institutionId ?? null,
  })

  const unreadCount = unread.ok ? unread.value : 0
  const chipLabel =
    track === 'admissao'
      ? institution.ok && institution.value
        ? `Admissão · ${institution.value}`
        : 'Admissão'
      : (trackLabel(track) ?? 'Escolher percurso')
  const week = progress.ok ? progress.value : null
  const weekPercent = week ? Math.min(100, Math.max(0, week.weekly)) : 0
  // O cartão «Continuar» só existe quando há mesmo algo para continuar.
  const last = recent.ok ? recent.value[0] : undefined
  const simuladorSoon = simulador.ok && simulador.value.soon
  const greeting = getGreeting({ name: session.user.name, userId: session.user.id, createdAt: session.user.createdAt, streak: week?.streak ?? null })

  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-[#f8f8f5] text-[#202321]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <UrlFeedback />
      <div className="flex min-h-screen">
        <StudentSidebar firstName={firstName} />
        <div className="w-0 min-w-0 flex-1 overflow-x-clip leading-[normal]">
          <header className="flex h-[60px] items-center justify-between border-b border-[#eceee7] px-[16px] lg:px-8">
            <div className="flex items-center gap-[8px]">
              <AlunoMenuButton firstName={firstName} />
              <Link href="/aluno" className="text-[18px] font-semibold tracking-[-0.04em] lg:hidden">
                Twisisa
              </Link>
            </div>
            <div className="flex items-center gap-[4px]">
              {staffRole && (
                <Link href={staffRole === 'admin' ? '/admin' : '/admin/questoes'} className="inline-flex h-[32px] items-center rounded-[16px] bg-gradient-to-br from-[#eaf1ec] to-[#dbe9e0] px-[12px] text-[12px] font-semibold text-[#1d4d41] no-underline">
                  {staffRole === 'admin' ? 'Administração' : 'Revisão'}
                </Link>
              )}
              <Link
                href="/aluno/notificacoes"
                aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} por ler` : 'Notificações'}
                className="relative flex size-[44px] items-center justify-center text-[#4d5851]"
              >
                <Ic name="bell" />
                {unreadCount > 0 && <span className="absolute right-[11px] top-[11px] size-[8px] rounded-[4px] bg-[#c27645]" />}
              </Link>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[16px] px-[16px] pb-[24px] pt-[12px] lg:grid lg:max-w-[1040px] lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:px-8 lg:pb-12 lg:pt-8">
            <div className="flex min-w-0 flex-col gap-[16px]">
              <div className="flex h-[32px] items-center justify-between">
                <span className="min-w-0 line-clamp-2 text-[13px] font-bold leading-[16px] text-[#1d4d41]">{greeting}</span>
                <Link
                  href="/aluno/percurso"
                  aria-label={`Mudar percurso: ${chipLabel}`}
                  className="inline-flex h-[32px] flex-none items-center gap-[2px] rounded-[16px] bg-gradient-to-br from-[#eaf1ec] to-[#d9e8de] pl-[12px] pr-[8px] text-[12px] font-semibold text-[#1d4d41] no-underline"
                >
                  {chipLabel}
                  <Ic name="chev" size={14} />
                </Link>
              </div>

              {last && (
                <section aria-label="Continuar" className={cn('rounded-[20px] bg-gradient-to-br from-[#2f7260] via-[#1d4d41] to-[#12362d] p-[16px] text-white', soft)}>
                  <div className="flex items-center gap-[12px]">
                    <span className="flex size-[44px] flex-none items-center justify-center rounded-[14px] bg-white/[0.16] text-white">
                      <Ic name="file" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold tracking-[0.12em] text-white/70">CONTINUAR</p>
                      <p className="mt-[2px] truncate text-[16px] font-semibold">{last.title}</p>
                      <p className="mt-[2px] text-[12px] text-white/70">{relativeTime(last.at)}</p>
                    </div>
                  </div>
                  <a href={fileHref(last.id)} target="_blank" rel="noopener" className="mt-[14px] flex h-[48px] items-center justify-center gap-[8px] rounded-[24px] bg-white text-[15px] font-semibold text-[#1d4d41] no-underline">
                    Abrir <Ic name="up" size={16} />
                  </a>
                </section>
              )}

              <section aria-label="O que queres fazer?" className={cn('rounded-[20px] bg-white p-[14px]', soft)}>
                <h2 className={cn(sectionLabel, 'mb-[12px] ml-[4px] font-black')}>O que queres fazer?</h2>
                <div className="flex flex-col gap-[10px]">
                  <Link href="/biblioteca" className={cn(rowBase, 'bg-gradient-to-br from-[#2f7260] to-[#1d4d41] text-white')}>
                    <span className={cn(iconBox, 'bg-white/[0.16]')}>
                      <Ic name="book" />
                    </span>
                    Biblioteca
                    <Ic name="up" className="ml-auto opacity-[.65]" />
                  </Link>
                  <Link href="/aluno/simulador" className={cn(rowBase, 'bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]')}>
                    <span className={cn(iconBox, 'bg-white/[0.7]')}>
                      <Ic name="test" />
                    </span>
                    Simulador
                    {simuladorSoon && <span className="ml-auto rounded-[12px] bg-white/70 px-[10px] py-[4px] text-[11px] font-semibold text-[#1d4d41]">Em breve</span>}
                    <Ic name="up" className={cn('opacity-[.55]', !simuladorSoon && 'ml-auto')} />
                  </Link>
                  <Link href="/jonas" className={cn(rowBase, 'bg-gradient-to-br from-[#4a8a76] to-[#2a6a57] text-white')}>
                    <span className={cn(iconBox, 'bg-white/[0.16]')}>
                      <Ic name="spark" />
                    </span>
                    Jonas
                    <Ic name="up" className="ml-auto opacity-[.65]" />
                  </Link>
                </div>
              </section>
            </div>

            <div className="flex min-w-0 flex-col gap-[16px]">
              <dl aria-label="Resumo" className="m-0 grid grid-cols-2 gap-[10px]">
                <div className={cn('grid h-[76px] grid-cols-[1fr_auto] content-between rounded-[16px] bg-gradient-to-br from-white to-[#f1f5ef] p-[14px]', soft)}>
                  <dt className="flex items-center gap-[6px] text-[12px] font-medium text-[#5f6a63]">
                    <Ic name="target" size={14} />
                    Semana
                  </dt>
                  <dd className="text-[18px] font-semibold text-[#202321]">{week ? `${week.weekly}%` : DASH}</dd>
                  <dd aria-hidden="true" className="col-span-2 h-[6px] rounded-[3px] bg-[#e3e9df]">
                    <div className="h-full rounded-[3px] bg-gradient-to-r from-[#4a8a76] to-[#1d4d41]" style={{ width: `${weekPercent}%` }} />
                  </dd>
                </div>
                <div className="grid h-[76px] content-between rounded-[16px] bg-gradient-to-br from-[#fbefe2] to-[#f1d8bd] p-[14px] text-[#8a4f26]">
                  <dt className="flex items-center gap-[6px] text-[12px] font-medium">
                    <Ic name="flame" size={14} />
                    Sequência
                  </dt>
                  <dd className="text-[18px] font-semibold">{week ? days(week.streak) : DASH}</dd>
                </div>
                <div className="grid h-[76px] content-between rounded-[16px] bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] p-[14px] text-[#1d4d41]">
                  <dt className="flex items-center gap-[6px] text-[12px] font-medium">
                    <Ic name="down" size={14} />
                    Descarregados
                  </dt>
                  <dd className="text-[18px] font-semibold">{downloads.ok ? downloads.value : DASH}</dd>
                </div>
                <div className={cn('grid h-[76px] content-between rounded-[16px] bg-gradient-to-br from-white to-[#f4f0e2] p-[14px] text-[#805f19]', soft)}>
                  <dt className="flex items-center gap-[6px] text-[12px] font-medium">
                    <Ic name="mark" size={14} />
                    Guardados
                  </dt>
                  <dd className="text-[18px] font-semibold text-[#202321]">{saved.ok ? saved.value : DASH}</dd>
                </div>
              </dl>

              <section aria-label="Recentes">
                <h2 className={cn(sectionLabel, 'mb-[8px] ml-[4px] flex items-center gap-[6px] font-semibold')}>
                  <Ic name="hist" size={14} />
                  Recentes
                </h2>
                <MaterialCard tone="white" items={recent} emptyTitle="Ainda sem materiais recentes" emptyText="Os materiais que descarregares aparecem aqui." />
              </section>

              <section aria-label="Guardados">
                <h2 className={cn(sectionLabel, 'mb-[8px] ml-[4px] flex items-center gap-[6px] font-bold')}>
                  <Ic name="mark" size={14} />
                  Guardados
                </h2>
                <MaterialCard tone="sand" items={savedItems} emptyTitle="Ainda sem materiais guardados" emptyText="Os materiais que guardares aparecem aqui." />
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
