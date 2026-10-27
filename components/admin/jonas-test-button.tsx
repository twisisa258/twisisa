'use client'

import { useState } from 'react'
import { CircleAlert, CircleCheck, Timer, Zap } from 'lucide-react'
import type { TestResult } from '@/app/admin/jonas/actions'

// «Testar ligação»: faz um pedido mínimo a cada modelo em uso e mostra se a chave e o modelo respondem.
export function JonasTestButton({ action, disabled = false }: { action: () => Promise<TestResult>; disabled?: boolean }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  async function run() {
    if (pending || disabled) return
    setPending(true)
    setResult(null)
    try {
      setResult(await action())
    } catch {
      setResult({ ok: false, message: 'Não foi possível testar a ligação. Tenta outra vez.', results: [] })
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending || disabled}
        aria-busy={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1d4d41] px-5 text-sm font-semibold text-white hover:bg-[#163e34] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Zap size={16} aria-hidden="true" className={pending ? 'animate-pulse' : ''} />
        {pending ? 'A testar…' : 'Testar ligação'}
      </button>

      <div role="status" aria-live="polite">
        {result?.message && (
          <p className="mt-3 flex items-start gap-2 text-sm text-[#8a2f2f]">
            <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            {result.message}
          </p>
        )}
        {result && result.results.length > 0 && (
          <ul className="mt-3 divide-y divide-[#edf0e9] rounded-xl border border-[#e3e5dc] bg-[#fbfbf8]">
            {result.results.map((item) => (
              <li key={item.model} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                {item.ok ? <CircleCheck size={18} aria-hidden="true" className="shrink-0 text-[#1d4d41]" /> : <CircleAlert size={18} aria-hidden="true" className="shrink-0 text-[#a23a3a]" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[13px] font-semibold">{item.model}</p>
                  <p className={`text-xs ${item.ok ? 'text-[#5f6d63]' : 'text-[#8a2f2f]'}`}>{item.message}</p>
                </div>
                {item.ms > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-[#737c75]">
                    <Timer size={13} aria-hidden="true" />
                    {(item.ms / 1000).toFixed(1)} s
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
