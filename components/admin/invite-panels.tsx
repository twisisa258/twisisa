'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { createCard, renewCard, type CardResult } from '@/app/admin/equipa/actions'

type Card = Extract<CardResult, { ok: true }>['data']

const input = 'mt-1 h-11 w-full rounded-xl border border-[#dfe3d9] bg-white px-3 text-sm outline-none focus:border-[#1d4d41]'
const primary = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1d4d41] px-5 py-3 text-sm font-semibold text-white hover:bg-[#163e34] disabled:opacity-60'
const secondary = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#dfe3d9] bg-white px-5 py-3 text-sm font-semibold text-[#1d4d41] hover:bg-[#f3f8f4]'

function Copy_({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800) } catch { /* sem permissão: o texto continua visível para copiar à mão */ }
      }}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#dfe3d9] bg-white px-3 text-xs font-semibold text-[#1d4d41] hover:bg-[#f3f8f4]"
    >
      {done ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{done ? 'Copiado' : label}
    </button>
  )
}

// A carta pronta a entregar: WhatsApp (mensagem preenchida), cópia, e o código à parte para quem quer mais segurança.
function CardResultView({ card }: { card: Card }) {
  const [phone, setPhone] = useState('')
  const digits = phone.replace(/\D/g, '')
  const wa = (message: string) => `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
  const first = card.name.split(' ')[0]
  const linkMessage = `Olá, ${first}! Tens uma carta pessoal à tua espera no twisisa. Abre aqui (só abre uma vez, não partilhes): ${card.link}`
  const codeMessage = `O código para abrir a carta é: ${card.code}`

  return (
    <div className="grid gap-4">
      <p className="rounded-2xl bg-[#e9f6ee] p-3 text-sm leading-6 text-[#1f6b45]">
        Carta criada para <strong>{card.email}</strong>.{card.emailed ? ' O e-mail já foi enviado.' : ''} O link e o código só aparecem agora: entrega-os antes de fechar.
      </p>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7d857e]">Link da carta</p>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate rounded-xl bg-[#fafbf8] px-3 py-2.5 font-mono text-xs text-[#526057]">{card.link}</p>
          <Copy_ value={card.link} label="Copiar" />
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7d857e]">Código de abertura</p>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="flex-1 rounded-xl bg-[#f3f8f4] px-3 py-2.5 text-center font-mono text-xl font-bold tracking-[0.2em] text-[#1d4d41]">{card.code}</p>
          <Copy_ value={card.code} label="Copiar" />
        </div>
      </div>
      <label className="text-sm font-medium">WhatsApp da pessoa (opcional)
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="off" placeholder="Com indicativo, ex.: 25884…" className={input} />
        <span className="mt-1 block text-xs font-normal text-[#737c75]">Serve só para abrir a conversa certa. Não é guardado. Sem número, escolhes o contacto no WhatsApp.</span>
      </label>
      <a href={wa(linkMessage)} target="_blank" rel="noopener noreferrer" className={primary}><MessageCircle size={18} aria-hidden />Enviar o link no WhatsApp</a>
      <a href={wa(codeMessage)} target="_blank" rel="noopener noreferrer" className={secondary}><MessageCircle size={18} aria-hidden />Enviar o código numa mensagem à parte</a>
      <p className="text-xs leading-5 text-[#737c75]">Mais seguro: o link e o código em mensagens separadas (ou o código por chamada). Quem só vê uma das duas não consegue abrir a carta.</p>
    </div>
  )
}

export function InviteForm() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [card, setCard] = useState<Card | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    try {
      const res = await createCard({ name: String(data.get('name') ?? ''), email: String(data.get('email') ?? ''), sendEmail: data.get('sendEmail') === 'on', codeInEmail: data.get('codeInEmail') === 'on' })
      if (res.ok) { setCard(res.data); router.refresh() } else setError(res.message)
    } catch {
      setError('Sem ligação. Tenta de novo.')
    } finally {
      setBusy(false)
    }
  }

  if (card) return <CardResultView card={card} />
  return (
    <form onSubmit={submit} className="grid gap-4" aria-busy={busy}>
      <label className="text-sm font-medium">Nome *
        <input name="name" required minLength={2} maxLength={80} autoComplete="off" placeholder="Como aparece na carta" className={input} />
      </label>
      <label className="text-sm font-medium">E-mail *
        <input name="email" type="email" required maxLength={254} autoComplete="off" placeholder="pessoa@exemplo.com" className={input} />
        <span className="mt-1 block text-xs font-normal text-[#737c75]">É o e-mail da conta e o que recebe a verificação no fim. Tem de ser da pessoa.</span>
      </label>
      <fieldset className="grid gap-2 rounded-2xl bg-[#fafbf8] p-3 text-sm leading-5 text-[#526057]">
        <legend className="sr-only">Entrega por e-mail</legend>
        <label className="flex items-start gap-3"><input name="sendEmail" type="checkbox" className="mt-0.5 size-4 accent-[#1d4d41]" /><span>Enviar o link também por e-mail (por defeito entregas tu, por WhatsApp)</span></label>
        <label className="flex items-start gap-3"><input name="codeInEmail" type="checkbox" className="mt-0.5 size-4 accent-[#1d4d41]" /><span>Incluir o código nesse e-mail (menos seguro)</span></label>
      </fieldset>
      <button type="submit" disabled={busy} className={primary}>{busy ? 'A criar…' : 'Criar carta'}</button>
      <p role="alert" className="min-h-5 text-sm text-[#9a3030]">{error}</p>
    </form>
  )
}

export function RenewPanel({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [card, setCard] = useState<Card | null>(null)
  const [sendEmail, setSendEmail] = useState(false)

  async function renew() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await renewCard({ id, sendEmail })
      if (res.ok) { setCard(res.data); router.refresh() } else setError(res.message)
    } catch {
      setError('Sem ligação. Tenta de novo.')
    } finally {
      setBusy(false)
    }
  }

  if (card) return <CardResultView card={card} />
  return (
    <div className="grid gap-4">
      <p className="text-sm leading-6 text-[#526057]">Vais gerar um novo link e um novo código para <strong>{name}</strong>. O link anterior deixa de funcionar e a carta recomeça do início.</p>
      <label className="flex items-start gap-3 rounded-2xl bg-[#fafbf8] p-3 text-sm leading-5 text-[#526057]"><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="mt-0.5 size-4 accent-[#1d4d41]" /><span>Enviar o novo link também por e-mail</span></label>
      <button type="button" onClick={renew} disabled={busy} className={primary}>{busy ? 'A gerar…' : 'Gerar nova carta'}</button>
      <p role="alert" className="min-h-5 text-sm text-[#9a3030]">{error}</p>
    </div>
  )
}
