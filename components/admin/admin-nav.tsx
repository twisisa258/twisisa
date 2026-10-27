'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminOverview, adminSections } from '@/lib/admin-sections'
import type { StaffRole } from '@/lib/staff-shared'

const allItems = [adminOverview, ...adminSections]

// `sidebar`: lista vertical (ecrãs largos). `pills`: linha deslizável (telemóvel).
export function AdminNav({ variant, role = 'admin' }: { variant: 'sidebar' | 'pills'; role?: StaffRole }) {
  const pathname = usePathname()
  // O revisor só vê a área de questões.
  const items = role === 'revisor' ? allItems.filter((item) => item.href === '/admin/questoes') : allItems
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`))

  return (
    <nav aria-label="Administração" className={variant === 'sidebar' ? 'mt-6 flex flex-col gap-1' : '-mx-5 flex gap-2 overflow-x-auto px-5 pb-3'}>
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href)
        const base = variant === 'sidebar'
          ? 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors'
          : 'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors'
        const tone = variant === 'sidebar'
          ? active ? 'bg-white font-semibold text-[#1d4d41]' : 'text-[#68716a] hover:bg-white hover:text-[#1d4d41]'
          : active ? 'border-[#1d4d41] bg-[#1d4d41] font-semibold text-white' : 'border-[#dfe3d9] bg-white text-[#526057]'
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`${base} ${tone}`}>
            <Icon size={variant === 'sidebar' ? 18 : 16} aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
