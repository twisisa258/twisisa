import Link from 'next/link'
import { Brand } from '@/components/brand'
import { BackToSignIn, NewPasswordForm } from '@/components/password-reset-form'

// A ligação do e-mail passa por /api/auth/reset-password/<código> e chega aqui com ?token=… (válido) ou ?error=INVALID_TOKEN.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams
  const valid = Boolean(token) && !error
  return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5 py-12 text-[#202321]"><div className="w-full max-w-[420px]"><Brand /><div className="mt-8 rounded-[28px] border border-[#e0e2d9] bg-white p-6 shadow-[0_24px_60px_rgba(35,54,44,0.08)] sm:p-8">{valid ? (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4d41]">recuperar conta</p>
      <h1 className="mt-3 text-3xl font-medium tracking-[-0.06em]">Escolhe a nova palavra-passe.</h1>
      <div className="mt-8"><NewPasswordForm token={token as string} /></div>
      <BackToSignIn />
    </>
  ) : (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4d41]">ligação inválida</p>
      <h1 className="mt-3 text-3xl font-medium tracking-[-0.06em]">Esta ligação já não vale.</h1>
      <p className="mt-3 text-sm leading-6 text-[#6e756f]">Expirou ou já foi usada. Pede uma nova.</p>
      <Link href="/esqueci-a-senha" className="mt-8 flex justify-center rounded-full bg-[#1d4d41] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#153e34]">Pedir nova ligação</Link>
    </>
  )}</div></div></main>
}
