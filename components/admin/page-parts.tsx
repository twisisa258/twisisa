import Link from 'next/link'
import { ArrowRight, Search, type LucideIcon } from 'lucide-react'

// Estrutura padrão de TODAS as páginas de lista do admin:
//   1. AdminPageHeader  — faixa verde com ícone, título e o botão principal («Adicionar», abre um modal)
//   2. AdminSearchBar   — [ícone | pesquisa | botão] + contagem
//   3. AdminListPanel   — ocupa o resto do ecrã; só a lista rola, com a paginação (AdminPager) sempre visível
// O contentor (AdminPage) enche a altura da área de conteúdo definida em app/admin/layout.tsx.

export function AdminPage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[28rem] flex-1 flex-col gap-4">{children}</div>
}

export function AdminPageHeader({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-[#d5e5da] bg-gradient-to-br from-[#d9eadf] via-[#e9f3ec] to-[#f6f8f3] px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1d4d41] shadow-sm"><Icon size={22} aria-hidden="true" /></span>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="mt-0.5 hidden truncate text-sm text-[#5f6d63] sm:block">{description}</p>}
        </div>
      </div>
      {action}
    </header>
  )
}

export function AdminSearchBar({ q, placeholder, countLabel, hidden }: { q: string; placeholder: string; countLabel?: string; hidden?: Record<string, string> }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <form method="get" role="search" className="flex min-w-0 flex-1 items-center rounded-xl border border-[#dfe3d9] bg-white focus-within:border-[#1d4d41] focus-within:ring-2 focus-within:ring-[#1d4d41]/10">
        {hidden && Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <Search size={17} aria-hidden="true" className="ml-3 shrink-0 text-[#737c75]" />
        <span aria-hidden="true" className="mx-2.5 h-5 w-px shrink-0 bg-[#e3e5dc]" />
        <label className="min-w-0 flex-1">
          <span className="sr-only">{placeholder}</span>
          <input name="q" defaultValue={q} maxLength={100} placeholder={placeholder} className="h-11 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[#8a928c]" />
        </label>
        <button type="submit" aria-label="Pesquisar" className="m-1 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#1d4d41] px-3 text-sm font-semibold text-white hover:bg-[#163e34]">
          <span className="hidden sm:inline">Pesquisar</span>
          <ArrowRight size={16} aria-hidden="true" className="sm:hidden" />
        </button>
      </form>
      {countLabel && <span className="shrink-0 whitespace-nowrap text-xs text-[#737c75]">{countLabel}</span>}
    </div>
  )
}

// Separadores de uma página com mais de uma lista (ex.: Categorias | Níveis). Em qualquer largura ocupam a linha toda,
// em partes iguais, por isso nunca partem no telemóvel.
export function AdminTabs({ label, tabs }: { label: string; tabs: { href: string; label: string; count?: number; active: boolean }[] }) {
  return (
    <nav aria-label={label} className="grid shrink-0 gap-1 rounded-xl bg-[#eceee8] p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition ${tab.active ? 'bg-white text-[#1d4d41] shadow-sm' : 'text-[#5f6d63] hover:bg-white/60'}`}
        >
          <span className="truncate">{tab.label}</span>
          {tab.count !== undefined && <span className={`shrink-0 rounded-full px-1.5 text-[11px] ${tab.active ? 'bg-[#e6f0e9]' : 'bg-white/70'}`}>{tab.count}</span>}
        </Link>
      ))}
    </nav>
  )
}

export function AdminListPanel({ children }: { children: React.ReactNode }) {
  return <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e3e5dc] bg-white">{children}</section>
}

export function AdminPager({ page, pages, prevHref, nextHref }: { page: number; pages: number; prevHref: string; nextHref: string }) {
  return (
    <nav aria-label="Paginação" className="flex shrink-0 items-center justify-between gap-3 border-t border-[#edf0e9] px-4 py-2.5 text-sm sm:px-5">
      {page > 1 ? <Link href={prevHref} className="rounded-lg px-3 py-1.5 font-semibold text-[#1d4d41] hover:bg-[#f1f4ef]">Anterior</Link> : <span className="px-3 py-1.5 text-[#b0b6b1]">Anterior</span>}
      <span className="text-xs text-[#737c75]">Página {page} de {pages}</span>
      {page < pages ? <Link href={nextHref} className="rounded-lg px-3 py-1.5 font-semibold text-[#1d4d41] hover:bg-[#f1f4ef]">Seguinte</Link> : <span className="px-3 py-1.5 text-[#b0b6b1]">Seguinte</span>}
    </nav>
  )
}

export function AdminLoadError({ href }: { href: string }) {
  return (
    <div role="alert" className="m-4 rounded-3xl border border-[#f0d6d6] px-5 py-8 text-center">
      <h3 className="text-base font-semibold">Não foi possível carregar</h3>
      <p className="mt-1.5 text-sm text-[#68736a]">Verifica a ligação e tenta de novo.</p>
      <Link href={href} className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#1d4d41] px-5 text-sm font-semibold text-white hover:bg-[#163e34]">Tentar de novo</Link>
    </div>
  )
}

/** Texto sem acentos e em minúsculas, para a pesquisa («Portugues» encontra «Português»). */
export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
