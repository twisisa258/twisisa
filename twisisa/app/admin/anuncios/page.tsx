import { redirect } from 'next/navigation'
import { Eye, EyeOff, Megaphone, Pencil, Trash2 } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { ANUNCIO_TONS, ANUNCIO_TOM_LABEL, listAnuncios, type AnuncioAdmin } from '@/lib/anuncios'
import { deleteAnuncio, saveAnuncio, setAnuncioActive } from './actions'
import { AnuncioCard } from '@/components/anuncios/anuncio-card'
import { RowMenu } from '@/components/admin/row-menu'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { SelectField } from '@/components/ui/select-field'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Anúncios | Administração | Twisisa' }

const input = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/10'
const PERCURSOS = [
  { value: '', label: 'Todos os percursos' },
  { value: '10', label: '10ª classe' },
  { value: '12', label: '12ª classe' },
  { value: 'admissao', label: 'Admissão' },
]
const percursoLabel = (track: string | null) => PERCURSOS.find((item) => item.value === (track ?? ''))?.label ?? 'Todos os percursos'

// A data de fim guarda-se como «começo do dia seguinte» em Maputo; no formulário volta a ser o último dia.
const fimComoData = (fim: Date | null) => (fim ? new Date(fim.getTime() + 2 * 3600_000 - 86_400_000).toISOString().slice(0, 10) : '')
const dataCurta = (fim: Date) => fimComoData(fim).split('-').reverse().join('/')

function estado(item: AnuncioAdmin) {
  if (!item.active) return { label: 'Oculto', tone: 'bg-[#f1f1ee] text-[#6b716c]' }
  if (item.endsAt && item.endsAt.getTime() <= Date.now()) return { label: 'Terminado', tone: 'bg-[#f1f1ee] text-[#6b716c]' }
  if (item.startsAt.getTime() > Date.now()) return { label: 'Agendado', tone: 'bg-[#f4eddb] text-aviso-texto' }
  return { label: 'No ar', tone: 'bg-[#e6f0e9] text-marca' }
}

function AnuncioForm({ editing }: { editing: AnuncioAdmin | null }) {
  return (
    <FeedbackForm action={saveAnuncio} successMessage={editing ? 'Anúncio atualizado.' : 'Anúncio publicado.'} errorMessage="Não foi possível guardar o anúncio. Tenta outra vez." resetOnSuccess={!editing} className="grid gap-4">
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <label className="text-sm font-medium">Título *<input name="title" required minLength={3} maxLength={80} defaultValue={editing?.title ?? ''} className={input} placeholder="Exames da UEM: datas confirmadas" /></label>
      <label className="text-sm font-medium">Texto<textarea name="body" rows={3} maxLength={220} defaultValue={editing?.body ?? ''} className={input} placeholder="Uma ou duas frases. O aluno lê isto no telemóvel." /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm font-medium"><span>Tipo *</span><SelectField name="tone" label="Tipo" required defaultValue={editing?.tone ?? 'info'} triggerClassName={input} options={ANUNCIO_TONS.map((tom) => ({ value: tom, label: ANUNCIO_TOM_LABEL[tom] }))} /></div>
        <div className="text-sm font-medium"><span>Para quem</span><SelectField name="track" label="Percurso" defaultValue={editing?.track ?? ''} triggerClassName={input} options={PERCURSOS} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Texto do botão<input name="ctaLabel" maxLength={24} defaultValue={editing?.ctaLabel ?? ''} className={input} placeholder="Ver datas" /></label>
        <label className="text-sm font-medium">Ligação do botão<input name="ctaHref" maxLength={300} defaultValue={editing?.ctaHref ?? ''} className={input} placeholder="/aluno/simulador ou https://…" /></label>
      </div>
      <label className="text-sm font-medium">Mostrar até<input type="date" name="endsOn" defaultValue={fimComoData(editing?.endsAt ?? null)} className={input} /><span className="mt-1 block text-xs font-normal text-texto-2">Vazio = fica até o ocultares. O anúncio vale até ao fim desse dia (hora de Maputo).</span></label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="featured" defaultChecked={editing?.featured ?? false} className="mt-0.5 size-4 accent-marca" />
        <span><span className="font-medium">Destacar</span><span className="block text-xs text-texto-2">Cartão escuro e grande, com botão em destaque. Usa só para o que é mesmo importante.</span></span>
      </label>
      <button type="submit" className="btn btn-primario mt-1">{editing ? 'Guardar alterações' : 'Publicar anúncio'}</button>
    </FeedbackForm>
  )
}

export default async function AdminAnunciosPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams

  let items: AnuncioAdmin[] | null = null
  try {
    items = await listAnuncios()
  } catch (error) {
    console.error('[ADMIN ANÚNCIOS]', error)
  }
  const editing = items?.find((item) => item.id === params.editar) ?? null

  return (
    <AdminPage>
      <AdminPageHeader
        icon={Megaphone}
        title="Anúncios"
        description="Cartões que os alunos veem no painel: novidades, eventos e avisos."
        action={
          <FormModal label="Novo anúncio" title="Novo anúncio" description="Aparece no painel do aluno assim que o publicares.">
            <AnuncioForm editing={null} />
          </FormModal>
        }
      />
      {editing && (
        <RouteModal title="Editar anúncio" closeHref="/admin/anuncios">
          <AnuncioForm editing={editing} />
        </RouteModal>
      )}
      <AdminListPanel>
        {items === null ? (
          <AdminLoadError href="/admin/anuncios" />
        ) : items.length === 0 ? (
          <div className="m-4"><EmptyState icon={Megaphone} title="Ainda sem anúncios" description="Usa «Novo anúncio» para falar com os alunos no painel deles." /></div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-4 sm:px-5">
            {items.map((item) => {
              const st = estado(item)
              return (
                <li key={item.id} className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <AnuncioCard anuncio={item} />
                    </div>
                    <RowMenu
                      label={`Ações de ${item.title}`}
                      items={[
                        { label: 'Editar', icon: <Pencil size={16} />, href: `/admin/anuncios?editar=${item.id}` },
                        item.active
                          ? { label: 'Ocultar', icon: <EyeOff size={16} />, action: setAnuncioActive, fields: { id: item.id, active: 'false' }, confirm: 'Ocultar' }
                          : { label: 'Mostrar', icon: <Eye size={16} />, action: setAnuncioActive, fields: { id: item.id, active: 'true' } },
                        { label: 'Eliminar', icon: <Trash2 size={16} />, action: deleteAnuncio, fields: { id: item.id }, confirm: 'Eliminar', tone: 'danger' },
                      ]}
                    />
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.tone}`}>{st.label}</span>
                    <span>{percursoLabel(item.track)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.endsAt ? `até ${dataCurta(item.endsAt)}` : 'sem data de fim'}</span>
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </AdminListPanel>
    </AdminPage>
  )
}
