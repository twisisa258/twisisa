import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CircleAlert, CircleCheck, GraduationCap, Layers, Lock, MessageCircle, Pencil, TrendingUp, Users, Zap, type LucideIcon } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { groqKeyConfigured } from '@/lib/groq'
import { getJonasSettings, getJonasUsage, resolveRuntime, type JonasRuntime, type JonasSettings, type JonasUsage, type ModelSource } from '@/lib/jonas-settings'
import { AdminLoadError } from '@/components/admin/page-parts'
import { JonasTestButton } from '@/components/admin/jonas-test-button'
import { CardTitle, JonasShell, jonasCard } from '@/components/admin/jonas-shell'
import { testJonasConnection } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Jonas | Administração | Twisisa' }

const nf = new Intl.NumberFormat('pt-PT')
const fmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const good = 'bg-[#e6f0e9] text-[#1d4d41]'
const warn = 'bg-[#f4eddb] text-[#805f19]'
const bad = 'bg-[#f7e4e4] text-[#8a2f2f]'

const SOURCE_LABEL: Record<ModelSource, string> = {
  admin: 'Escolhidos neste painel',
  env: 'Vêm da variável GROQ_MODEL do servidor',
  default: 'Lista predefinida (nenhum modelo escolhido)',
}
const EFFORT_LABEL = { low: 'Baixo', medium: 'Médio', high: 'Alto' } as const

function Badge({ tone, icon: Icon, children }: { tone: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      <Icon size={13} aria-hidden="true" />
      {children}
    </span>
  )
}

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#e3e5dc] bg-white p-3.5 sm:p-4">
      <Icon size={18} aria-hidden="true" className="text-[#6f9a88]" />
      <p className="mt-2 text-xl font-semibold tracking-tight text-[#1d4d41] sm:text-2xl">{nf.format(value)}</p>
      <p className="mt-0.5 text-xs leading-4 text-[#737c75]">{label}</p>
    </div>
  )
}

export default async function AdminJonasPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')

  let data: { settings: JonasSettings; runtime: JonasRuntime; usage: JonasUsage | null } | null = null
  try {
    const settings = await getJonasSettings({ fresh: true })
    // O uso depende das tabelas do Jonas (0019): se faltarem, o resto da página continua a funcionar.
    const usage = await getJonasUsage().catch((error) => {
      console.error('[ADMIN JONAS] uso', error)
      return null
    })
    data = { settings, runtime: resolveRuntime(settings), usage }
  } catch (error) {
    console.error('[ADMIN JONAS]', error)
  }
  const keyOk = groqKeyConfigured()

  return (
    <JonasShell active="estado">
      {data === null ? (
        <div className="rounded-2xl border border-[#e3e5dc] bg-white">
          <AdminLoadError href="/admin/jonas" />
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2">
            <div className={jonasCard}>
              <CardTitle icon={Lock} badge={keyOk ? <Badge tone={good} icon={CircleCheck}>Configurada</Badge> : <Badge tone={bad} icon={CircleAlert}>Em falta</Badge>}>
                Chave da Groq
              </CardTitle>
              <p className="mt-3 text-sm leading-6 text-[#5f6d63]">
                {keyOk
                  ? 'Guardada só no servidor (variável GROQ_API_KEY). Nunca vai para a base de dados nem para o navegador.'
                  : 'Define GROQ_API_KEY no Vercel (Settings, Environment Variables) e faz um novo deploy. Sem ela, o Jonas responde que não está disponível.'}
              </p>
            </div>

            <div className={jonasCard}>
              <CardTitle icon={Zap} badge={data.settings.enabled ? <Badge tone={good} icon={CircleCheck}>Ligado</Badge> : <Badge tone={warn} icon={CircleAlert}>Em pausa</Badge>}>
                Jonas para os alunos
              </CardTitle>
              <p className="mt-3 text-sm leading-6 text-[#5f6d63]">
                {data.settings.enabled
                  ? 'Os alunos podem conversar e pedir explicações no Simulador.'
                  : 'Os alunos veem um aviso de pausa. No Simulador continua a aparecer a explicação da equipa, quando existe.'}
              </p>
            </div>
          </section>

          <section className={jonasCard}>
            <CardTitle
              icon={Layers}
              badge={
                <Link href="/admin/jonas/modelo" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[#1d4d41] hover:bg-[#f1f4ef]">
                  <Pencil size={14} aria-hidden="true" />
                  Alterar
                </Link>
              }
            >
              Modelos em uso
            </CardTitle>
            <ol className="mt-3 divide-y divide-[#edf0e9] rounded-xl border border-[#e3e5dc] bg-[#fbfbf8]">
              {data.runtime.models.map((model, index) => (
                <li key={model} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#1d4d41] ring-1 ring-[#dfe3d9]">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold">{model}</span>
                  <span className="shrink-0 text-xs text-[#737c75]">{index === 0 ? 'Principal' : 'Alternativo'}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-5 text-[#737c75]">
              {SOURCE_LABEL[data.runtime.modelSource]}. Esforço de raciocínio: {EFFORT_LABEL[data.runtime.reasoningEffort]}.
              {data.settings.updatedAt && data.settings.updatedBy ? ` Última alteração: ${fmt.format(data.settings.updatedAt)} por ${data.settings.updatedBy}.` : ''}
            </p>
          </section>

          <section aria-label="Uso dos últimos 7 dias" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.usage ? (
              <>
                <Stat icon={MessageCircle} value={data.usage.conversations} label="Conversas no chat" />
                <Stat icon={TrendingUp} value={data.usage.messages7d} label="Mensagens (7 dias)" />
                <Stat icon={Users} value={data.usage.students7d} label="Alunos ativos (7 dias)" />
                <Stat icon={GraduationCap} value={data.usage.explanations} label="Explicações no Simulador" />
              </>
            ) : (
              <p className="col-span-full rounded-2xl border border-[#e3e5dc] bg-white p-4 text-sm text-[#5f6d63]">O uso não está disponível (confirma que a migração 0019 foi aplicada).</p>
            )}
          </section>

          <section className={jonasCard}>
            <CardTitle icon={Zap}>Testar ligação</CardTitle>
            <p className="mb-4 mt-3 text-sm leading-6 text-[#5f6d63]">Faz um pedido mínimo a cada modelo em uso para confirmar que a chave e os modelos respondem.</p>
            <JonasTestButton action={testJonasConnection} disabled={!keyOk} />
          </section>
        </>
      )}
    </JonasShell>
  )
}
