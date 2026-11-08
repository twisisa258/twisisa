import Link from 'next/link'
import { Brand } from '@/components/brand'
import { AuthLinks } from '@/components/site/auth-links'
import { listPublicInstitutions } from '@/lib/exames'

// Navegação principal das páginas públicas (exames, simulado, blog). Todas as páginas públicas ligam umas às outras daqui.
const NAV = [
  { href: '/exames', label: 'Exames' },
  { href: '/simulado', label: 'Simulado' },
  { href: '/blog', label: 'Blog' },
] as const

export async function SiteFrame({ children }: { children: React.ReactNode }) {
  // As universidades com conteúdo aparecem no rodapé de todas as páginas: é assim que o Google chega a elas de qualquer sítio.
  const institutions = await listPublicInstitutions().catch(() => [])
  return (
    <div className="min-h-dvh bg-fundo text-texto">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-3 focus:z-50 focus:rounded-md focus:bg-fundo focus:px-3 focus:py-2 focus:text-marca">Saltar para o conteúdo</a>
      <header className="sticky top-0 z-40 border-b border-linha bg-fundo/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1040px] items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-8">
            <Brand />
            <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-[15px] font-semibold text-texto-2 no-underline transition-colors hover:bg-marca-suave hover:text-marca">{item.label}</Link>)}
            </nav>
          </div>
          <AuthLinks />
        </div>
        <nav aria-label="Principal (telemóvel)" className="flex gap-1 overflow-x-auto border-t border-linha px-4 py-1.5 md:hidden">
          {NAV.map((item) => <Link key={item.href} href={item.href} className="shrink-0 rounded-lg px-3 py-2 text-[14px] font-semibold text-texto-2 no-underline hover:bg-marca-suave hover:text-marca">{item.label}</Link>)}
        </nav>
      </header>

      {children}

      <footer className="mt-16 border-t border-linha bg-white/60">
        <div className="mx-auto grid max-w-[1040px] gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Brand />
            <p className="mt-3 max-w-[30ch] text-[14px] leading-6 text-texto-2">Percebe a matéria. Não decores. Feito em Moçambique.</p>
          </div>
          <nav aria-label="Exames de admissão">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-texto-2">Exames de admissão</h2>
            <ul className="mt-3 space-y-1">
              {institutions.slice(0, 8).map((item) => <li key={item.id}><Link href={`/exames/${item.slug}`} className="inline-block py-1 text-[15px] text-texto no-underline hover:text-marca hover:underline">Exames {item.shortName}</Link></li>)}
              <li><Link href="/exames" className="inline-block py-1 text-[15px] font-semibold text-marca no-underline hover:underline">Ver todos os exames</Link></li>
            </ul>
          </nav>
          <nav aria-label="Estudar">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-texto-2">Estudar</h2>
            <ul className="mt-3 space-y-1">
              <li><Link href="/simulado" className="inline-block py-1 text-[15px] text-texto no-underline hover:text-marca hover:underline">Simulado de exame</Link></li>
              <li><Link href="/blog" className="inline-block py-1 text-[15px] text-texto no-underline hover:text-marca hover:underline">Blog de estudos</Link></li>
              <li><Link href="/planos" className="inline-block py-1 text-[15px] text-texto no-underline hover:text-marca hover:underline">Planos</Link></li>
              <li><Link href="/sign-up" className="inline-block py-1 text-[15px] text-texto no-underline hover:text-marca hover:underline">Criar conta</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-texto-2">Legal</h2>
            <ul className="mt-3 space-y-1">
              <li><Link href="/termos" className="inline-block py-1 text-[15px] text-texto no-underline hover:text-marca hover:underline">Termos</Link></li>
              <li><Link href="/privacidade" className="inline-block py-1 text-[15px] text-texto no-underline hover:text-marca hover:underline">Privacidade</Link></li>
            </ul>
          </nav>
        </div>
        <p className="border-t border-linha py-4 text-center text-[13px] text-texto-2">© {new Date().getFullYear()} Twisisa</p>
      </footer>
    </div>
  )
}
