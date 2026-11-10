import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth, googleEnabled } from '@/lib/auth'
import { safeNext } from '@/lib/identity'
import { AuthForm } from '@/components/auth-form'
import { Brand } from '@/components/brand'
import { ThemeToggle } from '@/components/site/theme-toggle'

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect(safeNext(next))

  return (
    <main className="flex min-h-screen flex-col bg-fundo px-6 text-texto">
      <header className="flex items-center justify-between pt-8 sm:pt-12">
        <Brand />
        <ThemeToggle />
      </header>

      <section className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-12">
        <h1 className="text-3xl font-medium tracking-[-0.05em] sm:text-4xl">Criar conta</h1>

        <div className="mt-8">
          <AuthForm mode="sign-up" googleEnabled={googleEnabled} next={next} />
        </div>

        <p className="mt-8 text-center text-sm text-texto-2">
          Já tens conta?{' '}
          <Link href="/sign-in" className="font-semibold text-marca">
            Entrar
          </Link>
        </p>
      </section>
    </main>
  )
}
