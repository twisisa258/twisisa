import { redirect } from 'next/navigation'
import { Archive, ArchiveRestore, Layers, Pencil, Trash2 } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listInstitutions, type InstitutionRow } from '@/lib/institutions'
import { listSubjects, type SubjectRow } from '@/lib/subjects'
import { deleteSubject, saveSubject, setSubjectActive } from './actions'
import { RowMenu } from '@/components/admin/row-menu'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminSearchBar, normalizeSearch } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Disciplinas | Administração | Twisisa' }

const input = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'

function Chip({ value, label, checked }: { value: string; label: string; checked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name="scope" value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-flex min-h-9 items-center rounded-full border border-[#dfe3d9] bg-white px-3.5 text-sm text-[#526057] transition peer-checked:border-[#1d4d41] peer-checked:bg-[#1d4d41] peer-checked:font-semibold peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#1d4d41]/30">{label}</span>
    </label>
  )
}

function SubjectForm({ editing, institutions }: { editing: SubjectRow | null; institutions: InstitutionRow[] }) {
  const selected = new Set(editing?.scopes.map((scope) => scope.key) ?? [])
  return (
    <FeedbackForm
      action={saveSubject}
      successMessage={editing ? 'Disciplina actualizada.' : 'Disciplina criada.'}
      errorMessage="Não foi possível guardar a disciplina. Tenta outra vez."
      resetOnSuccess={!editing}
      className="grid gap-5"
    >
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <label className="text-sm font-medium">Nome *<input name="name" required minLength={2} maxLength={100} defaultValue={editing?.name ?? ''} className={input} placeholder="Ex.: Matemática" /></label>
      <fieldset>
        <legend className="text-sm font-medium">Classes</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip value="10" label="10ª classe" checked={selected.has('10')} />
          <Chip value="12" label="12ª classe" checked={selected.has('12')} />
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">Instituições (admissão)</legend>
        {institutions.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {institutions.map((item) => <Chip key={item.id} value={`inst:${item.id}`} label={item.shortName} checked={selected.has(`inst:${item.id}`)} />)}
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#737c75]">Ainda não há instituições. Cria-as primeiro em Instituições.</p>
        )}
      </fieldset>
      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">{editing ? 'Guardar alterações' : 'Criar disciplina'}</button>
    </FeedbackForm>
  )
}

export default async function AdminDisciplinasPage({ searchParams }: { searchParams: Promise<{ editar?: string; q?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)

  let subjects: SubjectRow[] | null = null
  let institutions: InstitutionRow[] = []
  try {
    ;[subjects, institutions] = await Promise.all([listSubjects(), listInstitutions()])
  } catch (error) {
    console.error('[ADMIN DISCIPLINAS]', error)
  }

  const editing = subjects?.find((item) => item.id === params.editar) ?? null
  const term = normalizeSearch(q)
  const visible = subjects?.filter((item) => !term || normalizeSearch(item.name).includes(term)) ?? []
  const countLabel = subjects ? (q ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}` : `${subjects.length} ${subjects.length === 1 ? 'disciplina' : 'disciplinas'}`) : undefined

  return (
    <AdminPage>
      <AdminPageHeader
        icon={Layers}
        title="Disciplinas"
        description="Em que classes e instituições cada disciplina existe."
        action={
          <FormModal label="Adicionar" title="Adicionar disciplina" description="Escolhe as classes e instituições em que existe.">
            <SubjectForm editing={null} institutions={institutions} />
          </FormModal>
        }
      />
      {editing && (
        <RouteModal title={`Editar ${editing.name}`} closeHref="/admin/disciplinas">
          <SubjectForm editing={editing} institutions={institutions} />
        </RouteModal>
      )}
      <AdminSearchBar q={q} placeholder="Pesquisar disciplina" countLabel={countLabel} />

      <AdminListPanel>
        {subjects === null ? (
          <AdminLoadError href="/admin/disciplinas" />
        ) : subjects.length === 0 ? (
          <div className="m-4"><EmptyState title="Ainda sem disciplinas" description="Usa o botão Adicionar para criar a primeira." /></div>
        ) : visible.length === 0 ? (
          <div className="m-4"><EmptyState title="Sem resultados" description={`Nenhuma disciplina corresponde a “${q}”.`} actionLabel="Limpar pesquisa" actionHref="/admin/disciplinas" /></div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {visible.map((item) => (
              <li key={item.id} className={`flex items-center gap-3 py-3 ${item.active ? '' : 'opacity-70'}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-5">{item.name}</p>
                  <p className="mt-0.5 truncate text-xs text-[#737c75]">
                    {item.scopes.length ? item.scopes.map((scope) => scope.label).join(' · ') : <span className="text-[#805f19]">Sem âmbito</span>}
                    {` · ${item.materialCount} ${item.materialCount === 1 ? 'material' : 'materiais'} · ${item.topicCount} ${item.topicCount === 1 ? 'tema' : 'temas'}`}
                  </p>
                </div>
                {!item.active && <span className="shrink-0 rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[11px] font-semibold text-[#6b716c]">Arquivada</span>}
                <RowMenu
                  label={`Acções de ${item.name}`}
                  items={[
                    { label: 'Editar', icon: <Pencil size={16} />, href: `/admin/disciplinas?editar=${item.id}` },
                    item.active
                      ? { label: 'Arquivar', icon: <Archive size={16} />, action: setSubjectActive, fields: { id: item.id, active: 'false' }, confirm: 'Arquivar' }
                      : { label: 'Activar', icon: <ArchiveRestore size={16} />, action: setSubjectActive, fields: { id: item.id, active: 'true' } },
                    { label: 'Eliminar', icon: <Trash2 size={16} />, action: deleteSubject, fields: { id: item.id }, confirm: 'Eliminar', tone: 'danger' },
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
