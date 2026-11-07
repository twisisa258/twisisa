import Link from 'next/link'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { Brand } from '@/components/brand'

// Moldura pública do blog: uma só vista para visitantes e para quem tem sessão (só muda a ligação do cabeçalho).
// Sem elementos fixos na base do ecrã: o CookieCard já ocupa essa zona e taparia a leitura.
export async function BlogShell({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  const signedIn = Boolean(session?.user)
  return (
    <div className="min-h-dvh bg-fundo text-texto">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-3 focus:z-10 focus:rounded-md focus:bg-fundo focus:px-3 focus:py-2 focus:text-marca">Saltar para o conteúdo</a>
      <header className="mx-auto flex min-h-16 w-full max-w-[760px] items-center justify-between gap-4 px-5">
        <Brand />
        <Link href={signedIn ? '/aluno' : '/sign-in'} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-marca underline-offset-4 hover:underline">{signedIn ? 'Ir para o painel' : 'Entrar'}</Link>
      </header>
      {children}
      <footer className="mx-auto mt-16 w-full max-w-[760px] border-t border-linha px-5 py-8 text-[14px] text-texto-2">
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5">
          <Link href="/blog" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Blog</Link>
          <Link href="/termos" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Termos</Link>
          <Link href="/privacidade" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Privacidade</Link>
        </nav>
      </footer>
    </div>
  )
}
