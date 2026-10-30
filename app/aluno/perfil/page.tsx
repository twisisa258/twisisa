import Link from 'next/link'
import { BookOpen, GraduationCap, Lock, School, Sparkles, UserRound, Check } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { institutions, studentProfiles } from '@/lib/db/schema'
import { trackLabel } from '@/lib/percurso'
import { PROVINCES, profileSteps } from '@/lib/perfil'
import { getSubscription, isSubscriptionActive } from '@/lib/subscription'
import { getRanking } from '@/lib/ranking'
import { formatPoints } from '@/lib/simulator-shared'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { SelectField } from '@/components/ui/select-field'
import { AvatarUploader } from '@/components/aluno/perfil/avatar-uploader'
import { Field, fieldClass } from '@/components/aluno/perfil/fields'
import { PasswordForm } from '@/components/aluno/perfil/password-form'
import { ProfileAccordion, type AccordionItem } from '@/components/aluno/perfil/profile-accordion'
import { SectionForm } from '@/components/aluno/perfil/section-form'
import { saveCandidate, savePersonal, saveSchool } from './actions'
import { requireStudent } from '@/lib/require-student'

export const metadata = { title: 'O meu perfil | Twisisa', description: 'Gere as tuas informações pessoais e preferências.' }

const linkButton = 'inline-flex h-10 items-center rounded-xl border border-[#dfe3d9] bg-white px-4 text-sm font-semibold text-[#1d4d41] transition-colors hover:bg-[#f1f4ef]'

