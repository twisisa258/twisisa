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
import { ContinuarCard, DescobreCursoCard, ErrosCard, ProgressoPorDisciplina } from '@/components/aluno/inicio-cards'
import { getInicioAluno, type ResumeItem } from '@/lib/aluno-inicio'

export const dynamic = 'force-dynamic'

const fileHref = (id: string) => `/api/biblioteca/${encodeURIComponent(id)}/ficheiro`

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

  // O Início do Simulador e a orientação de curso correm ao mesmo tempo que o resto; se falharem, essas secções não aparecem (nunca um zero inventado).
  const inicioPromise = track
    ? getInicioAluno({ userId: session.user.id, track, institutionId: profile?.institutionId ?? null }).then(
        (value) => ({ ok: true as const, value }),
        (error: unknown) => {
          console.error('[ALUNO] início', error)
          return { ok: false as const }
        },
      )
    : Promise.resolve(null)
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
  // O cartão «Continuar» só existe quando há mesmo algo para continuar.
  const last = recent.ok ? recent.value[0] : undefined
  const inicio = await inicioPromise
  // Ordem: orientação a meio, sessão do Simulador a meio, último material aberto.
  const resume: ResumeItem | null =
    (inicio?.ok ? inicio.value.resume : null) ?? (last ? { kind: 'material', title: last.title, at: last.at, href: fileHref(last.id) } : null)
  const greeting = getGreeting({ name: session.user.name, userId: session.user.id, createdAt: session.user.createdAt, streak: week?.streak ?? null })

  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-[#f8f8f5] text-[#202321]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <UrlFeedback />
      <div className="flex min-h-screen">
        <StudentSidebar firstName={firstName} image={session.user.image ?? null} />
        <div className="w-0 min-w-0 flex-1 overflow-x-clip leading-[normal]">
          <header className="flex h-[60px] items-center justify-between border-b border-[#eceee7] px-[16px] lg:px-8">
            <div className="flex items-center gap-[8px]">
              <AlunoMenuButton firstName={firstName} image={session.user.image ?? null} />
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

          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[16px] px-[16px] pb-[24px] pt-[12px] lg:px-8 lg:pb-12 lg:pt-8">
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

              {resume && <ContinuarCard resume={resume} />}

              <section aria-label="O que queres fazer?" className={cn('rounded-[20px] bg-white p-[14px]', soft)}>
                <div className="flex flex-col gap-[10px]">
                  <Link href="/biblioteca" className={cn(rowBase, 'bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]')}>
                    <span className={cn(iconBox, 'bg-white/[0.7]')}>
                      <Ic name="book" />
                    </span>
                    Biblioteca
                    <Ic name="up" className="ml-auto opacity-[.55]" />
                  </Link>
                  <Link href="/aluno/simulador" className={cn(rowBase, 'bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]')}>
                    <span className={cn(iconBox, 'bg-white/[0.7]')}>
                      <Ic name="test" />
                    </span>
                    Simulador
                    <Ic name="up" className={'ml-auto opacity-[.55]'} />
                  </Link>
                  <Link href="/jonas" className={cn(rowBase, 'bg-gradient-to-br from-[#eaf2ed] to-[#d6e6dc] text-[#1d4d41]')}>
                    <span className={cn(iconBox, 'bg-white/[0.7]')}>
                      <Ic name="spark" />
                    </span>
                    Jonas
                    <Ic name="up" className="ml-auto opacity-[.55]" />
                  </Link>
                </div>
              </section>
            </div>

            <div className="flex min-w-0 flex-col gap-[16px]">
              {inicio?.ok && inicio.value.practice && (
                <>
                  <ProgressoPorDisciplina subjects={inicio.value.practice.subjects.slice(0, 5)} />
                  {inicio.value.practice.showErrors && <ErrosCard count={inicio.value.practice.errorCount} href={inicio.value.practice.errorsHref} />}
                </>
              )}
              {inicio?.ok && inicio.value.orientacao && <DescobreCursoCard data={inicio.value.orientacao} />}
              {(!savedItems.ok || savedItems.value.length > 0) && (
              <section aria-label="Guardados">
                <h2 className={cn(sectionLabel, 'mb-[8px] ml-[4px] flex items-center gap-[6px] font-bold')}>
                  <Ic name="mark" size={14} />
                  Guardados
                </h2>
                <MaterialCard tone="sand" items={savedItems} emptyTitle="Ainda sem materiais guardados" emptyText="Os materiais que guardares aparecem aqui." />
              </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
