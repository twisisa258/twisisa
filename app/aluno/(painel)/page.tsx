import Link from 'next/link'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { isAdminEmail } from '@/lib/admin'
import { getStaffRole } from '@/lib/staff'
import { getGreeting } from '@/lib/greeting'
import { db } from '@/lib/db'
import { studentProfiles } from '@/lib/db/schema'
import { getAlunoOverview, type MaterialItem, type Part } from '@/lib/aluno-overview'
import { isTrack, levelLabel, type Track } from '@/lib/percurso'
import { relativeTime } from '@/lib/relative-time'
import { cn } from '@/lib/utils'
import { StudentSidebar } from '@/components/student-sidebar'
import { UrlFeedback } from '@/components/url-feedback'
import { AlunoMenuButton } from '@/components/aluno/aluno-menu-button'
import { Ic } from '@/components/aluno/icons'
import { DescobreCursoCard, ProgressoPorDisciplina } from '@/components/aluno/inicio-cards'
import { getInicioAluno, type ResumeItem } from '@/lib/aluno-inicio'
import { getDesafios } from '@/lib/desafios'
import { buildAvisos } from '@/lib/avisos'
import { AvisoFaixa } from '@/components/aluno/aviso-faixa'
import { Anuncios } from '@/components/anuncios/anuncios'
import { TreinarAgora } from '@/components/aluno/treinar-agora'
import { MODE_META, ATTEMPT_MODES } from '@/lib/simulator-shared'
import { getAnunciosAtivos } from '@/lib/anuncios'
import { HojeHero } from '@/components/aluno/hoje-hero'
import { CursoGate } from '@/components/aluno/curso-gate'
import { safeNext } from '@/lib/identity'
import { getCourseCombos, getCourseGate } from '@/lib/combinacoes'
import { listInstitutionCourses } from '@/lib/target-course'
import { getVisibleModules } from '@/lib/exam-modules'
import { ORIENTACAO_HREF, ORIENTACAO_MODULE_KEY } from '@/lib/orientacao'
import { Fechavel } from '@/components/aluno/fechavel'
import { NovidadeModal } from '@/components/aluno/novidade-modal'
import { InstalarApp } from '@/components/aluno/instalar-app'
import { NotificacoesModal } from '@/components/aluno/notificacoes-modal'
import { ParaHoje, buildPlan } from '@/components/aluno/plano-hoje'
import { markCounts } from '@/lib/kit'
import { requireStudent } from '@/lib/require-student'

export const dynamic = 'force-dynamic'

const fileHref = (id: string) => `/api/biblioteca/${encodeURIComponent(id)}/ficheiro`

// Sem bordas pesadas: a separação vem de uma sombra suave e de degradês na mesma família verde da plataforma.
const soft = 'shadow-[0_1px_2px_rgba(20,50,40,0.04),0_10px_26px_-14px_rgba(20,50,40,0.18)]'

function ListEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-[16px] py-[14px]">
      <p className="text-[14px] font-medium text-texto">{title}</p>
      <p className="mt-[2px] text-[12px] text-texto-2">{text}</p>
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
              'flex h-[48px] items-center gap-[12px] px-[16px] text-[14px] font-medium text-inherit no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca',
              index > 0 && 'border-t border-black/[0.05]',
            )}
          >
            <Ic name="file" size={16} className="text-texto-2" />
            <p className="min-w-0 truncate">{item.title}</p>
            <small className="ml-auto flex-none whitespace-nowrap text-[12px] font-normal text-texto-2">{relativeTime(item.at)}</small>
          </a>
        ))
      )}
    </div>
  )
}

const tile = 'flex min-h-[92px] flex-col items-start justify-between rounded-2xl p-3 text-[14px] font-semibold no-underline'
const sectionLabel = 'text-[11px] uppercase tracking-[0.12em] text-texto [font-family:inherit]'

