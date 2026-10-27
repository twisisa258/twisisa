import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Copy, Pencil, Trash2 } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listVariants, VARIANT_DIFFICULTIES, variantDifficultyLabel, type VariantRow } from '@/lib/variants'
import { listSubjects, type SubjectRow } from '@/lib/subjects'
import { deleteVariant, moveVariant, saveVariant, setVariantActive } from './actions'
import { RowMenu } from '@/components/admin/row-menu'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminSearchBar, normalizeSearch } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { SelectField } from '@/components/ui/select-field'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Variantes | Administração | Twisisa' }

const input = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'

function VariantForm({ editing, subjects }: { editing: VariantRow | null; subjects: SubjectRow[] }) {
  const usable = subjects.filter((item) => item.active || item.id === editing?.subjectId)
  if (usable.length === 0) {
    return (
      <p className="text-sm text-[#68736a]">
        Ainda não há disciplinas. Cria primeiro uma em <Link href="/admin/disciplinas" className="font-semibold text-[#1d4d41] hover:underline">Disciplinas</Link>: cada variante pertence a uma disciplina.
      </p>
    )
  }
  return (
    <FeedbackForm
      action={saveVariant}
      successMessage={editing ? 'Variante atualizada.' : 'Variante criada.'}
      errorMessage="Não foi possível guardar a variante. Tenta outra vez."
      resetOnSuccess={!editing}
      className="grid gap-5"
    >
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <div className="text-sm font-medium">
        <span>Disciplina *</span>
        {editing ? (
          <>
            <input type="hidden" name="subject_id" value={editing.subjectId} />
            <p className={`${input} bg-[#f6f8f3] text-[#68736a]`}>{editing.subjectName}</p>
          </>
        ) : (
          <SelectField
            name="subject_id"
            label="Disciplina"
            required
            placeholder="Selecionar disciplina"
            requiredMessage="Seleciona a disciplina da variante."
            defaultValue=""
            triggerClassName={input}
            options={usable.map((item) => ({ value: item.id, label: item.name }))}
          />
        )}
      </div>
      <label className="text-sm font-medium">Nome da variante *<input name="name" required maxLength={60} defaultValue={editing?.name ?? ''} className={input} placeholder="Ex.: Matemática I" /></label>
      <div className="text-sm font-medium">
        <span>Dificuldade no exame</span>
        <SelectField name="difficulty" label="Dificuldade" triggerClassName={input} defaultValue={editing?.difficulty ?? 'media'} options={VARIANT_DIFFICULTIES.map((item) => ({ value: item.value, label: item.label }))} />
        <span className="mt-1 block text-xs font-normal text-[#737c75]">Pesa nos pontos (2 a 4) e na nota de 0 a 20: as questões de uma variante difícil valem mais. Ex.: Matemática I difícil, II média, III fácil.</span>
      </div>
      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">{editing ? 'Guardar alterações' : 'Criar variante'}</button>
    </FeedbackForm>
  )
}

export default async function AdminVariantesPage({ searchParams }: { searchParams: Promise<{ editar?: string; q?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)

  let variants: VariantRow[] | null = null
  let subjects: SubjectRow[] = []
  try {
    ;[variants, subjects] = await Promise.all([listVariants(), listSubjects()])
  } catch (error) {
    console.error('[ADMIN VARIANTES]', error)
  }

  const editing = variants?.find((item) => item.id === params.editar) ?? null
  const term = normalizeSearch(q)
  const visible = variants?.filter((item) => !term || normalizeSearch(`${item.name} ${item.subjectName}`).includes(term)) ?? []
  const canReorder = !term
  const countLabel = variants ? (q ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}` : `${variants.length} ${variants.length === 1 ? 'variante' : 'variantes'}`) : undefined

  return (
    <AdminPage>
      <AdminPageHeader
        icon={Copy}
        title="Variantes"
        description="Versões do exame de cada disciplina (ex.: Matemática I, II, III). O aluno escolhe a variante e só recebe questões dela."
        action={
          <FormModal label="Adicionar" title="Adicionar variante" description="Depois, escolhe-a ao criar ou editar as questões dessa disciplina.">
            <VariantForm editing={null} subjects={subjects} />
          </FormModal>
        }
      />
      {editing && (
        <RouteModal title={`Editar ${editing.name}`} closeHref="/admin/variantes">
          <VariantForm editing={editing} subjects={subjects} />
        </RouteModal>
      )}
      <AdminSearchBar q={q} placeholder="Pesquisar variante ou disciplina" countLabel={countLabel} />

      <AdminListPanel>
        {variants === null ? (
          <AdminLoadError href="/admin/variantes" />
        ) : variants.length === 0 ? (
          <div className="m-4"><EmptyState title="Ainda sem variantes" description="Só as disciplinas que têm versões do exame precisam delas. Usa o botão Adicionar." /></div>
        ) : visible.length === 0 ? (
          <div className="m-4"><EmptyState title="Sem resultados" description={`Nenhuma variante ou disciplina corresponde a “${q}”.`} actionLabel="Limpar pesquisa" actionHref="/admin/variantes" /></div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {visible.map((item) => {
              const siblings = variants?.filter((other) => other.subjectId === item.subjectId) ?? []
              const position = siblings.findIndex((other) => other.id === item.id)
              return (
                <li key={item.id} className={`flex items-center gap-3 py-3 ${item.active ? '' : 'opacity-70'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-5">{item.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[#737c75]">{item.subjectName} · {variantDifficultyLabel(item.difficulty)} · {item.inUse} {item.inUse === 1 ? 'questão' : 'questões'}</p>
                  </div>
                  {!item.active && <span className="shrink-0 rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[11px] font-semibold text-[#6b716c]">Arquivada</span>}
                  <RowMenu
                    label={`Ações de ${item.name}`}
                    items={[
                      { label: 'Editar', icon: <Pencil size={16} />, href: `/admin/variantes?editar=${item.id}` },
                      { label: 'Subir', icon: <ArrowUp size={16} />, action: moveVariant, fields: { id: item.id, direction: 'up' }, disabled: !canReorder || position <= 0 },
                      { label: 'Descer', icon: <ArrowDown size={16} />, action: moveVariant, fields: { id: item.id, direction: 'down' }, disabled: !canReorder || position === siblings.length - 1 },
                      item.active
                        ? { label: 'Arquivar', icon: <Archive size={16} />, action: setVariantActive, fields: { id: item.id, active: 'false' }, confirm: 'Arquivar' }
                        : { label: 'Ativar', icon: <ArchiveRestore size={16} />, action: setVariantActive, fields: { id: item.id, active: 'true' } },
                      { label: 'Eliminar', icon: <Trash2 size={16} />, action: deleteVariant, fields: { id: item.id }, confirm: 'Eliminar', tone: 'danger' },
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
