import { redirect } from 'next/navigation'
import { CircleAlert, Layers, Save, Sparkles, Zap } from 'lucide-react'
import { getAdminUser } from '@/lib/admin'
import { DEFAULT_GROQ_MODELS, MAX_ADMIN_MODELS, listGroqModels, type ModelList } from '@/lib/groq'
import { getJonasSettings, type JonasSettings } from '@/lib/jonas-settings'
import { AdminLoadError } from '@/components/admin/page-parts'
import { CardTitle, JonasShell, jonasCard } from '@/components/admin/jonas-shell'
import { FeedbackForm } from '@/components/feedback-form'
import { SelectField } from '@/components/ui/select-field'
import { saveJonas } from '../actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Modelo do Jonas | Administração | Twisisa' }

const field = 'mt-1 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d4d41] focus:ring-2 focus:ring-[#1d4d41]/10'
const LABELS = ['Modelo principal', 'Alternativo 1', 'Alternativo 2']

export default async function AdminJonasModelPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/questoes')

  let settings: JonasSettings | null = null
  try {
    settings = await getJonasSettings({ fresh: true })
  } catch (error) {
    console.error('[ADMIN JONAS] modelo', error)
  }
  const live: ModelList = await listGroqModels()

  return (
    <JonasShell active="modelo">
      {settings === null ? (
        <div className="rounded-2xl border border-[#e3e5dc] bg-white">
          <AdminLoadError href="/admin/jonas/modelo" />
        </div>
      ) : (
        <FeedbackForm action={saveJonas} successMessage="Definições do Jonas guardadas." errorMessage="Não foi possível guardar as definições. Tenta outra vez." className="grid gap-4">
          <section className={jonasCard}>
            <CardTitle icon={Zap}>Estado</CardTitle>
            <div className="mt-3 text-sm font-medium">
              <span>Jonas para os alunos</span>
              <SelectField
                name="enabled"
                label="Estado do Jonas"
                defaultValue={settings.enabled ? 'on' : 'off'}
                triggerClassName={field}
                options={[
                  { value: 'on', label: 'Ligado' },
                  { value: 'off', label: 'Em pausa' },
                ]}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#737c75]">Em pausa, o chat e as explicações do Jonas deixam de responder e os alunos veem um aviso.</p>
          </section>

          <section className={jonasCard}>
            <CardTitle icon={Layers}>Modelos</CardTitle>
            <div className="mt-3 grid gap-3">
              {Array.from({ length: MAX_ADMIN_MODELS }, (_, index) => {
                const current = settings.adminModels[index] ?? ''
                const name = `model_${index + 1}`
                return (
                  <div key={name} className="text-sm font-medium">
                    <span>{LABELS[index]}</span>
                    {live.ok ? (
                      <SelectField
                        name={name}
                        label={LABELS[index]}
                        defaultValue={current}
                        placeholder="Automático"
                        triggerClassName={field}
                        options={[
                          { value: '', label: index === 0 ? 'Automático (predefinição)' : 'Nenhum' },
                          ...(current && !live.models.includes(current) ? [{ value: current, label: `${current} (já não está na conta)` }] : []),
                          ...live.models.map((model) => ({ value: model, label: model })),
                        ]}
                      />
                    ) : (
                      <input name={name} defaultValue={current} maxLength={100} autoComplete="off" spellCheck={false} placeholder={index === 0 ? 'Automático (deixa vazio)' : 'Nenhum'} className={`${field} font-mono`} />
                    )}
                  </div>
                )
              })}
            </div>
            {!live.ok && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#f4eddb] px-3 py-2.5 text-xs leading-5 text-[#805f19]">
                <CircleAlert size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
                {live.reason === 'no-key' ? 'A chave da Groq ainda não está definida, por isso não há lista de modelos. Escreve o nome do modelo.' : 'Não foi possível obter a lista de modelos da Groq. Escreve o nome do modelo.'}
              </p>
            )}
            <p className="mt-3 text-xs leading-5 text-[#737c75]">
              O Jonas tenta o principal; se não existir na conta ou estiver com o limite cheio, passa ao seguinte. Tudo vazio = automático: usa GROQ_MODEL (se existir no servidor) ou a lista predefinida ({DEFAULT_GROQ_MODELS.join(', ')}).
            </p>
          </section>

          <section className={jonasCard}>
            <CardTitle icon={Sparkles}>Esforço de raciocínio</CardTitle>
            <div className="mt-3 text-sm font-medium">
              <span>Para modelos gpt-oss</span>
              <SelectField
                name="effort"
                label="Esforço de raciocínio"
                defaultValue={settings.reasoningEffort}
                triggerClassName={field}
                options={[
                  { value: 'low', label: 'Baixo (rápido, recomendado)' },
                  { value: 'medium', label: 'Médio' },
                  { value: 'high', label: 'Alto (mais lento e gasta mais limite)' },
                ]}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#737c75]">Mais esforço melhora as contas difíceis, mas demora mais e consome mais do limite da Groq, que é partilhado por todos os alunos.</p>
          </section>

          <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34]">
            <Save size={16} aria-hidden="true" />
            Guardar
          </button>
        </FeedbackForm>
      )}
    </JonasShell>
  )
}
