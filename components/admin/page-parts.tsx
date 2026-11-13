import Link from 'next/link'
import { ArrowRight, Search, type LucideIcon } from 'lucide-react'

// Estrutura padrão de TODAS as páginas de lista do admin:
//   1. AdminPageHeader  — título, uma frase e o botão principal (sem faixa nem ícone: o menu e o caminho no topo já dizem onde estás)
//   2. AdminSearchBar   — [ícone | pesquisa | botão] + contagem
//   3. AdminListPanel   — ocupa o resto do ecrã; só a lista rola, com a paginação (AdminPager) sempre visível
// O contentor (AdminPage) enche a altura da área de conteúdo definida em components/admin/admin-shell.tsx.

export function AdminPage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[28rem] flex-1 flex-col gap-4">{children}</div>
}

// `icon` continua aceite (as páginas passam-no) mas já não se desenha.
export function AdminPageHeader({ title, description, action }: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-[-0.04em]">{title}</h1>
        {description && <p className="mt-1 text-sm text-texto-2">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  )
}

export function AdminSearchBar({ q, placeholder, countLabel, hidden }: { q: string; placeholder: string; countLabel?: string; hidden?: Record<string, string> }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <form method="get" role="search" className="flex min-w-0 flex-1 items-center rounded-xl border border-[#dfe3d9] bg-white focus-within:border-marca focus-within:ring-2 focus-within:ring-marca/10">
        {hidden && Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <Search size={17} aria-hidden="true" className="ml-3 shrink-0 text-texto-2" />
        <span aria-hidden="true" className="mx-2.5 h-5 w-px shrink-0 bg-linha" />
        <label className="min-w-0 flex-1">
          <span className="sr-only">{placeholder}</span>
          <input name="q" defaultValue={q} maxLength={100} placeholder={placeholder} className="h-11 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#8a928c]" />
        </label>
        <button type="submit" aria-label="Pesquisar" className="m-1 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-marca px-3 text-sm font-semibold text-white hover:bg-marca-escura">
          <span className="hidden sm:inline">Pesquisar</span>
          <ArrowRight size={16} aria-hidden="true" className="sm:hidden" />
        </button>
      </form>
      {countLabel && <span className="shrink-0 whitespace-nowrap text-xs text-texto-2">{countLabel}</span>}
    </div>
  )
}

// Separadores de uma página com mais de uma lista (ex.: Categorias | Níveis): sublinhados, com a contagem em cada um.
export function AdminTabs({ label, tabs }: { label: string; tabs: { href: string; label: string; count?: number; active: boolean }[] }) {
  return (
    <nav aria-label={label} className="ad-tabs">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={tab.active ? 'page' : undefined}>
          <span className="truncate">{tab.label}</span>
          {tab.count !== undefined && <span className="ad-tabs-n">{tab.count}</span>}
        </Link>
      ))}
    </nav>
  )
}

export function AdminListPanel({ children }: { children: React.ReactNode }) {
  return <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-linha bg-white">{children}</section>
}

export function AdminPager({ page, pages, prevHref, nextHref }: { page: number; pages: number; prevHref: string; nextHref: string }) {
  return (
    <nav aria-label="Paginação" className="flex shrink-0 items-center justify-between gap-3 border-t border-[#edf0e9] px-4 py-2.5 text-sm sm:px-5">
      {page > 1 ? <Link href={prevHref} className="rounded-lg px-3 py-1.5 font-semibold text-marca hover:bg-[#f1f4ef]">Anterior</Link> : <span className="px-3 py-1.5 text-[#b0b6b1]">Anterior</span>}
      <span className="text-xs text-texto-2">Página {page} de {pages}</span>
      {page < pages ? <Link href={nextHref} className="rounded-lg px-3 py-1.5 font-semibold text-marca hover:bg-[#f1f4ef]">Seguinte</Link> : <span className="px-3 py-1.5 text-[#b0b6b1]">Seguinte</span>}
    </nav>
  )
}

export function AdminLoadError({ href }: { href: string }) {
  return (
    <div role="alert" className="m-4 rounded-3xl border border-[#f0d6d6] px-5 py-8 text-center">
      <h3 className="text-base font-semibold">Não foi possível carregar</h3>
      <p className="mt-1.5 text-sm text-texto-2">Verifica a ligação e tenta de novo.</p>
      <Link href={href} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-marca px-5 text-sm font-semibold text-white hover:bg-marca-escura">Tentar de novo</Link>
    </div>
  )
}

/** Texto sem acentos e em minúsculas, para a pesquisa («Portugues» encontra «Português»). */
export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
