'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { useFeedback } from '@/components/feedback-provider'
import { track } from '@/lib/analytics'
import { Spinner } from '@/components/ui/spinner'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const feedback = useFeedback()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    let failure: string | null = null
    try {
      const result = mode === 'sign-up'
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })
      if (result.error) {
        const code = (result.error as { code?: string }).code
        failure = code === 'USER_ALREADY_EXISTS' || code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
          ? 'Já existe uma conta com este email. Tenta entrar.'
          : mode === 'sign-up'
            ? 'Não foi possível criar a conta. Verifica os dados e tenta novamente.'
            : 'Não foi possível entrar. Verifica os teus dados e tenta novamente.'
      }
    } catch {
      failure = 'Sem ligação ao servidor. Verifica a internet e tenta outra vez.'
    }
    setLoading(false)
    if (failure) {
      feedback.error(failure, mode === 'sign-up' ? 'Não foi possível criar a conta' : 'Não foi possível entrar')
      return
    }
    track(mode === 'sign-up' ? 'sign_up' : 'login', { method: 'email' })
    router.push('/aluno')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {mode === 'sign-up' && <label className="flex flex-col gap-2 text-sm font-medium">Nome completo<input required value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl border border-[#dfe1d9] bg-white px-4 py-3 outline-none focus:border-[#1d4d41]" placeholder="Como te chamas?" /></label>}
      <label className="flex flex-col gap-2 text-sm font-medium">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-[#dfe1d9] bg-white px-4 py-3 outline-none focus:border-[#1d4d41]" placeholder="tu@email.com" /></label>
      <label className="flex flex-col gap-2 text-sm font-medium">Palavra-passe<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl border border-[#dfe1d9] bg-white px-4 py-3 outline-none focus:border-[#1d4d41]" placeholder="Mínimo 8 caracteres" /></label>
      {mode === 'sign-in' && <Link href="/esqueci-a-senha" className="-mt-2 self-end text-sm font-semibold text-[#1d4d41]">Esqueceste a palavra-passe?</Link>}
      <button type="submit" disabled={loading} aria-busy={loading} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1d4d41] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#153e34] disabled:opacity-60">{loading ? <><Spinner />{mode === 'sign-up' ? 'A criar a conta…' : 'A entrar…'}</> : mode === 'sign-up' ? 'Criar a minha conta' : 'Entrar na minha conta'}</button>
    </form>
  )
}
