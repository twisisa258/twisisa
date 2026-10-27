'use client'

import { useEffect, useState } from 'react'
import { markNotificationRead } from '@/app/aluno/notificacoes/actions'
import { useFeedback } from '@/components/feedback-provider'

type Notification = { id: string; title: string; body: string; kind: string; readAt: Date | null; createdAt: Date }
export function NotificationsFeed({ initial }: { initial: Notification[] }) {
  const feedback = useFeedback()
  const [items, setItems] = useState(initial)
  return <div className="space-y-3">{items.length === 0 ? <div className="rounded-3xl border border-[#e3e5dc] bg-white p-6 text-sm text-[#667066]">Ainda não tens notificações. Avisos de simulados, resultados e novidades aparecerão aqui.</div> : items.map((item) => <button key={item.id} type="button" onClick={async () => { if (!item.readAt) { const result = await markNotificationRead(item.id).catch(() => null); if (!result?.ok) { feedback.error(result?.message ?? 'Sem ligação ao servidor. Verifica a internet e tenta outra vez.', 'Não foi possível actualizar'); return } setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date() } : entry)) } }} className={`block w-full rounded-3xl border p-5 text-left transition ${item.readAt ? 'border-[#e3e5dc] bg-white' : 'border-[#b9d5ca] bg-[#eef5f0]'}`}><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1d4d41]">{item.kind}</p><h2 className="mt-2 font-medium text-[#17231d]">{item.title}</h2><p className="mt-1 text-sm text-[#667066]">{item.body}</p><p className="mt-3 text-xs text-[#8a918a]">{item.readAt ? 'Lida' : 'Marcar como lida'}</p></button>)}</div>
}
