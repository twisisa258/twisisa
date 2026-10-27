import { redirect } from 'next/navigation'
import { Ban, Mail, Users } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { listInvites, listStaff, type InviteListItem } from '@/lib/staff-invites'
import { ROLE_LABEL } from '@/lib/staff-shared'
import { relativeTime } from '@/lib/relative-time'
import { cancelInvite, removeMember } from './actions'
import { InviteForm, RenewPanel } from '@/components/admin/invite-panels'
import { RowMenu } from '@/components/admin/row-menu'
import { FormModal, RouteModal } from '@/components/admin/form-modal'
import { AdminLoadError, AdminPage, AdminPageHeader } from '@/components/admin/page-parts'
import { EmptyState } from '@/components/states/empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Equipa | Administração | Twisisa' }

const STEP_LABEL = { carta: 'Carta aberta', tarefa: 'A ler a tarefa', conta: 'A criar a conta', aguardar: 'A aguardar verificação' } as const
function statusOf(invite: InviteListItem) {
  switch (invite.status) {
    case 'pendente': return { label: 'Enviada', tone: 'bg-[#eef0ea] text-[#5f6d63]' }
    case 'aberta': return { label: STEP_LABEL[invite.step], tone: 'bg-[#e6f0e9] text-[#1d4d41]' }
    case 'concluido': return { label: 'Concluída', tone: 'bg-[#e6f0e9] text-[#1d4d41]' }
    case 'bloqueado': return { label: 'Bloqueada (código errado)', tone: 'bg-[#fbeeee] text-[#9a3030]' }
    case 'expirado': return { label: 'Expirada', tone: 'bg-[#f4eddb] text-[#805f19]' }
    default: return { label: 'Revogada', tone: 'bg-[#eef0ea] text-[#5f6d63]' }
  }
}
const input = 'mt-1 h-11 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 text-sm outline-none focus:border-[#1d4d41]'

export default async function EquipaPage({ searchParams }: { searchParams: Promise<{ reenviar?: string }> }) {
  const { reenviar } = await searchParams
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')
  const data = await Promise.all([listStaff(), listInvites()]).catch((error) => {
    console.error('[ADMIN EQUIPA]', error)
    return null
  })
  const [staff, invites] = data ?? [[], []]
  const history = invites.filter((invite) => invite.status !== 'concluido')
  const renewing = reenviar ? invites.find((invite) => invite.id === reenviar && invite.status !== 'concluido' && invite.status !== 'revogado') : undefined

  return (
    <AdminPage>
      <AdminPageHeader
        icon={Users}
        title="Equipa"
        description="Convida revisores por carta. Só podem rever questões; tu manténs o controlo total e podes retirar o acesso quando quiseres."
        action={
          <FormModal label="Convidar revisor" title="Convidar revisor" description="Cria a carta e entrega o link e o código à pessoa, por WhatsApp ou e-mail.">
            <InviteForm />
          </FormModal>
        }
      />

      {renewing && (
        <RouteModal title="Nova carta" description={renewing.email} closeHref="/admin/equipa">
          <RenewPanel id={renewing.id} name={renewing.name} />
        </RouteModal>
      )}

      {data === null ? (
        <AdminLoadError href="/admin/equipa" />
      ) : (
        <div className="grid min-h-0 gap-6">
          <section aria-label="Membros da equipa">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7d857e]">Com acesso ({staff.length})</h2>
            {staff.length === 0 ? (
              <div className="mt-2"><EmptyState title="Ainda não há revisores" description="Usa «Convidar revisor». Quando a pessoa concluir a carta, aparece aqui." /></div>
            ) : (
              <ul className="mt-2 divide-y divide-[#edf0e9] overflow-hidden rounded-3xl border border-[#e3e5dc] bg-white">
                {staff.map((member) => (
                  <li key={member.userId} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#d8e4dc] text-sm font-semibold text-[#1d4d41]">{member.name.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{member.name}</p>
                      <p className="truncate text-xs text-[#737c75]">{member.email} · {ROLE_LABEL[member.role]} · desde {relativeTime(new Date(member.since))}</p>
                    </div>
                    <RowMenu label="Ações do membro" items={[{ label: 'Remover acesso', icon: <Ban size={16} />, action: removeMember, fields: { userId: member.userId }, confirm: 'Remover', tone: 'danger' as const }]} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {history.length > 0 && (
            <section aria-label="Cartas enviadas">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7d857e]">Cartas enviadas</h2>
              <ul className="mt-2 divide-y divide-[#edf0e9] overflow-hidden rounded-3xl border border-[#e3e5dc] bg-white">
                {history.map((invite) => {
                  const state = statusOf(invite)
                  const active = invite.status === 'pendente' || invite.status === 'aberta' || invite.status === 'bloqueado' || invite.status === 'expirado'
                  return (
                    <li key={invite.id} className="flex items-center gap-3 px-4 py-3.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f1f3ee] text-[#7d857e]"><Mail size={16} aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{invite.name} <span className="font-normal text-[#737c75]">· {invite.email}</span></p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#737c75]">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${state.tone}`}>{state.label}</span>
                          enviada {relativeTime(new Date(invite.createdAt))}
                        </p>
                      </div>
                      {active && (
                        <RowMenu
                          label="Ações da carta"
                          items={[
                            { label: invite.status === 'bloqueado' ? 'Desbloquear (nova carta)' : 'Nova carta (novo link e código)', icon: <Mail size={16} />, href: `/admin/equipa?reenviar=${invite.id}` },
                            { label: 'Revogar', icon: <Ban size={16} />, action: cancelInvite, fields: { id: invite.id }, confirm: 'Revogar', tone: 'danger' as const },
                          ]}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </AdminPage>
  )
}
