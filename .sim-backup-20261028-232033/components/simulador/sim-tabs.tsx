import Link from 'next/link'
import { LayoutGrid, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'principal', label: 'Principal', href: '/aluno/simulador', icon: LayoutGrid },
  { key: 'configuracoes', label: 'Configurações', href: '/aluno/simulador/configuracoes', icon: SlidersHorizontal },
] as const

export function SimTabs({ active }: { active: (typeof TABS)[number]['key'] }) {
  return (
    <nav aria-label="Simulador" className="grid grid-cols-2 gap-1 rounded-2xl bg-[#eceee7] p-1">
      {TABS.map(({ key, label, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={key === active ? 'page' : undefined}
          className={cn(
            'flex h-10 items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold transition-all duration-200',
            key === active ? 'bg-white text-[#1d4d41] shadow-[0_2px_8px_rgba(20,50,40,0.10)]' : 'text-[#68716a] hover:text-[#1d4d41]',
          )}
        >
          <Icon size={16} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  )
}
