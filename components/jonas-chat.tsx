'use client'

import { useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useChat } from '@ai-sdk/react'
import { useFeedback } from '@/components/feedback-provider'

export function JonasChat() {
  const feedback = useFeedback()
  const { messages, sendMessage, status } = useChat({ id: 'jonas-chat', onError: () => feedback.error('O Jonas não conseguiu responder. Verifica a internet e tenta outra vez.', 'Sem resposta') })
  const [input, setInput] = useState('')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!input.trim() || status !== 'ready') return
    sendMessage({ text: input.trim() })
    setInput('')
  }

  return <div className="rounded-3xl border border-[#e3e5dc] bg-white p-4 sm:p-6"><div className="flex min-h-[360px] flex-col gap-4">{messages.length === 0 ? <div className="m-auto max-w-sm text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#eaf1eb] text-[#1d4d41]"><Sparkles size={21} /></div><h2 className="mt-4 text-xl font-medium">Em que posso ajudar?</h2><p className="mt-2 text-sm leading-6 text-[#68716a]">Pede uma explicação, um exemplo ou ajuda para organizar o teu estudo.</p></div> : messages.map((message) => <div key={message.id} className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-[#1d4d41] text-white' : 'bg-[#f0f3ed] text-[#26332d]'}`}>{message.parts.map((part, index) => part.type === 'text' ? <span key={index}>{part.text}</span> : null)}</div>)}</div><form onSubmit={submit} className="mt-4 flex gap-2 border-t border-[#e3e5dc] pt-4"><label className="sr-only" htmlFor="jonas-message">Mensagem para o Jonas</label><input id="jonas-message" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Escreve a tua dúvida..." disabled={status !== 'ready'} className="min-w-0 flex-1 rounded-full border border-[#dfe4dc] bg-[#fafbf8] px-4 py-3 text-sm outline-none focus:border-[#1d4d41]" /><button type="submit" aria-label="Enviar mensagem" disabled={status !== 'ready' || !input.trim()} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1d4d41] text-white disabled:opacity-40"><Send size={16} /></button></form></div>
}
