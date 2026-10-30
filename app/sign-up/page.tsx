import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth, googleEnabled } from '@/lib/auth'
import { safeNext } from '@/lib/identity'
import { AuthForm } from '@/components/auth-form'
import { Brand } from '@/components/brand'

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect(safeNext(next))

  return <main className="flex min-h-screen items-center justify-center bg-[#f8f8f5] px-5 py-6 text-[#202321] sm:py-12"><div className="w-full max-w-[420px]"><Brand /><div className="mt-5 rounded-[28px] border border-[#e0e2d9] bg-white p-5 shadow-[0_24px_60px_rgba(35,54,44,0.08)] sm:mt-8 sm:p-8"><h1 className="text-2xl font-medium tracking-[-0.06em] sm:text-3xl">Criar conta</h1><div className="mt-5 sm:mt-8"><AuthForm mode="sign-up" googleEnabled={googleEnabled} next={next} /></div><p className="mt-4 text-center text-sm text-[#6e756f] sm:mt-6">Já tens conta? <Link href="/sign-in" className="font-semibold text-[#1d4d41]">Entrar</Link></p></div></div></main>
}
