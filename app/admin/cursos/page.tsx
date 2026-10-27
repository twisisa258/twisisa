import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, ArchiveRestore, GraduationCap, Pencil, Trash2 } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listInstitutions, type InstitutionRow } from '@/lib/institutions'
import { listSubjects, type SubjectRow } from '@/lib/subjects'
import { MAX_OPTIONS, MAX_PAPERS, PERIODS, VARIANTS, describeOptions, groupByCombo, listCourses, periodLabel, type CourseRow } from '@/lib/courses'
import { deleteCourse, saveCourse, setCourseActive } from './actions'
import { RowMenu } from '@/components/admin/row-menu'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminSearchBar, normalizeSearch } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cursos | Administração | Twisisa' }

const input = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'

function CourseForm({ editing, institutions, subjects, courses }: { editing: CourseRow | null; institutions: InstitutionRow[]; subjects: SubjectRow[]; courses: CourseRow[] }) {
  const units = [...new Set(courses.map((c) => c.unit).filter((u): u is string => Boolean(u)))]
  const campuses = [...new Set(courses.map((c) => c.campus).filter((u): u is string => Boolean(u)))]
  return (
    <FeedbackForm
      action={saveCourse}
      successMessage={editing ? 'Curso actualizado.' : 'Curso criado.'}
      errorMessage="Não foi possível guardar o curso. Tenta outra vez."
      resetOnSuccess={!editing}
      className="grid gap-5"
    >
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <label className="text-sm font-medium">Instituição *
        <select name="institution_id" required defaultValue={editing?.institutionId ?? (institutions.length === 1 ? institutions[0].id : '')} className={input}>
          <option value="" disabled>Escolhe a instituição</option>
          {institutions.map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Nome do curso *<input name="name" required minLength={2} maxLength={120} defaultValue={editing?.name ?? ''} className={input} placeholder="Ex.: Engenharia Civil" /></label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">Faculdade / escola<input name="unit" list="course-units" maxLength={120} defaultValue={editing?.unit ?? ''} className={input} placeholder="Ex.: Faculdade de Engenharia" /></label>
        <label className="text-sm font-medium">Local<input name="campus" list="course-campuses" maxLength={80} defaultValue={editing?.campus ?? ''} className={input} placeholder="Ex.: Cidade de Maputo" /></label>
      </div>
      <datalist id="course-units">{units.map((u) => <option key={u} value={u} />)}</datalist>
      <datalist id="course-campuses">{campuses.map((u) => <option key={u} value={u} />)}</datalist>

      <div>
        <p className="text-sm font-medium">Provas de admissão *</p>
        <p className="mt-0.5 text-xs text-[#737c75]">Cada opção é uma combinação de provas que dá acesso ao curso (o candidato escolhe uma). Os pesos de cada opção somam 100%.</p>
        <div className="mt-3 grid gap-3">
          {Array.from({ length: MAX_OPTIONS }).map((_, i) => {
            const option = editing?.options[i]
            return (
              <details key={i} open={i === 0 || Boolean(option)} className="rounded-2xl border border-[#e3e5dc] bg-[#fbfbf9] p-3 open:bg-white">
                <summary className="cursor-pointer text-sm font-semibold">Opção {i + 1}{option ? ` · ${periodLabel(option.period)}` : i === 0 ? '' : ' (opcional)'}</summary>
                <div className="mt-3 grid gap-3">
                  <label className="text-xs font-medium text-[#526057]">Período
                    <select name={`opt${i}_period`} defaultValue={option?.period ?? ''} className={input}>
                      <option value="">{i === 0 ? 'Escolhe' : 'Não usar esta opção'}</option>
                      {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </label>
                  {Array.from({ length: MAX_PAPERS }).map((__, j) => {
                    const paper = option?.papers[j]
                    return (
                      <div key={j} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_9rem_5rem]">
                        <label className="col-span-2 text-xs font-medium text-[#526057] sm:col-span-1">Prova {j + 1}
                          <select name={`opt${i}_p${j}_subject`} defaultValue={paper?.subjectId ?? ''} className={input}>
                            <option value="">{j === 0 ? 'Escolhe a disciplina' : '— sem prova'}</option>
                            {subjects.filter((s) => s.active || s.id === paper?.subjectId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-[#526057]">Variante
                          <select name={`opt${i}_p${j}_variant`} defaultValue={paper?.variant ?? ''} className={input}>
                            {VARIANTS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-[#526057]">Peso %
                          <input name={`opt${i}_p${j}_weight`} type="number" inputMode="numeric" min={1} max={100} step={1} defaultValue={paper?.weight ?? ''} className={input} placeholder="50" />
                        </label>
                      </div>
                    )
                  })}
                </div>
              </details>
            )
          })}
        </div>
      </div>
      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">{editing ? 'Guardar alterações' : 'Criar curso'}</button>
    </FeedbackForm>
  )
}

function ViewSwitch({ view, q }: { view: 'cursos' | 'provas'; q: string }) {
  const href = (target: string) => `/admin/cursos${target === 'provas' ? '?vista=provas' : ''}${q ? `${target === 'provas' ? '&' : '?'}q=${encodeURIComponent(q)}` : ''}`
  const item = (target: 'cursos' | 'provas', label: string) => (
    <Link href={href(target)} aria-current={view === target ? 'page' : undefined} className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${view === target ? 'bg-[#1d4d41] font-semibold text-white' : 'text-[#526057] hover:bg-white'}`}>{label}</Link>
  )
  return <div className="flex shrink-0 gap-1 self-start rounded-full border border-[#dfe3d9] bg-[#f3f4ef] p-1">{item('cursos', 'Por curso')}{item('provas', 'Por provas')}</div>
}

export default async function AdminCursosPage({ searchParams }: { searchParams: Promise<{ editar?: string; q?: string; vista?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)
  const view = params.vista === 'provas' ? 'provas' : 'cursos'

  let courses: CourseRow[] | null = null
  let institutions: InstitutionRow[] = []
  let subjects: SubjectRow[] = []
  try {
    ;[courses, institutions, subjects] = await Promise.all([listCourses(), listInstitutions(), listSubjects()])
  } catch (error) {
    console.error('[ADMIN CURSOS]', error)
  }

  const editing = courses?.find((item) => item.id === params.editar) ?? null
  const term = normalizeSearch(q)
  const visible = courses?.filter((item) => !term || normalizeSearch(`${item.name} ${item.unit ?? ''} ${item.institutionShortName}`).includes(term)) ?? []
  const groups = groupByCombo(visible)
  const countLabel = courses ? (q ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}` : view === 'provas' ? `${groups.length} combinações de provas` : `${courses.length} ${courses.length === 1 ? 'curso' : 'cursos'}`) : undefined

  return (
    <AdminPage>
      <AdminPageHeader
        icon={GraduationCap}
        title="Cursos"
        description="Os cursos de cada instituição e as provas de admissão que dão acesso a cada um."
        action={
          <FormModal label="Adicionar" title="Adicionar curso" description="Escolhe a instituição e as provas de admissão do curso.">
            <CourseForm editing={null} institutions={institutions} subjects={subjects} courses={courses ?? []} />
          </FormModal>
        }
      />
      {editing && (
        <RouteModal title={`Editar ${editing.name}`} closeHref="/admin/cursos">
          <CourseForm editing={editing} institutions={institutions} subjects={subjects} courses={courses ?? []} />
        </RouteModal>
      )}
      <ViewSwitch view={view} q={q} />
      <AdminSearchBar q={q} placeholder="Pesquisar curso ou faculdade" countLabel={countLabel} hidden={view === 'provas' ? { vista: 'provas' } : undefined} />

      <AdminListPanel>
        {courses === null ? (
          <AdminLoadError href="/admin/cursos" />
        ) : courses.length === 0 ? (
          <div className="m-4"><EmptyState title="Ainda sem cursos" description="Usa o botão Adicionar para criar o primeiro." /></div>
        ) : visible.length === 0 ? (
          <div className="m-4"><EmptyState title="Sem resultados" description={`Nenhum curso corresponde a “${q}”.`} actionLabel="Limpar pesquisa" actionHref="/admin/cursos" /></div>
        ) : view === 'provas' ? (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {groups.map((group) => (
              <li key={group.key} className="py-3">
                <p className="text-sm font-semibold leading-5">{group.key} <span className="font-normal text-[#737c75]">· {group.courses.length} {group.courses.length === 1 ? 'curso' : 'cursos'}</span></p>
                <p className="mt-1 text-xs leading-5 text-[#526057]">
                  {group.courses.map((c, index) => (
                    <span key={c.id}>{index > 0 && ', '}<Link href={`/admin/cursos?editar=${c.id}`} className="hover:text-[#1d4d41] hover:underline">{c.name}</Link>{c.periods.length === 1 && c.periods[0] === 'pos_laboral' ? ' (pós-laboral)' : ''}</span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {visible.map((item) => (
              <li key={item.id} className={`flex items-start gap-3 py-3 ${item.active ? '' : 'opacity-70'}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-5">{item.name}</p>
                  <p className="mt-0.5 text-xs text-[#737c75]">{[item.institutionShortName, item.unit, item.campus && item.campus !== 'Cidade de Maputo' ? item.campus : null].filter(Boolean).join(' · ')}</p>
                  {describeOptions(item.options).map((line) => (
                    <p key={line.periods} className="mt-1 text-xs leading-5 text-[#526057]"><span className="font-semibold text-[#1d4d41]">{line.periods}:</span> {line.text}</p>
                  ))}
                </div>
                {!item.active && <span className="shrink-0 rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[11px] font-semibold text-[#6b716c]">Arquivado</span>}
                <RowMenu
                  label={`Acções de ${item.name}`}
                  items={[
                    { label: 'Editar', icon: <Pencil size={16} />, href: `/admin/cursos?editar=${item.id}` },
                    item.active
                      ? { label: 'Arquivar', icon: <Archive size={16} />, action: setCourseActive, fields: { id: item.id, active: 'false' }, confirm: 'Arquivar' }
                      : { label: 'Activar', icon: <ArchiveRestore size={16} />, action: setCourseActive, fields: { id: item.id, active: 'true' } },
                    { label: 'Eliminar', icon: <Trash2 size={16} />, action: deleteCourse, fields: { id: item.id }, confirm: 'Eliminar', tone: 'danger' },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </AdminListPanel>
    </AdminPage>
  )
}
