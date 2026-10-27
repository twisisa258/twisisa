import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ListTree, Pencil, Trash2 } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listTopics, type TopicRow } from '@/lib/classification'
import { listSubjects, type SubjectRow } from '@/lib/subjects'
import { deleteTopic, moveTopic, saveTopic, setTopicActive } from './actions'
import { RowMenu } from '@/components/admin/row-menu'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminSearchBar, normalizeSearch } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { SelectField } from '@/components/ui/select-field'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Temas | Administração | Twisisa' }

const input = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'

function TopicForm({ editing, subjects }: { editing: TopicRow | null; subjects: SubjectRow[] }) {
  // Só disciplinas activas (mais a do tema em edição, mesmo arquivada).
  const usable = subjects.filter((item) => item.active || item.id === editing?.subjectId)
  if (usable.length === 0) {
    return (
      <p className="text-sm text-[#68736a]">
        Ainda não há disciplinas. Cria primeiro uma em <Link href="/admin/disciplinas" className="font-semibold text-[#1d4d41] hover:underline">Disciplinas</Link>: cada tema pertence a uma disciplina.
      </p>
    )
  }
  return (
    <FeedbackForm
      action={saveTopic}
      successMessage={editing ? 'Tema actualizado.' : 'Tema criado.'}
      errorMessage="Não foi possível guardar o tema. Tenta outra vez."
      resetOnSuccess={!editing}
      className="grid gap-5"
    >
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <div className="text-sm font-medium">
        <span>Disciplina *</span>
        <SelectField
          name="subject_id"
          label="Disciplina"
          required
          placeholder="Seleccionar disciplina"
          requiredMessage="Selecciona a disciplina do tema."
          defaultValue={editing?.subjectId ?? ''}
          triggerClassName={input}
          options={usable.map((item) => ({ value: item.id, label: item.active ? item.name : `${item.name} (arquivada)` }))}
        />
      </div>
      <label className="text-sm font-medium">Nome do tema *<input name="name" required minLength={2} maxLength={120} defaultValue={editing?.name ?? ''} className={input} placeholder="Ex.: Funções quadráticas" /></label>
      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">{editing ? 'Guardar alterações' : 'Criar tema'}</button>
    </FeedbackForm>
  )
}

export default async function AdminTemasPage({ searchParams }: { searchParams: Promise<{ editar?: string; q?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)

  let topics: TopicRow[] | null = null
  let subjects: SubjectRow[] = []
  try {
    ;[topics, subjects] = await Promise.all([listTopics(), listSubjects()])
  } catch (error) {
    console.error('[ADMIN TEMAS]', error)
  }

  const scopesBySubject = new Map(subjects.map((item) => [item.id, item.scopes.map((scope) => scope.label).join(' · ')]))
  const editing = topics?.find((item) => item.id === params.editar) ?? null
  const term = normalizeSearch(q)
  const visible = topics?.filter((item) => !term || normalizeSearch(`${item.name} ${item.subjectName}`).includes(term)) ?? []
  // Subir/Descer só fazem sentido sem pesquisa e dentro da mesma disciplina.
  const canReorder = !term
  const countLabel = topics ? (q ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}` : `${topics.length} ${topics.length === 1 ? 'tema' : 'temas'}`) : undefined

  return (
    <AdminPage>
      <AdminPageHeader
        icon={ListTree}
        title="Temas"
        description="Cada tema pertence a uma disciplina e liga questões e materiais."
        action={
          <FormModal label="Adicionar" title="Adicionar tema" description="O tema herda as classes e instituições da disciplina.">
            <TopicForm editing={null} subjects={subjects} />
          </FormModal>
        }
      />
      {editing && (
        <RouteModal title={`Editar ${editing.name}`} closeHref="/admin/temas">
          <TopicForm editing={editing} subjects={subjects} />
        </RouteModal>
      )}
      <AdminSearchBar q={q} placeholder="Pesquisar tema ou disciplina" countLabel={countLabel} />

      <AdminListPanel>
        {topics === null ? (
          <AdminLoadError href="/admin/temas" />
        ) : topics.length === 0 ? (
          <div className="m-4"><EmptyState title="Ainda sem temas" description="Usa o botão Adicionar para criar o primeiro." /></div>
        ) : visible.length === 0 ? (
          <div className="m-4"><EmptyState title="Sem resultados" description={`Nenhum tema ou disciplina corresponde a “${q}”.`} actionLabel="Limpar pesquisa" actionHref="/admin/temas" /></div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {visible.map((item) => {
              const scopes = scopesBySubject.get(item.subjectId)
              const siblings = topics?.filter((other) => other.subjectId === item.subjectId) ?? []
              const position = siblings.findIndex((other) => other.id === item.id)
              return (
                <li key={item.id} className={`flex items-center gap-3 py-3 ${item.active ? '' : 'opacity-70'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-5">{item.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[#737c75]">{item.subjectName}{scopes ? ` · ${scopes}` : ''}</p>
                  </div>
                  {!item.active && <span className="shrink-0 rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[11px] font-semibold text-[#6b716c]">Arquivado</span>}
                  <RowMenu
                    label={`Acções de ${item.name}`}
                    items={[
                      { label: 'Editar', icon: <Pencil size={16} />, href: `/admin/temas?editar=${item.id}` },
                      { label: 'Subir', icon: <ArrowUp size={16} />, action: moveTopic, fields: { id: item.id, direction: 'up' }, disabled: !canReorder || position <= 0 },
                      { label: 'Descer', icon: <ArrowDown size={16} />, action: moveTopic, fields: { id: item.id, direction: 'down' }, disabled: !canReorder || position === siblings.length - 1 },
                      item.active
                        ? { label: 'Arquivar', icon: <Archive size={16} />, action: setTopicActive, fields: { id: item.id, active: 'false' }, confirm: 'Arquivar' }
                        : { label: 'Activar', icon: <ArchiveRestore size={16} />, action: setTopicActive, fields: { id: item.id, active: 'true' } },
                      { label: 'Eliminar', icon: <Trash2 size={16} />, action: deleteTopic, fields: { id: item.id }, confirm: 'Eliminar', tone: 'danger' },
                    ]}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </AdminListPanel>
    </AdminPage>
  )
}
