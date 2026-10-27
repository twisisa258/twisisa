import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth-form'
import { Brand } from '@/components/brand'

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/aluno')

  return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5 py-12 text-[#202321]"><div className="w-full max-w-[420px]"><Brand /><div className="mt-8 rounded-[28px] border border-[#e0e2d9] bg-white p-6 shadow-[0_24px_60px_rgba(35,54,44,0.08)] sm:p-8"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4d41]">bem-vindo de volta</p><h1 className="mt-3 text-3xl font-medium tracking-[-0.06em]">Entra no teu espaço.</h1><p className="mt-3 text-sm leading-6 text-[#6e756f]">Continua o teu percurso de aprendizagem.</p><div className="mt-8"><AuthForm mode="sign-in" /></div><p className="mt-6 text-center text-sm text-[#6e756f]">Ainda não tens conta? <Link href="/sign-up" className="font-semibold text-[#1d4d41]">Criar conta</Link></p></div></div></main>
}
