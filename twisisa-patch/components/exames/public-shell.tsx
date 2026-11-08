import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { SiteFrame } from '@/components/site/site-frame'

// Moldura das páginas públicas de exames: cabeçalho e rodapé comuns, conteúdo ao centro. Sem sessão no servidor (a página fica estática).
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <SiteFrame>
      <main id="conteudo" className="mx-auto max-w-[1040px] px-5 pb-8 pt-8">{children}</main>
    </SiteFrame>
  )
}

export function Crumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Caminho" className="mb-5 flex flex-wrap items-center gap-1 text-sm text-texto-2">
      {items.map((item, index) => (
        <span key={item.name} className="inline-flex items-center gap-1">
          {index > 0 && <ChevronRight size={14} aria-hidden className="text-texto-2/70" />}
          {item.href ? <Link href={item.href} className="font-semibold text-marca no-underline hover:underline">{item.name}</Link> : <span aria-current="page">{item.name}</span>}
        </span>
      ))}
    </nav>
  )
}