export default async function PerfilPage() {
  const session = await requireStudent('/aluno/perfil')
  const [[current], subscription] = await Promise.all([
    db.select().from(studentProfiles).where(eq(studentProfiles.userId, session.user.id)),
    getSubscription(session.user.id),
  ])
  // Posição desta semana (só se pontuou e está visível). Se falhar, o cabeçalho segue sem ela.
  const rank = current?.track && current.showInRanking
    ? await getRanking({ userId: session.user.id, track: current.track, period: 'semana', limit: 0 }).then((data) => data.me, () => null)
    : null
  const institution = current?.institutionId
    ? (await db.select({ shortName: institutions.shortName, name: institutions.name }).from(institutions).where(eq(institutions.id, current.institutionId)))[0]
    : undefined

  const name = session.user.name
  const firstName = name.split(' ')[0]
  const track = current?.track ?? null
  const isAdmission = track === 'admissao'
  const plus = isSubscriptionActive(subscription?.status)

  const steps = profileSteps({
    image: session.user.image ?? null,
    nickname: current?.nickname ?? null,
    province: current?.province ?? null,
    school: current?.school ?? null,
    track,
    institutionId: current?.institutionId ?? null,
    targetCourse: current?.targetCourse ?? null,
  })
  const doneCount = steps.filter((step) => step.done).length
  const percent = Math.round((doneCount / steps.length) * 100)
  const missing = steps.filter((step) => !step.done).map((step) => step.label)
  const complete = missing.length === 0

  const has = (key: string) => steps.find((step) => step.key === key)?.done ?? false
  const schoolSummary = current?.school && current?.province ? `${current.school} · ${current.province}` : current?.school || current?.province || 'Onde estudas'
  const trackSummary = track
    ? [trackLabel(track), isAdmission ? (institution?.shortName ?? 'sem instituição') : null, isAdmission ? current?.targetCourse : null].filter(Boolean).join(' · ')
    : 'O que estás a preparar'

  const items: AccordionItem[] = [
    {
      id: 'pessoal',
      icon: <UserRound />,
      title: 'Dados pessoais',
      summary: [name, current?.nickname ? `@${current.nickname}` : null].filter(Boolean).join(' · '),
      done: has('nickname'),
      content: (
        <SectionForm sectionId="pessoal" action={savePersonal}>
          <Field label="Nome de exibição">
            <input name="displayName" required minLength={2} maxLength={80} defaultValue={name} autoComplete="name" className={fieldClass} />
          </Field>
          <Field label="@Nickname" hint="O teu identificador único: 3 a 20 letras, números, _ ou ponto.">
            <input name="nickname" maxLength={21} defaultValue={current?.nickname ? `@${current.nickname}` : ''} placeholder="@juvencio" autoCapitalize="none" autoCorrect="off" className={fieldClass} />
          </Field>
          <Field label={<>Telefone <span className="font-normal text-[#737c75]">(opcional)</span></>}>
            <input name="phone" type="tel" maxLength={30} defaultValue={current?.phone ?? ''} placeholder="+258 84 000 0000" autoComplete="tel" className={fieldClass} />
          </Field>
          <Field label="Email">
            <input value={session.user.email} readOnly aria-readonly="true" className={fieldClass} />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#f8f8f5] p-3 text-sm">
            <input type="checkbox" name="showInRanking" defaultChecked={current?.showInRanking ?? true} className="mt-0.5 size-4 accent-[#1d4d41]" />
            <span><span className="font-medium text-[#202321]">Aparecer no ranking</span><span className="block text-xs text-[#737c75]">Mostramos só o teu nome abreviado e o @nickname.</span></span>
          </label>
        </SectionForm>
      ),
    },
    {
      id: 'escola',
      icon: <School />,
      title: 'Escola',
      summary: schoolSummary,
      done: has('escola'),
      content: (
        <SectionForm sectionId="escola" action={saveSchool}>
          <Field label="Província" custom>
            <SelectField name="province" label="Província" placeholder="Escolhe a província" defaultValue={current?.province ?? ''} triggerClassName={fieldClass} options={PROVINCES.map((province) => ({ value: province, label: province }))} />
          </Field>
          <Field label="Escola">
            <input name="school" maxLength={120} defaultValue={current?.school ?? ''} placeholder="Ex.: Escola Secundária Josina Machel" className={fieldClass} />
          </Field>
        </SectionForm>
      ),
    },
    {
      id: 'percurso',
      icon: <GraduationCap />,
      title: 'Percurso',
      summary: trackSummary,
      done: has('percurso') && (!isAdmission || (has('instituicao') && has('curso'))),
      content: (
        <div className="grid gap-4">
          <p className="text-sm text-[#68716a]">
            {track ? `${trackLabel(track)}${isAdmission ? (institution ? ` · ${institution.name}` : ' · sem instituição escolhida') : ''}` : 'Ainda não escolheste o que estás a preparar.'}
          </p>
          <div>
            <Link href="/aluno/percurso" className={linkButton}>{track ? 'Alterar percurso' : 'Escolher percurso'}</Link>
          </div>
          {isAdmission && (
            <div className="border-t border-[#eceee7] pt-4">
              <SectionForm sectionId="percurso" action={saveCandidate}>
                <Field label="Curso alvo">
                  <input name="targetCourse" maxLength={160} defaultValue={current?.targetCourse ?? ''} placeholder="Ex.: Engenharia de Telecomunicações" className={fieldClass} />
                </Field>
                <Field label="Meta de nota" hint="Escala de 0 a 20." custom>
                  <SelectField name="targetScore" label="Meta de nota" defaultValue={String(current?.targetScore ?? 12)} triggerClassName={fieldClass} options={[10, 12, 14, 16, 18, 20].map((score) => ({ value: String(score), label: String(score) }))} />
                </Field>
              </SectionForm>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'seguranca',
      icon: <Lock />,
      title: 'Segurança',
      summary: 'Palavra-passe',
      content: <PasswordForm />,
    },
    {
      id: 'plano',
      icon: <Sparkles />,
      title: 'Plano',
      summary: plus ? 'Plus ativo' : 'Gratuito',
      content: (
        <div className="grid gap-4">
          <p className="text-sm text-[#68716a]">{plus ? 'Tens o Twisisa Plus ativo.' : 'Estás no plano gratuito.'}</p>
          <div>
            <Link href="/planos" className={linkButton}><BookOpen className="mr-2 size-4" aria-hidden="true" />{plus ? 'Ver o meu plano' : 'Ver planos'}</Link>
          </div>
        </div>
      ),
    },
  ]

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Perfil" title="Meu Perfil" hideTitle hideBackLink>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <AvatarUploader name={name} image={session.user.image ?? null} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{name}</h1>
            <p className="truncate text-sm text-[#68716a]">{current?.nickname ? `@${current.nickname}` : session.user.email}</p>
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#e3e6dc]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Perfil completo">
                <div className="h-full rounded-full bg-[#1d4d41] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-[#68716a]">
                {complete ? (
                  <><Check size={13} className="text-[#1d4d41]" aria-hidden="true" />Perfil completo</>
                ) : (
                  <>{doneCount} de {steps.length} · falta {missing.slice(0, 2).join(' e ')}{missing.length > 2 ? '…' : ''}</>
                )}
              </p>
              {rank && (
                <Link href="/aluno/ranking" className="mt-1 inline-block text-xs font-semibold text-[#1d4d41] hover:underline">#{rank.position} no ranking da semana · {formatPoints(rank.points)} pts</Link>
              )}
            </div>
          </div>
        </div>
        <ProfileAccordion items={items} />
      </div>
    </StudentFeatureShell>
  )
}
