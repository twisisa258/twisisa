'use client'

import { useState } from 'react'
import { Check, Copy, Mail } from 'lucide-react'
import { useFeedback } from '@/components/feedback-provider'

export function InvitePanel() {
  const feedback = useFeedback()
  const [copied, setCopied] = useState(false)
  const inviteUrl = 'https://twisisa.site/convite/estuda-juntos'
  async function copyInvite() { try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { feedback.error('O browser não deixou copiar. Seleciona o link e copia-o manualmente.', 'Não foi possível copiar') } }
  return <section className="mt-5 rounded-3xl border border-[#e3e5dc] bg-[#eef2ec] p-5 sm:p-7"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4d41]">o teu convite</p><h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">Estuda melhor acompanhado.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#657067]">Copia o teu link pessoal e envia-o ao teu grupo de estudo.</p><div className="mt-5 flex flex-col gap-2 sm:flex-row"><input readOnly aria-label="Link de convite" value={inviteUrl} className="min-w-0 flex-1 rounded-xl border border-[#d7ded5] bg-white px-3 py-2.5 text-sm text-[#526057]" /><button type="button" onClick={copyInvite} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1d4d41] px-4 py-2.5 text-sm font-semibold text-white">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copiado' : 'Copiar link'}</button><a href={`mailto:?subject=Estuda comigo no Twisisa&body=${encodeURIComponent(inviteUrl)}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#c9d4ca] bg-white px-4 py-2.5 text-sm font-semibold text-[#1d4d41]"><Mail size={16} /> Email</a></div></section>
}
