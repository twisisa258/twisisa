import Link from 'next/link'
import { Bell, ChevronRight, Lock, Settings } from 'lucide-react'
import { ProfileAccordion, type AccordionItem } from '@/components/aluno/perfil/profile-accordion'
import { PasswordForm } from '@/components/aluno/perfil/password-form'
import { LembretesSwitch } from '@/components/aluno/lembretes-switch'
import { EliminarConta } from '@/components/definicoes/eliminar-conta'
import { ModoTema } from '@/components/definicoes/modo-tema'
import { SugestoesSwitch } from '@/components/definicoes/sugestoes-switch'
import { SeloPlus } from '@/components/plano/selo-plus'
import { SignOutButton } from '@/components/sign-out-button'
import { StudentFeatureShell } from '@/components/student-feature-shell'
import { pool } from '@/lib/db'
import { PAGAMENTO_ATIVO } from '@/lib/plano'
import { sugestoesPlusAtivas } from '@/lib/plano-sugestoes'
import { requireStudent } from '@/lib/require-student'
import { hasPlus } from '@/lib/subscription'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Definições' }

function Grupo({ titulo, perigo = false, children }: { titulo: string; perigo?: boolean; children: React.ReactNode }) {
  return (
    <section className="df-grupo">
      <h2 className={perigo ? 'df-perigo-titulo' : undefined}>{titulo}</h2>
      {children}
    </section>
  )
}

export default async function DefinicoesPage() {
  const session = await requireStudent('/aluno/definicoes')
  const firstName = session.user.name.split(' ')[0]
  const plus = await hasPlus(session.user.id)
  const sugestoes = PAGAMENTO_ATIVO && !plus ? await sugestoesPlusAtivas(session.user.id) : false
  const prefs = (await pool.query(`SELECT email_enabled, push_enabled FROM notification_prefs WHERE user_id = $1`, [session.user.id]).catch(() => ({ rows: [] }))).rows[0]
  const remindersOn = prefs ? prefs.email_enabled === true || prefs.push_enabled === true : false

  const items: AccordionItem[] = [
    { id: 'lembretes', icon: <Bell />, title: 'Lembretes', summary: remindersOn ? 'Ligados' : 'Desligados', content: <LembretesSwitch initialOn={remindersOn} publicKey={process.env.VAPID_PUBLIC_KEY ?? ''} /> },
    { id: 'seguranca', icon: <Lock />, title: 'Segurança', summary: 'Palavra-passe', content: <PasswordForm /> },
  ]

  return (
    <StudentFeatureShell firstName={firstName} eyebrow="Conta" title="Definições" icon={Settings} hideBackLink>
      <div className="flex max-w-xl flex-col gap-6">
        <Grupo titulo="Aparência">
          <div className="df-lista">
            <div className="df-li"><div className="df-t"><b>Modo</b></div><ModoTema /></div>
          </div>
        </Grupo>

        <ProfileAccordion items={items} />

        <Grupo titulo="Plano">
          <div className="df-lista">
            <Link href="/aluno/plano" className="df-li">
              <div className="df-t"><b>Twisisa Plus</b><small>{plus ? 'Ativo' : 'Gratuito'}</small></div>
              {plus && <SeloPlus decorativo className="df-selo" />}
              <ChevronRight size={16} aria-hidden className="df-seta" />
            </Link>
            {PAGAMENTO_ATIVO && !plus && (
              <div className="df-li"><div className="df-t"><b>Mostrar sugestões do Plus</b><small>Ofertas ao entrares na conta</small></div><SugestoesSwitch initialOn={sugestoes} /></div>
            )}
          </div>
        </Grupo>

        <Grupo titulo="Sessão">
          <div className="df-lista">
            <div className="df-li"><div className="df-t"><b>Terminar sessão</b><small>Sais só neste aparelho</small></div><SignOutButton /></div>
          </div>
        </Grupo>

        <Grupo titulo="Zona de perigo" perigo>
          <EliminarConta plus={plus} />
        </Grupo>
      </div>
    </StudentFeatureShell>
  )
}
