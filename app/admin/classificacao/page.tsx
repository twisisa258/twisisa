import { redirect } from 'next/navigation'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Pencil, Tags, Trash2 } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listCategories, listLevels, type ClassRow } from '@/lib/classification'
import { deleteClassItem, moveClassItem, saveClassItem, setClassItemActive } from './actions'
import { RowMenu } from '@/components/admin/row-menu'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader, AdminSearchBar, AdminTabs, normalizeSearch } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Classificação | Administração | Twisisa' }

const input = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'

const TABS = {
  categorias: { key: 'categorias', label: 'Categorias', kind: 'categoria', singular: 'categoria', plural: 'categorias', placeholder: 'Ex.: Exames anteriores' },
  niveis: { key: 'niveis', label: 'Níveis', kind: 'nivel', singular: 'nível', plural: 'níveis', placeholder: 'Ex.: 12.ª classe' },
} as const
type Tab = (typeof TABS)[keyof typeof TABS]

function ClassItemForm({ tab, editing }: { tab: Tab; editing: ClassRow | null }) {
  return (
    <FeedbackForm
      action={saveClassItem}
      successMessage={editing ? 'Alterações guardadas.' : 'Criado.'}
      errorMessage="Não foi possível guardar. Tenta outra vez."
      resetOnSuccess={!editing}
      className="grid gap-5"
    >
      <input type="hidden" name="kind" value={tab.kind} />
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <label className="text-sm font-medium">Nome *<input name="name" required minLength={2} maxLength={80} defaultValue={editing?.name ?? ''} className={input} placeholder={tab.placeholder} /></label>
      {tab.kind === 'categoria' && <label className="text-sm font-medium">Descrição<input name="description" maxLength={300} defaultValue={editing?.description ?? ''} className={input} placeholder="Texto curto (opcional)" /></label>}
      <p className="-mt-2 text-xs text-[#737c75]">{editing ? 'Para mudar a posição, usa Subir e Descer na lista.' : `Vai para o fim da lista; depois podes reorganizar com Subir e Descer.`}</p>
      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">{editing ? 'Guardar alterações' : `Criar ${tab.singular}`}</button>
    </FeedbackForm>
  )
}

export default async function AdminClassificacaoPage({ searchParams }: { searchParams: Promise<{ aba?: string; editar?: string; q?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams
  const tab: Tab = params.aba === 'niveis' ? TABS.niveis : TABS.categorias
  const q = (params.q ?? '').trim().slice(0, 100)

  let categories: ClassRow[] | null = null
  let levels: ClassRow[] | null = null
  try {
    ;[categories, levels] = await Promise.all([listCategories(), listLevels()])
  } catch (error) {
    console.error('[ADMIN CLASSIFICACAO]', error)
  }

  const items = tab.kind === 'categoria' ? categories : levels
  const base = `/admin/classificacao?aba=${tab.key}`
  const editing = items?.find((item) => item.id === params.editar) ?? null
  const term = normalizeSearch(q)
  const visible = items?.filter((item) => !term || normalizeSearch(item.name).includes(term)) ?? []
  const canReorder = !term
  const countLabel = items ? (q ? `${visible.length} ${visible.length === 1 ? 'resultado' : 'resultados'}` : `${items.length} ${items.length === 1 ? tab.singular : tab.plural}`) : undefined

  return (
    <AdminPage>
      <AdminPageHeader
        icon={Tags}
        title="Classificação"
        description="Categorias e níveis da biblioteca."
        action={
          <FormModal key={tab.key} label="Adicionar" title={`Adicionar ${tab.singular}`}>
            <ClassItemForm tab={tab} editing={null} />
          </FormModal>
        }
      />
      {editing && (
        <RouteModal title={`Editar ${editing.name}`} closeHref={base}>
          <ClassItemForm tab={tab} editing={editing} />
        </RouteModal>
      )}
      <AdminTabs
        label="Tipo de classificação"
        tabs={[
          { href: '/admin/classificacao?aba=categorias', label: TABS.categorias.label, count: categories?.length, active: tab.key === 'categorias' },
          { href: '/admin/classificacao?aba=niveis', label: TABS.niveis.label, count: levels?.length, active: tab.key === 'niveis' },
        ]}
      />
      <AdminSearchBar q={q} placeholder={`Pesquisar ${tab.singular}`} countLabel={countLabel} hidden={{ aba: tab.key }} />

      <AdminListPanel>
        {items === null ? (
          <AdminLoadError href={base} />
        ) : items.length === 0 ? (
          <div className="m-4"><EmptyState title={`Ainda sem ${tab.plural}`} description="Usa o botão Adicionar para criar a primeira." /></div>
        ) : visible.length === 0 ? (
          <div className="m-4"><EmptyState title="Sem resultados" description={`Nada corresponde a “${q}”.`} actionLabel="Limpar pesquisa" actionHref={base} /></div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {visible.map((item) => {
              const index = items.indexOf(item)
              return (
                <li key={item.id} className={`flex items-center gap-3 py-3 ${item.active ? '' : 'opacity-70'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-5">{item.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[#737c75]">{item.inUse} {item.inUse === 1 ? 'material' : 'materiais'}{item.description ? ` · ${item.description}` : ''}</p>
                  </div>
                  {!item.active && <span className="shrink-0 rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[11px] font-semibold text-[#6b716c]">Arquivado</span>}
                  <RowMenu
                    label={`Acções de ${item.name}`}
                    items={[
                      { label: 'Editar', icon: <Pencil size={16} />, href: `${base}&editar=${item.id}` },
                      { label: 'Subir', icon: <ArrowUp size={16} />, action: moveClassItem, fields: { kind: tab.kind, id: item.id, direction: 'up' }, disabled: !canReorder || index === 0 },
                      { label: 'Descer', icon: <ArrowDown size={16} />, action: moveClassItem, fields: { kind: tab.kind, id: item.id, direction: 'down' }, disabled: !canReorder || index === items.length - 1 },
                      item.active
                        ? { label: 'Arquivar', icon: <Archive size={16} />, action: setClassItemActive, fields: { kind: tab.kind, id: item.id, active: 'false' }, confirm: 'Arquivar' }
                        : { label: 'Activar', icon: <ArchiveRestore size={16} />, action: setClassItemActive, fields: { kind: tab.kind, id: item.id, active: 'true' } },
                      { label: 'Eliminar', icon: <Trash2 size={16} />, action: deleteClassItem, fields: { kind: tab.kind, id: item.id }, confirm: 'Eliminar', tone: 'danger' },
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
