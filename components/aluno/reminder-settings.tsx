'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { saveReminderSettings } from '@/app/aluno/lembretes/actions'
import { STUDY_HOURS } from '@/lib/lembretes-shared'

export function ReminderSettings({ email, initialEnabled, initialHour }: { email: string; initialEnabled: boolean; initialHour: number }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [hour, setHour] = useState(initialHour)
  const [busy, setBusy] = useState(false)
  const [state, setState] = useState<'idle' | 'saved' | string>('idle')

  async function save() {
    if (busy) return
    setBusy(true)
    setState('idle')
    const res = await saveReminderSettings({ emailEnabled: enabled, hour }).catch(() => null)
    setBusy(false)
    setState(res?.ok ? 'saved' : (res?.message ?? 'Sem ligação. Verifica a internet e tenta de novo.'))
  }

  const custom = !STUDY_HOURS.some((h) => h.value === hour)
  return (
    <div className="max-w-[520px] space-y-5 rounded-2xl border border-linha bg-white p-5">
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block text-[15px] font-semibold">Lembrete por e-mail</span>
          <span className="block text-[13px] text-texto-2">Enviado para {email}. No máximo um por dia, e só quando faz falta.</span>
        </span>
        <input type="checkbox" role="switch" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="size-6 shrink-0 accent-marca" />
      </label>

      <fieldset>
        <legend className="text-[15px] font-semibold">A que horas costumas estudar?</legend>
        <p className="mt-0.5 text-[13px] text-texto-2">Hora de Maputo. O lembrete (e-mail ou notificação) chega por volta desta hora.</p>
        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Hora do lembrete">
          {STUDY_HOURS.map((h) => (
            <button key={h.value} type="button" role="radio" aria-checked={hour === h.value} onClick={() => setHour(h.value)} className={`min-h-[52px] rounded-xl border-2 px-3 text-left ${hour === h.value ? 'border-marca bg-marca-suave' : 'border-linha bg-white'}`}>
              <span className="block text-[14px] font-semibold">{h.label}</span>
              <span className="block text-[12px] text-texto-2">{h.detail}</span>
            </button>
          ))}
        </div>
        {custom && <p className="mt-2 text-[12px] text-texto-2">Hora atual: {hour}h. Escolhe uma das opções para mudar.</p>}
      </fieldset>

      {state !== 'idle' && state !== 'saved' && <p role="alert" className="rounded-xl bg-erro-suave px-3 py-2 text-[13px] text-erro-texto">{state}</p>}
      {state === 'saved' && <p role="status" className="flex items-center gap-2 text-[14px] font-semibold text-sucesso-texto"><Check size={16} aria-hidden />Guardado.</p>}
      <button type="button" disabled={busy} onClick={() => void save()} className="btn btn-primario btn-grande w-full">{busy ? 'A guardar…' : 'Guardar'}</button>
    </div>
  )
}
