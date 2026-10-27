import { redirect } from 'next/navigation'
import { ArrowDown, ArrowUp, Eye, EyeOff, Landmark, Pencil, Trash2 } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { INSTITUTION_KINDS, isVisibleToStudents, kindLabel, listInstitutions, type InstitutionRow } from '@/lib/institutions'
import { deleteInstitution, moveInstitution, saveInstitution, setInstitutionActive } from './actions'
import { RowMenu } from '@/components/admin/row-menu'
import { LogoUpload } from '@/components/admin/logo-upload'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminSearchBar, normalizeSearch } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { SelectField } from '@/components/ui/select-field'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Instituições | Administração | Twisisa' }

const input = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'

// Estado curto na linha; a explicação completa fica no título (hover/toque longo).
function visibility(item: InstitutionRow) {
  if (!item.active) return { label: 'Oculta', tone: 'bg-[#f1f1ee] text-[#6b716c]', hint: 'Oculta: não aparece aos alunos.' }
  if (item.contentCount > 0) return { label: 'Visível', tone: 'bg-[#e6f0e9] text-[#1d4d41]', hint: 'Visível aos alunos.' }
  if (item.showWhenEmpty) return { label: 'Em breve', tone: 'bg-[#f4eddb] text-[#805f19]', hint: 'Visível aos alunos com o aviso «Em breve».' }
  return { label: 'Sem conteúdo', tone: 'bg-[#f4eddb] text-[#805f19]', hint: 'Sem conteúdo: não aparece aos alunos. Edita e marca «Mostrar mesmo sem conteúdo».' }
}

function InstitutionForm({ editing }: { editing: InstitutionRow | null }) {
  return (
    <FeedbackForm
      action={saveInstitution}
      successMessage={editing ? 'Instituição actualizada.' : 'Instituição criada.'}
      errorMessage="Não foi possível guardar a instituição. Tenta outra vez."
      resetOnSuccess={!editing}
      className="grid gap-4"
    >
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        <label className="text-sm font-medium">Sigla *<input name="shortName" required minLength={2} maxLength={12} defaultValue={editing?.shortName ?? ''} className={`${input} uppercase`} placeholder="UEM" /></label>
        <div className="text-sm font-medium"><span>Tipo *</span><SelectField name="kind" label="Tipo" required defaultValue={editing?.kind ?? 'universidade'} requiredMessage="Selecciona o tipo." triggerClassName={input} options={INSTITUTION_KINDS.map((kind) => ({ value: kind.value, label: kind.label }))} /></div>
      </div>
      <label className="text-sm font-medium">Nome completo *<input name="name" required minLength={3} maxLength={160} defaultValue={editing?.name ?? ''} className={input} placeholder="Universidade Eduardo Mondlane" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Cidade<input name="city" maxLength={80} defaultValue={editing?.city ?? ''} className={input} placeholder="Maputo" /></label>
        <label className="text-sm font-medium">Província<input name="province" maxLength={80} defaultValue={editing?.province ?? ''} className={input} placeholder="Maputo Cidade" /></label>
      </div>
      <label className="text-sm font-medium">Descrição<textarea name="description" rows={3} maxLength={600} defaultValue={editing?.description ?? ''} className={input} placeholder="Texto curto que o aluno vê ao escolher (opcional)" /></label>
      <LogoUpload defaultUrl={editing?.logoUrl ?? ''} fallbackText={editing?.shortName ?? ''} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="showWhenEmpty" defaultChecked={editing?.showWhenEmpty ?? false} className="mt-0.5 size-4 accent-[#1d4d41]" />
        <span><span className="font-medium">Mostrar mesmo sem conteúdo</span><span className="block text-xs text-[#737c75]">Sem isto, só aparece ao aluno com pelo menos um conteúdo publicado. Com isto, aparece com «Em breve».</span></span>
      </label>
      <button type="submit" className="mt-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">{editing ? 'Guardar alterações' : 'Criar instituição'}</button>
    </FeedbackForm>
  )
}

