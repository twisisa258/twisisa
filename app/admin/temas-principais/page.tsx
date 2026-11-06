import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ListOrdered } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listAdminInstitutions, listAdminSubjects, listKeyTopics, type AdminKeyTopic, type AdminSubject } from '@/lib/exames'
import { slugify } from '@/lib/exames-pure'
import { AdminLoadError, AdminPage, AdminPageHeader } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { TemasAcoes } from '@/components/admin/temas-acoes'
import { removeTopic, saveTopic } from '@/app/admin/temas-principais/actions'

export const dynamic = 'force-dynamic'
// «Gerar com o Jonas» é um pedido longo.
export const maxDuration = 60
export const metadata = { title: 'Temas principais | Administração | Twisisa' }

function href(inst: string, disc?: string) {
  return `/admin/temas-principais?inst=${encodeURIComponent(inst)}${disc ? `&disc=${encodeURIComponent(disc)}` : ''}`
}
const chip = (active: boolean) => `inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${active ? 'border-marca bg-marca font-semibold text-white' : 'border-[#dfe3d9] bg-white text-[#526057] hover:bg-[#f3f4ef]'}`
const field = 'w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/10'

export default async function AdminTemasPrincipaisPage({ searchParams }: { searchParams: Promise<{ inst?: string; disc?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams

  let institutions: Awaited<ReturnType<typeof listAdminInstitutions>>
  let subjects: AdminSubject[] = []
  let topics: AdminKeyTopic[] = []
  let inst: { id: string; shortName: string } | undefined
  let subject: AdminSubject | undefined
  try {
    institutions = await listAdminInstitutions()
    inst = institutions.find((item) => item.id === params.inst) ?? institutions[0]
    if (inst) subjects = await listAdminSubjects(inst.id)
    subject = subjects.find((item) => item.id === params.disc) ?? subjects[0]
    if (inst && subject) topics = await listKeyTopics(inst.id, subject.id)
  } catch (error) {
    console.error('[ADMIN TEMAS PRINCIPAIS]', error)
    return <AdminPage><AdminLoadError href="/admin/temas-principais" /></AdminPage>
  }

  const published = topics.length > 0 && topics.every((item) => item.status === 'publicado')
  const byPosition = new Map(topics.map((item) => [item.position, item]))
  const publicPath = inst && subject ? `/exames/${slugify(inst.shortName)}/${subject.slug}` : null

  return (
    <AdminPage>
      <AdminPageHeader icon={ListOrdered} title="Temas principais" description="Os 10 temas a estudar em cada disciplina, por instituição. Publicados, aparecem no Google e no PDF de estudo." />
      <nav aria-label="Instituição" className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1">
        {institutions.map((item) => <Link key={item.id} href={href(item.id)} aria-current={item.id === inst?.id ? 'page' : undefined} className={chip(item.id === inst?.id)}>{item.shortName}</Link>)}
      </nav>
      {subjects.length === 0 ? (
        <p className="shrink-0 rounded-xl bg-aviso-suave px-4 py-3 text-sm text-aviso-texto">Esta instituição ainda não tem disciplinas. Associa-as em Disciplinas.</p>
      ) : (
        <nav aria-label="Disciplina" className="-mx-1 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-1">
          {subjects.map((item) => (
            <Link key={item.id} href={href(inst!.id, item.id)} aria-current={item.id === subject?.id ? 'page' : undefined} className={chip(item.id === subject?.id)}>
              {item.name}
              <span className={`text-xs tabular-nums ${item.id === subject?.id ? 'text-white/80' : 'text-texto-2'}`}>{item.published > 0 ? `${item.published} publicados` : item.total > 0 ? `${item.total} rascunhos` : 'vazio'}</span>
            </Link>
          ))}
        </nav>
      )}

      {inst && subject && (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-6">
          <section className="rounded-2xl border border-[#e3e7dc] bg-white p-4 sm:p-5">
            <p className="text-sm text-texto-2">O Jonas propõe os temas com base nos exames já importados e nos temas da disciplina. Revê o texto antes de publicar.{publicPath && published && <> Página pública: <Link href={publicPath} className="font-semibold text-marca" target="_blank">{publicPath}</Link></>}</p>
            <div className="mt-3"><TemasAcoes institutionId={inst.id} subjectId={subject.id} total={topics.length} published={published} /></div>
          </section>

          {Array.from({ length: 10 }, (_, index) => index + 1).map((position) => {
            const topic = byPosition.get(position)
            return (
              <section key={position} className="rounded-2xl border border-[#e3e7dc] bg-white p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">Tema {position}{topic ? '' : ' (vazio)'}</h2>
                  {topic && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${topic.status === 'publicado' ? 'bg-sucesso-suave text-sucesso-texto' : 'bg-[#eef1ea] text-[#526057]'}`}>{topic.status === 'publicado' ? 'Publicado' : 'Rascunho'}{topic.origin === 'jonas' ? ' · Jonas' : ''}</span>}
                </div>
                <FeedbackForm action={saveTopic} successMessage="Tema guardado." className="grid gap-3">
                  <input type="hidden" name="institutionId" value={inst.id} />
                  <input type="hidden" name="subjectId" value={subject.id} />
                  <input type="hidden" name="position" value={position} />
                  <label className="grid gap-1 text-sm font-medium">Título<input name="title" defaultValue={topic?.title ?? ''} required minLength={3} maxLength={120} className={field} /></label>
                  <label className="grid gap-1 text-sm font-medium">Resumo<textarea name="summary" defaultValue={topic?.summary ?? ''} required minLength={20} maxLength={2500} rows={6} className={field} /></label>
                  <label className="grid gap-1 text-sm font-medium">Dica (opcional)<textarea name="tips" defaultValue={topic?.tips ?? ''} maxLength={600} rows={2} className={field} /></label>
                  <div><button type="submit" className="btn btn-primario">Guardar tema {position}</button></div>
                </FeedbackForm>
                {topic && (
                  <FeedbackForm action={removeTopic} successMessage="Tema removido." className="mt-2">
                    <input type="hidden" name="institutionId" value={inst.id} />
                    <input type="hidden" name="subjectId" value={subject.id} />
                    <input type="hidden" name="position" value={position} />
                    <button type="submit" className="btn btn-terciario text-erro-texto">Remover este tema</button>
                  </FeedbackForm>
                )}
              </section>
            )
          })}
        </div>
      )}
    </AdminPage>
  )
}
