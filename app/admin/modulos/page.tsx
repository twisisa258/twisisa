import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, LayoutGrid } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { EXAM_MODULES, MODULE_STATUSES, getModuleSettings, isModuleKey, type ModuleSettings, type ModuleStatus } from '@/lib/exam-modules'
import { TRACKS } from '@/lib/percurso'
import { saveModule } from './actions'
import { RouteModal } from '@/components/admin/form-modal'
import { AdminListPanel, AdminLoadError, AdminPage, AdminPageHeader } from '@/components/admin/page-parts'
import { FeedbackForm } from '@/components/feedback-form'
import { SelectField } from '@/components/ui/select-field'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Módulos | Administração | Twisisa' }

const field = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'
const fmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })

const SHORT: Record<string, string> = { '10': '10ª', '12': '12ª', admissao: 'Admissão' }
const FULL: Record<string, string> = { '10': '10ª classe', '12': '12ª classe', admissao: 'Admissão ao ensino superior' }
const TONE: Record<ModuleStatus, string> = {
  active: 'bg-[#e6f0e9] text-[#1d4d41]',
  soon: 'bg-[#f4eddb] text-[#805f19]',
  hidden: 'bg-[#f1f1ee] text-[#6b716c]',
}
const statusLabel = (status: ModuleStatus) => MODULE_STATUSES.find((item) => item.value === status)?.label ?? status

function activeNovelty(settings: ModuleSettings, key: (typeof EXAM_MODULES)[number]['key']) {
  const now = Date.now()
  return TRACKS.map((track) => settings[key][track.value].noveltyUntil).find((date) => date && date.getTime() > now) ?? null
}

export default async function AdminModulosPage({ searchParams }: { searchParams: Promise<{ modulo?: string }> }) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const params = await searchParams

  let settings: ModuleSettings | null = null
  try {
    settings = await getModuleSettings()
  } catch (error) {
    console.error('[ADMIN MODULOS]', error)
  }

  const editing = settings && isModuleKey(params.modulo) ? EXAM_MODULES.find((item) => item.key === params.modulo) ?? null : null

  return (
    <AdminPage>
      <AdminPageHeader icon={LayoutGrid} title="Módulos" description="Estado de cada módulo da página Exames, por percurso." />

      {settings && editing && (
        <RouteModal title={editing.label} closeHref="/admin/modulos">
          <FeedbackForm action={saveModule} successMessage="Módulo guardado." errorMessage="Não foi possível guardar o módulo. Tenta outra vez." className="grid gap-5">
            <input type="hidden" name="module_key" value={editing.key} />
            {TRACKS.map((track) => (
              <div key={track.value} className="text-sm font-medium">
                <span>{FULL[track.value] ?? track.label}</span>
                <SelectField
                  name={`status_${track.value}`}
                  label={FULL[track.value] ?? track.label}
                  defaultValue={settings![editing.key][track.value].status}
                  triggerClassName={field}
                  options={MODULE_STATUSES.filter((status) => status.value !== 'active' || editing.ready).map((status) => ({ value: status.value, label: status.label }))}
                />
              </div>
            ))}
            {(() => {
              const until = activeNovelty(settings!, editing.key)
              return (
                <div className="text-sm font-medium">
                  <span>Etiqueta «Novidade»</span>
                  <SelectField
                    name="novelty"
                    label="Etiqueta Novidade"
                    defaultValue={until ? 'keep' : ''}
                    triggerClassName={field}
                    options={[
                      { value: '', label: 'Sem etiqueta' },
                      ...(until ? [{ value: 'keep', label: `Manter (até ${fmt.format(until)})` }] : []),
                      { value: '7', label: '7 dias' },
                      { value: '30', label: '30 dias' },
                    ]}
                  />
                </div>
              )
            })()}
            <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">Guardar</button>
          </FeedbackForm>
        </RouteModal>
      )}

      <AdminListPanel>
        {settings === null ? (
          <AdminLoadError href="/admin/modulos" />
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-[#edf0e9] overflow-y-auto px-2 sm:px-3">
            {EXAM_MODULES.map((item) => {
              const isNew = !!activeNovelty(settings!, item.key)
              return (
                <li key={item.key}>
                  <Link href={`/admin/modulos?modulo=${item.key}`} aria-label={`Editar ${item.label}`} className="flex items-center gap-3 rounded-xl px-2 py-3.5 hover:bg-[#f7f8f4] sm:px-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold leading-5">
                        <span className="truncate">{item.label}</span>
                        {isNew && <span className="shrink-0 rounded-full bg-[#1d4d41] px-2 py-0.5 text-[10px] font-semibold text-white">Novidade</span>}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {TRACKS.map((track) => {
                          const status = settings![item.key][track.value].status
                          return <span key={track.value} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE[status]}`}>{SHORT[track.value] ?? track.label} · {statusLabel(status)}</span>
                        })}
                      </div>
                    </div>
                    <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-[#9aa39c]" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </AdminListPanel>
    </AdminPage>
  )
}
