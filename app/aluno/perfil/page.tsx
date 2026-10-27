import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { BookOpen, CircleUserRound, Compass, Save } from 'lucide-react'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { institutions, studentProfiles } from '@/lib/db/schema'
import { trackLabel } from '@/lib/percurso'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { saveProfile } from './actions'
import { SelectField } from '@/components/ui/select-field'
import { FeedbackForm } from '@/components/feedback-form'

export const metadata = { title: 'O meu perfil | Twisisa', description: 'Gere as tuas informações pessoais e preferências.' }

const field = 'h-10 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:border-primary'

export default async function PerfilPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const [current] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, session.user.id))
  const institution = current?.institutionId
    ? (await db.select({ shortName: institutions.shortName, name: institutions.name }).from(institutions).where(eq(institutions.id, current.institutionId)))[0]
    : undefined
  const firstName = session.user.name.split(' ')[0]
  const track = current?.track ?? null
  const isAdmission = track === 'admissao'

  return <StudentFeatureShell firstName={firstName} eyebrow="Perfil" title="Meu Perfil" description="Gere as tuas informações pessoais" hideBackLink>
    <FeedbackForm action={saveProfile} successMessage="Perfil guardado." errorMessage="Não foi possível guardar o perfil. Tenta outra vez." className="flex flex-col gap-5">
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"><div className="flex items-center gap-2"><CircleUserRound className="text-primary" /><h2 className="font-semibold">Informações pessoais</h2></div><p className="mt-1 text-sm text-muted-foreground">Nome, contacto e identificador público.</p><div className="mt-6 grid gap-4"><label className="grid gap-2 text-sm font-medium">Nome de exibição<input name="displayName" required minLength={2} maxLength={80} defaultValue={session.user.name} className={field} /></label><label className="grid gap-2 text-sm font-medium">Email<input value={session.user.email} readOnly className="h-10 rounded-lg border border-input bg-muted px-3 font-normal text-muted-foreground outline-none" /></label><label className="grid gap-2 text-sm font-medium">Telefone <span className="inline font-normal text-muted-foreground">(opcional)</span><input name="phone" maxLength={30} defaultValue={current?.phone ?? ''} placeholder="+258 84 000 0000" className={field} /></label><label className="grid gap-2 text-sm font-medium">@Nickname<input name="nickname" maxLength={21} defaultValue={current?.nickname ? `@${current.nickname}` : ''} placeholder="@juvencio" className={field} /><span className="text-xs font-normal text-muted-foreground">O teu identificador único: 3 a 20 letras, números, _ ou ponto, sem espaços.</span></label></div></section>
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Compass className="text-primary" /><h2 className="font-semibold">Percurso</h2></div>
        {track ? <p className="mt-1 text-sm text-muted-foreground">{trackLabel(track)}{isAdmission ? (institution ? ` · ${institution.shortName}` : ' · sem instituição escolhida') : ''}</p> : <p className="mt-1 text-sm text-muted-foreground">Ainda não escolheste o que estás a preparar.</p>}
        <Link href="/aluno/percurso" className="mt-4 inline-flex h-10 items-center rounded-lg border border-input px-4 text-sm font-semibold text-primary hover:bg-muted/60">{track ? 'Alterar percurso' : 'Escolher percurso'}</Link>
      </section>
      {isAdmission && <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"><div className="flex items-center gap-2"><BookOpen className="text-primary" /><h2 className="font-semibold">Configurações de candidato</h2></div><p className="mt-1 text-sm text-muted-foreground">Curso alvo e meta de nota.</p><label className="mt-5 grid gap-2 text-sm font-medium">Curso alvo<input name="targetCourse" maxLength={160} defaultValue={current?.targetCourse ?? ''} placeholder="Ex.: Engenharia de Telecomunicações" className={field} /></label><div className="mt-4 grid gap-2 text-sm font-medium"><span>Meta de nota</span><SelectField name="targetScore" label="Meta de nota" defaultValue={String(current?.targetScore ?? 12)} triggerClassName={field} options={[10, 12, 14, 16, 18, 20].map((score) => ({ value: String(score), label: String(score) }))} /><span className="text-xs font-normal text-muted-foreground">Escala de 0 a 20.</span></div></section>}
      <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"><Save />Salvar alterações</button>
    </FeedbackForm>
  </StudentFeatureShell>
}
