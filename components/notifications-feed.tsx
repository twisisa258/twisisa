'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Bell, BookOpen, Flame, Info } from 'lucide-react'
import { markAllNotificationsRead, markNotificationRead } from '@/app/aluno/notificacoes/actions'
import { useFeedback } from '@/components/feedback-provider'
import { relativeTime } from '@/lib/relative-time'

type Notification = { id: string; title: string; body: string; kind: string; actionLabel: string | null; actionHref: string | null; readAt: Date | null; createdAt: Date }

// O tipo diz ao aluno, de relance, de que se trata: lembrete (aviso), revisão (índigo) ou novidade (informação).
const KINDS: Record<string, { label: string; icon: typeof Bell; chip: string }> = {
  lembrete: { label: 'Lembrete', icon: Flame, chip: 'bg-aviso-suave text-aviso' },
  revisao: { label: 'Para rever', icon: BookOpen, chip: 'bg-assistente-suave text-assistente' },
  system: { label: 'Novidade', icon: Info, chip: 'bg-ajuda-suave text-ajuda' },
}

// A acção só segue ligações internas: um texto vindo da base nunca leva o aluno para outro sítio.
const safeHref = (href: string | null) => (href && href.startsWith('/') && !href.startsWith('//') ? href : null)

export function NotificationsFeed({ initial }: { initial: Notification[] }) {
  const feedback = useFeedback()
  const [items, setItems] = useState(initial)
  const unread = items.filter((item) => !item.readAt).length

  async function read(id: string) {
    const result = await markNotificationRead(id).catch(() => null)
    if (!result?.ok) {
      feedback.error(result?.message ?? 'Sem ligação ao servidor. Verifica a internet e tenta outra vez.', 'Não foi possível atualizar')
      return false
    }
    setItems((current) => current.map((entry) => (entry.id === id ? { ...entry, readAt: new Date() } : entry)))
    return true
  }

  async function readAll() {
    const result = await markAllNotificationsRead().catch(() => null)
    if (!result?.ok) {
      feedback.error(result?.message ?? 'Sem ligação ao servidor. Verifica a internet e tenta outra vez.', 'Não foi possível atualizar')
      return
    }
    setItems((current) => current.map((entry) => ({ ...entry, readAt: entry.readAt ?? new Date() })))
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-linha bg-white p-6">
        <p className="text-[15px] font-medium text-texto">Sem notificações por agora</p>
        <p className="mt-1 text-sm text-texto-2">Os lembretes de estudo e as novidades aparecem aqui.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-texto-2">{unread === 1 ? '1 por ler' : `${unread} por ler`}</p>
          <button type="button" onClick={() => void readAll()} className="btn btn-terciario">Marcar tudo como lido</button>
        </div>
      )}
      {items.map((item) => {
        const kind = KINDS[item.kind] ?? KINDS.system
        const Icon = kind.icon
        const href = safeHref(item.actionHref)
        return (
          <article key={item.id} className={`rounded-2xl border p-4 ${item.readAt ? 'border-linha bg-white' : 'border-ajuda bg-ajuda-suave/40'}`}>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${kind.chip}`}><Icon size={12} aria-hidden />{kind.label}</span>
              <span className="text-xs text-texto-2">{relativeTime(item.createdAt)}</span>
              {!item.readAt && <span className="ml-auto text-xs font-medium text-ajuda">Nova</span>}
            </div>
            <h2 className="mt-2 text-[15px] font-medium text-texto">{item.title}</h2>
            <p className="mt-1 text-sm text-texto-2">{item.body}</p>
            <div className="mt-3 flex items-center gap-3">
              {href && (
                <Link href={href} onClick={() => { if (!item.readAt) void read(item.id) }} className="btn btn-secundario">
                  {item.actionLabel ?? 'Abrir'}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              )}
              {!item.readAt && <button type="button" onClick={() => void read(item.id)} className="btn btn-terciario">Marcar como lida</button>}
            </div>
          </article>
        )
      })}
    </div>
  )
}