export default async function AdminInstituicoesPage({ searchParams }: { searchParams: Promise<{ editar?: string; q?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const q = (params.q ?? '').trim().slice(0, 100)

  let items: InstitutionRow[] | null = null
  try {
    items = await listInstitutions()
  } catch (error) {
    console.error('[ADMIN INSTITUIÇÕES]', error)
  }

  const editing = items?.find((item) => item.id === params.editar) ?? null
  const term = normalizeSearch(q)
  const visible = items?.filter((item) => !term || normalizeSearch(`${item.shortName} ${item.name} ${item.city ?? ''} ${item.province ?? ''}`).includes(term)) ?? []
  // Subir/Descer só fazem sentido na lista completa.
  const canReorder = !term
  const countLabel = items ? (q ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}` : `${items.length} ${items.length === 1 ? 'instituição' : 'instituições'}`) : undefined

  return (
    <AdminPage>
      <AdminPageHeader
        icon={Landmark}
        title="Instituições"
        description="Instituições de admissão ao ensino superior que o aluno pode escolher."
        action={
          <FormModal label="Adicionar" title="Adicionar instituição" description="Aparece ao aluno quando tiver conteúdo ou for marcada como visível.">
            <InstitutionForm editing={null} />
          </FormModal>
        }
      />
      {editing && (
        <RouteModal title={`Editar ${editing.shortName}`} closeHref="/admin/instituicoes">
          <InstitutionForm editing={editing} />
        </RouteModal>
      )}
      <AdminSearchBar q={q} placeholder="Pesquisar sigla ou nome" countLabel={countLabel} />

      <AdminListPanel>
        {items === null ? (
          <AdminLoadError href="/admin/instituicoes" />
        ) : items.length === 0 ? (
          <div className="m-4"><EmptyState title="Ainda sem instituições" description="Usa o botão Adicionar. Lista prevista: UEM, UP, UJC, ACIPOL, ISCAM, ISCISA e IFP." /></div>
        ) : visible.length === 0 ? (
          <div className="m-4"><EmptyState title="Sem resultados" description={`Nenhuma instituição corresponde a “${q}”.`} actionLabel="Limpar pesquisa" actionHref="/admin/instituicoes" /></div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {visible.map((item) => {
              const state = visibility(item)
              const index = items.indexOf(item)
              return (
                <li key={item.id} className={`flex items-center gap-3 py-3 ${item.active ? '' : 'opacity-75'}`}>
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e3e5dc] bg-[#f3f4ef] text-[10px] font-bold text-[#1d4d41]">
                    {item.logoUrl ? <img src={item.logoUrl} alt="" className="size-full object-contain" /> : item.shortName}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-5">{item.shortName}<span className="font-normal text-[#737c75]"> · {item.name}</span></p>
                    <p className="mt-0.5 truncate text-xs text-[#737c75]">{kindLabel(item.kind)} · {item.contentCount} {item.contentCount === 1 ? 'conteúdo' : 'conteúdos'} · {item.studentCount} {item.studentCount === 1 ? 'aluno' : 'alunos'}</p>
                  </div>
                  <span title={state.hint} className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${state.tone}`}>{state.label}</span>
                  <RowMenu
                    label={`Acções de ${item.shortName}`}
                    items={[
                      { label: 'Editar', icon: <Pencil size={16} />, href: `/admin/instituicoes?editar=${item.id}` },
                      { label: 'Subir', icon: <ArrowUp size={16} />, action: moveInstitution, fields: { id: item.id, direction: 'up' }, disabled: !canReorder || index === 0 },
                      { label: 'Descer', icon: <ArrowDown size={16} />, action: moveInstitution, fields: { id: item.id, direction: 'down' }, disabled: !canReorder || index === items.length - 1 },
                      item.active
                        ? { label: 'Ocultar', icon: <EyeOff size={16} />, action: setInstitutionActive, fields: { id: item.id, active: 'false' }, confirm: 'Ocultar' }
                        : { label: 'Activar', icon: <Eye size={16} />, action: setInstitutionActive, fields: { id: item.id, active: 'true' } },
                      { label: 'Eliminar', icon: <Trash2 size={16} />, action: deleteInstitution, fields: { id: item.id }, confirm: 'Eliminar', tone: 'danger' },
                    ]}
                  />
                </li>
              )
            })}
          </ul>
        )}
        {items?.some((item) => item.active && !isVisibleToStudents(item)) && (
          <p className="shrink-0 border-t border-[#edf0e9] bg-[#fafbf8] px-4 py-2.5 text-xs leading-5 text-[#737c75] sm:px-5">«Sem conteúdo»: só aparece aos alunos com «Mostrar mesmo sem conteúdo» marcado.</p>
        )}
      </AdminListPanel>
    </AdminPage>
  )
}
