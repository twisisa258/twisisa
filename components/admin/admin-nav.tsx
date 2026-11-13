'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { adminOverview, adminSections } from '@/lib/admin-sections'
import { GRUPOS_ADMIN } from '@/lib/admin-grupos'
import type { StaffRole } from '@/lib/staff-shared'

const todos = [adminOverview, ...adminSections]
const porHref = new Map(todos.map((item) => [item.href, item]))
const REVISOR = new Set(['/admin/questoes', '/admin/revisao'])

function montarGrupos(role: StaffRole) {
  const usados = new Set(GRUPOS_ADMIN.flatMap((grupo) => grupo.hrefs))
  const sobras = todos.filter((item) => !usados.has(item.href)).map((item) => item.href)
  const grupos = [...GRUPOS_ADMIN, ...(sobras.length ? [{ id: 'outros', titulo: 'Outros', hrefs: sobras, fechado: false }] : [])]
  return grupos
    .map((grupo) => ({
      ...grupo,
      itens: grupo.hrefs
        .filter((href) => role !== 'revisor' || REVISOR.has(href))
        .map((href) => porHref.get(href))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    }))
    .filter((grupo) => grupo.itens.length > 0)
}

// `sidebar`: grupos por fluxo de trabalho (ecrãs largos). `pills`: linha deslizável com tudo, pela mesma ordem (telemóvel).
export function AdminNav({ variant, role = 'admin', badges = {} }: { variant: 'sidebar' | 'pills'; role?: StaffRole; badges?: Record<string, number> }) {
  const pathname = usePathname()
  const grupos = montarGrupos(role)
  const [fechados, setFechados] = useState<Record<string, boolean>>({})
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`))
  const numero = (href: string) => (badges[href] ? (badges[href] > 99 ? '99+' : String(badges[href])) : null)

  if (variant === 'pills') {
    return (
      <nav aria-label="Administração" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-3">
        {grupos.flatMap((grupo) => grupo.itens).map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${active ? 'border-marca bg-marca font-semibold text-white' : 'border-[#dfe3d9] bg-white text-[#526057]'}`}>
              <Icon size={16} aria-hidden="true" />
              {label}
              {numero(href) ? <span className="ml-1 rounded-full bg-[#c0392b] px-1.5 text-[11px] font-semibold leading-5 text-white">{numero(href)}</span> : null}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav aria-label="Administração" className="ad-nv">
      {grupos.map((grupo) => {
        const fechado = grupo.titulo ? (fechados[grupo.id] ?? Boolean(grupo.fechado)) && !grupo.itens.some((item) => isActive(item.href)) : false
        return (
          <div key={grupo.id} className="contents">
            {grupo.titulo && (
              <button type="button" className="ad-gh" aria-expanded={!fechado} onClick={() => setFechados((atual) => ({ ...atual, [grupo.id]: !fechado }))}>
                {grupo.titulo}
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            )}
            {!fechado && grupo.itens.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined} className="ad-it">
                <Icon size={16} aria-hidden="true" />
                {label}
                {numero(href) ? <span className={href === '/admin/revisao' ? 'ad-b ad-b-w' : 'ad-b'}>{numero(href)}</span> : null}
              </Link>
            ))}
          </div>
        )
      })}
    </nav>
  )
}
