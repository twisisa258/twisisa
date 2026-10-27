'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, BookOpen, Bookmark, ClipboardCheck, FileText, Gift, LayoutDashboard, Sparkles, Trophy, UserRound, Users, Zap } from 'lucide-react'

// Menu único do estudante: o computador (StudentSidebar) e o telemóvel (StudentMobileSidebar) usam esta mesma lista,
// por isso todas as páginas do estudante têm as mesmas ligações, na mesma ordem e com a página atual marcada.
const MAIN = [
  { href: '/aluno', label: 'Visão geral', icon: LayoutDashboard, exact: true },
  { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { href: '/aluno/simulador', label: 'Simulador', icon: ClipboardCheck },
  { href: '/jonas', label: 'Jonas', icon: Sparkles },
  { href: '/aluno/ranking', label: 'Ranking', icon: Trophy },
  { href: '/aluno/desafios', label: 'Desafios', icon: Zap },
  { href: '/aluno/convites', label: 'Convites', icon: Gift },
  { href: '/comunidade', label: 'Comunidade', icon: Users },
  { href: '/blog', label: 'Blog', icon: FileText },
] as const

const PERSONAL = [
  { href: '/aluno/favoritos', label: 'Favoritos', icon: Bookmark },
  { href: '/aluno/notificacoes', label: 'Notificações', icon: Bell },
  { href: '/aluno/perfil', label: 'O meu perfil', icon: UserRound },
] as const

type Item = { href: string; label: string; icon: typeof BookOpen; exact?: boolean }

function isActive(pathname: string, item: Item) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function Group({ label, items, onNavigate }: { label: string; items: readonly Item[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div>
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#929991]">{label}</p>
      <nav className="mt-3 flex flex-col gap-1" aria-label={label}>
        {items.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-gradient-to-br from-[#2a6a57] to-[#1d4d41] font-medium text-white shadow-[0_6px_16px_-8px_rgba(29,77,65,0.7)]'
                  : 'text-[#68716a] hover:bg-white hover:text-[#1d4d41]'
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function StudentNavGroups({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <Group label="Estudar" items={MAIN} onNavigate={onNavigate} />
      <Group label="A minha conta" items={PERSONAL} onNavigate={onNavigate} />
    </div>
  )
}
