import Link from 'next/link'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'principal', label: 'Principal', href: '/aluno/simulador' },
  { key: 'configuracoes', label: 'Configurações', href: '/aluno/simulador/configuracoes' },
] as const

export function SimTabs({ active }: { active: (typeof TABS)[number]['key'] }) {
  return (
    <nav aria-label="Simulador" className="flex gap-6 border-b border-[#e6e9e1]">
      {TABS.map(({ key, label, href }) => (
        <Link
          key={key}
          href={href}
          aria-current={key === active ? 'page' : undefined}
          className={cn('-mb-px border-b-2 pb-3 text-[15px] font-medium transition-colors', key === active ? 'border-[#1d4d41] text-[#1d4d41]' : 'border-transparent text-[#8a928b] hover:text-[#1d4d41]')}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
