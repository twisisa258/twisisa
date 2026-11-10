'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Bookmark, ClipboardCheck, Flame, LayoutDashboard, Library, Sparkles, Trophy, UserRound } from 'lucide-react'

// Menu único do estudante: o lateral do computador (AlunoAside) e a gaveta do telemóvel (StudentMobileSidebar) usam esta mesma lista,
// por isso todas as páginas têm as mesmas ligações, na mesma ordem e com a página atual marcada.
const MAIN = [
  { href: '/aluno', label: 'Hoje', icon: LayoutDashboard, exact: true },
  { href: '/aluno/simulador', label: 'Treinar', icon: ClipboardCheck },
  { href: '/exames', label: 'Exames', icon: BookOpen },
  { href: '/aluno/desafios', label: 'Desafios', icon: Flame },
  { href: '/aluno/ranking', label: 'Ranking', icon: Trophy },
  { href: '/jonas', label: 'Jonas', icon: Sparkles },
] as const

// O que o aluno guardou: questões para rever e materiais da Biblioteca.
const SAVED = [
  { href: '/aluno/estudar-depois', label: 'Estudar depois', icon: Bookmark },
  { href: '/aluno/favoritos', label: 'Materiais guardados', icon: Library },
] as const

const PERSONAL = [
  { href: '/aluno/perfil', label: 'Eu', icon: UserRound },
] as const

type Item = { href: string; label: string; icon: typeof BookOpen; exact?: boolean }

function isActive(pathname: string, item: Item) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function Group({ label, items, onNavigate }: { label: string; items: readonly Item[]; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="sh-group" aria-label={label}>
      <p className="sh-gl">{label}</p>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={isActive(pathname, item) ? 'page' : undefined} className="sh-l">
            <Icon size={18} aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function StudentNavGroups({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="sh-groups">
      <Group label="Estudar" items={MAIN} onNavigate={onNavigate} />
      <Group label="Guardado" items={SAVED} onNavigate={onNavigate} />
      <Group label="A minha conta" items={PERSONAL} onNavigate={onNavigate} />
    </div>
  )
}
