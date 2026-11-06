import Link from 'next/link'
import { Brand } from '@/components/brand'

// Moldura das páginas públicas de exames: cabeçalho simples, conteúdo e rodapé. Sem sessão.
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-fundo text-texto">
      <header className="border-b border-[#e5e6df] bg-fundo/95">
        <div className="mx-auto flex h-[64px] max-w-[880px] items-center justify-between gap-3 px-5">
          <Brand />
          <nav aria-label="Conta" className="flex items-center gap-2">
            <Link href="/sign-in" className="btn btn-terciario">Entrar</Link>
            <Link href="/sign-up" className="btn btn-primario">Criar conta</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[880px] px-5 pb-16 pt-8">{children}</main>
      <footer className="border-t border-[#e5e6df] py-8 text-center text-sm text-texto-2">
        <p>Twisisa · Percebe a matéria. Não decores.</p>
        <p className="mt-1"><Link href="/exames" className="underline">Exames de admissão</Link> · <Link href="/blog" className="underline">Blog</Link> · <Link href="/termos" className="underline">Termos</Link></p>
      </footer>
    </div>
  )
}

export function Crumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Caminho" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-texto-2">
      {items.map((item, index) => (
        <span key={item.name} className="inline-flex items-center gap-1.5">
          {index > 0 && <span aria-hidden>/</span>}
          {item.href ? <Link href={item.href} className="font-semibold text-marca no-underline hover:underline">{item.name}</Link> : <span aria-current="page">{item.name}</span>}
        </span>
      ))}
    </nav>
  )
}
