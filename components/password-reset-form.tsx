'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { useFeedback } from '@/components/feedback-provider'

const input = 'rounded-xl border border-[#dfe1d9] bg-white px-4 py-3 outline-none focus:border-[#1d4d41]'
const button = 'rounded-full bg-[#1d4d41] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#153e34] disabled:opacity-60'

// Passo 1: pedir a ligação. A resposta é sempre a mesma, exista a conta ou não.
export function RequestResetForm() {
  const feedback = useFeedback()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    let failure: string | null = null
    try {
      const result = await authClient.requestPasswordReset({ email, redirectTo: '/redefinir-senha' })
      if (result.error) failure = 'Não foi possível enviar o pedido. Verifica o e-mail e tenta novamente.'
    } catch {
      failure = 'Sem ligação ao servidor. Verifica a internet e tenta outra vez.'
    }
    setLoading(false)
    if (failure) return feedback.error(failure, 'Não foi possível enviar')
    setSentTo(email)
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-5">
        <p className="rounded-xl bg-[#eef5ef] px-4 py-3 text-sm leading-6 text-[#1d4d41]">Se existir uma conta com <strong className="break-all">{sentTo}</strong>, enviámos uma ligação para escolheres uma nova palavra-passe. Vale 1 hora. Se não a vires, procura na pasta de spam.</p>
        <button type="button" onClick={() => setSentTo(null)} className="rounded-full border border-[#d7d9d0] bg-white px-5 py-3.5 text-sm font-semibold text-[#39433e] transition hover:border-[#1d4d41]">Usar outro e-mail</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-medium">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={input} placeholder="tu@email.com" /></label>
      <button disabled={loading} className={button}>{loading ? 'Aguarda...' : 'Enviar ligação'}</button>
    </form>
  )
}

// Passo 2: escolher a nova palavra-passe com o código da ligação (token).
export function NewPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const feedback = useFeedback()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== repeat) return feedback.error('As duas palavras-passe não são iguais.', 'Confirma a palavra-passe')
    setLoading(true)
    let failure: string | null = null
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) {
        const code = (result.error as { code?: string }).code
        failure = code === 'INVALID_TOKEN'
          ? 'Esta ligação expirou ou já foi usada. Pede uma nova.'
          : 'Não foi possível alterar a palavra-passe. Verifica os dados e tenta novamente.'
      }
    } catch {
      failure = 'Sem ligação ao servidor. Verifica a internet e tenta outra vez.'
    }
    setLoading(false)
    if (failure) return feedback.error(failure, 'Não foi possível alterar')
    feedback.success('Já podes entrar com a nova palavra-passe.', 'Palavra-passe alterada')
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm font-medium">Nova palavra-passe<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={input} placeholder="Mínimo 8 caracteres" /></label>
      <label className="flex flex-col gap-2 text-sm font-medium">Repetir palavra-passe<input required minLength={8} type="password" autoComplete="new-password" value={repeat} onChange={(event) => setRepeat(event.target.value)} className={input} placeholder="Repete a palavra-passe" /></label>
      <button disabled={loading} className={button}>{loading ? 'Aguarda...' : 'Guardar palavra-passe'}</button>
    </form>
  )
}

export function BackToSignIn() {
  return <p className="mt-6 text-center text-sm text-[#6e756f]">Lembraste-te? <Link href="/sign-in" className="font-semibold text-[#1d4d41]">Entrar</Link></p>
}