export default async function StudentPage({ searchParams }: { searchParams: Promise<{ curso?: string; next?: string }> }) {
  const session = await requireStudent('/aluno')

  const [profile] = await db
    .select({ track: studentProfiles.track, institutionId: studentProfiles.institutionId, targetCourseId: studentProfiles.targetCourseId, otherLevel: studentProfiles.otherLevel, birthDate: studentProfiles.birthDate, dailyGoal: studentProfiles.dailyGoal })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id))
    .limit(1)

  const firstName = session.user.name.split(' ')[0]
  const isAdmin = isAdminEmail(session.user.email)
  // Entrada na administração para quem tem papel na equipa (admin ou revisor). Se a consulta falhar, a página continua sem o botão.
  const staffRole = isAdmin ? ('admin' as const) : await getStaffRole(session.user).catch(() => null)
  const rawTrack = profile?.track
  const track: Track | null = isTrack(rawTrack) ? rawTrack : null
  // Candidato sem curso (ou combinação) escolhido: só pode escolher; nada de prática antes.
  const gate = track === 'admissao' ? await getCourseGate(session.user.id) : null
  const params = await searchParams
  const next = safeNext(params.next, '')
  // Veio escolher o curso para seguir para outro sítio e já está tudo em ordem: segue.
  if (params.curso && !gate?.need && next) redirect(next)
  let gateCourses: { id: string; label: string; detail: string | null }[] = []
  let gateCombos: { optionId: string; label: string }[] = []
  let gateOrientacao: string | null = null
  if (gate?.need && profile?.institutionId) {
    try {
      gateCourses = (await listInstitutionCourses(profile.institutionId)).map((course) => ({ id: course.id, label: course.name, detail: course.unit }))
      if (gate.need === 'combinacao' && gate.courseId) gateCombos = (await getCourseCombos(gate.courseId)).map((combo) => ({ optionId: combo.optionId, label: combo.label }))
      const modules = await getVisibleModules('admissao').catch(() => [])
      if (modules.some((item) => item.key === ORIENTACAO_MODULE_KEY && item.status === 'active')) gateOrientacao = ORIENTACAO_HREF
    } catch (error) {
      console.error('[ALUNO] cursos para escolher', error)
    }
  }
  // Primeiro acesso: o aluno escolhe o percurso. A administração fica de fora para poder criar as instituições antes de escolher.
  if (!track && !profile?.otherLevel && !isAdmin) redirect('/aluno/percurso')

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
  // Sequência e avisos vêm das respostas do Simulador (lib/desafios). Se falhar, a página segue sem eles.
  const desafiosPromise = track
    ? getDesafios({ scope: { userId: session.user.id, track, institutionId: profile?.institutionId ?? null }, targetCourseId: profile?.targetCourseId ?? null, dailyGoal: profile?.dailyGoal ?? null }).catch((error: unknown) => {
        console.error('[ALUNO] desafios', error)
        return null
      })
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
      : (levelLabel(track, profile?.otherLevel) ?? 'Escolher percurso')
  const week = progress.ok ? progress.value : null
  // O cartão «Continuar» só existe quando há mesmo algo para continuar.
  const last = recent.ok ? recent.value[0] : undefined
  const inicio = await inicioPromise
  // Ordem: orientação a meio, sessão do Simulador a meio, último material aberto.
  const resume: ResumeItem | null =
    (inicio?.ok ? inicio.value.resume : null) ?? (last ? { kind: 'material', title: last.title, at: last.at, href: fileHref(last.id) } : null)
  const desafios = await desafiosPromise
  // Anúncios da equipa: se a consulta falhar (ou a tabela ainda não existir), a página segue sem eles.
  const anuncios = await getAnunciosAtivos(track).catch((error: unknown) => {
    console.error('[ALUNO] anúncios', error)
    return []
  })
  // Modos do Simulador ligados ao percurso: o painel oferece-os como atalho para começar a estudar.
  const modulos = track ? await getVisibleModules(track).catch(() => []) : []
  const modos = ATTEMPT_MODES.filter((modo) => modulos.some((item) => item.key === MODE_META[modo].moduleKey && item.status === 'active'))
  const marks = await markCounts(session.user.id).catch(() => null)
  // Plano de hoje: só com dados reais. Sem os desafios (falha ou sem percurso) o cartão não aparece.
  const plan = desafios
    ? buildPlan({ goal: desafios.goal, answered: desafios.todayAnswered, marksDue: marks?.due ?? 0, errorCount: inicio?.ok && inicio.value.practice?.showErrors ? inicio.value.practice.errorCount : 0, errorsHref: inicio?.ok && inicio.value.practice ? inicio.value.practice.errorsHref : null })
    : []
  const avisos = desafios ? buildAvisos(desafios).slice(0, 3) : []
  const greeting = getGreeting({ name: session.user.name, userId: session.user.id, createdAt: session.user.createdAt, birthDate: profile?.birthDate ?? null, streak: desafios ? desafios.streak.current : (week?.streak ?? null) })
  // Linha discreta com dados reais de study_days (sem cartão): «Hoje 4/10 · 3 dias seguidos». Sem dados, não aparece.
  const goal = profile?.dailyGoal ?? null
  const activityParts: string[] = []
  if (week && (goal || week.today > 0)) activityParts.push(goal ? `Hoje ${week.today}/${goal}` : `Hoje ${week.today}`)
  if (week && week.streak >= 2) activityParts.push(`${week.streak} dias seguidos`)
  const activity = activityParts.join(' · ')

  return (
    <main className="min-h-screen max-w-full overflow-x-hidden bg-fundo text-texto" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <UrlFeedback />
      <NotificacoesModal publicKey={process.env.VAPID_PUBLIC_KEY ?? ''} />
      <InstalarApp />
      {track && <NovidadeModal />}
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
                <Link href={staffRole === 'admin' ? '/admin' : '/admin/questoes'} className="inline-flex h-[32px] items-center rounded-[16px] bg-gradient-to-br from-[#eaf1ec] to-[#dbe9e0] px-[12px] text-[12px] font-semibold text-marca no-underline">
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
              <div className="flex min-h-[32px] items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className={cn('block text-[13px] font-bold leading-[16px] text-marca', activity ? 'truncate' : 'line-clamp-2')}>{greeting}</span>
                  {activity && <span title={week ? `${week.week} questões esta semana` : undefined} className="block truncate text-[11px] leading-[14px] text-texto-2">{activity}</span>}
                </div>
                <Link
                  href="/aluno/percurso"
                  aria-label={`Mudar percurso: ${chipLabel}`}
                  className="inline-flex h-[32px] flex-none items-center gap-[2px] rounded-[16px] bg-gradient-to-br from-[#eaf1ec] to-[#d9e8de] pl-[12px] pr-[8px] text-[12px] font-semibold text-marca no-underline"
                >
                  {chipLabel}
                  <Ic name="chev" size={14} />
                </Link>
              </div>

              <AvisoFaixa items={gate?.need ? [] : avisos} />
              {!gate?.need && <Anuncios items={anuncios} />}

              {gate?.need ? (
                <CursoGate courses={gateCourses} initialCourseId={gate.need === 'combinacao' ? gate.courseId : null} initialCombos={gateCombos} orientacaoHref={gateOrientacao} next={next || null} forcarAbrir={Boolean(params.curso)} />
              ) : (
                <>
                  <HojeHero goal={desafios ? desafios.goal : null} answered={desafios ? desafios.todayAnswered : 0} resume={resume} />
                  <ParaHoje items={plan} />
                  <TreinarAgora modes={modos} errorCount={inicio?.ok && inicio.value.practice ? inicio.value.practice.errorCount : 0} />
                </>
              )}

              {!gate?.need && (
              <nav aria-label="Atalhos" className="grid grid-cols-3 gap-2.5">
                <Link href="/biblioteca" className={cn(tile, 'border border-linha bg-white text-texto')}>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-marca-suave text-marca"><Ic name="book" /></span>
                  Biblioteca
                </Link>
                <Link href={gate?.need ? '/aluno/escolher-curso?next=/aluno/simulador' : '/aluno/simulador'} className={cn(tile, 'bg-marca-suave text-marca')}>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white/70"><Ic name="test" /></span>
                  Simulador
                </Link>
                <Link href="/jonas" className={cn(tile, 'bg-assistente-suave text-assistente')}>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white/70"><Ic name="spark" /></span>
                  Jonas
                </Link>
              </nav>
              )}
            </div>

            {!gate?.need && (
            <div className="flex min-w-0 flex-col gap-[16px]">
              {inicio?.ok && inicio.value.practice && (
                <>
                  <ProgressoPorDisciplina subjects={inicio.value.practice.subjects.slice(0, 5)} />
                </>
              )}
              {inicio?.ok && inicio.value.orientacao && <Fechavel id="cartao:orientacao" days={14} label="Fechar sugestão"><DescobreCursoCard data={inicio.value.orientacao} /></Fechavel>}
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
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
