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

// Menu lateral por grupos. O título de cada grupo leva à página do grupo; a seta abre e fecha a lista (o Catálogo começa fechado).
// O revisor não tem páginas de grupo: o título dele é só texto.
export function AdminNav({ role = 'admin', badges = {} }: { variant?: 'sidebar'; role?: StaffRole; badges?: Record<string, number> }) {
  const pathname = usePathname()
  const grupos = montarGrupos(role)
  const [fechados, setFechados] = useState<Record<string, boolean>>({})
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`))
  const numero = (href: string) => (badges[href] ? (badges[href] > 99 ? '99+' : String(badges[href])) : null)

  return (
    <nav aria-label="Administração" className="ad-nv">
      {grupos.map((grupo) => {
        const hub = `/admin/grupo/${grupo.id}`
        const fechado = grupo.titulo ? (fechados[grupo.id] ?? Boolean(grupo.fechado)) && !grupo.itens.some((item) => isActive(item.href)) : false
        return (
          <div key={grupo.id} className="contents">
            {grupo.titulo && (
              <div className="ad-gh">
                {role === 'admin' && grupo.id !== 'outros'
                  ? <Link href={hub} aria-current={pathname === hub ? 'page' : undefined}>{grupo.titulo}</Link>
                  : <span>{grupo.titulo}</span>}
                <button type="button" aria-expanded={!fechado} aria-label={`${fechado ? 'Abrir' : 'Fechar'} ${grupo.titulo}`} onClick={() => setFechados((atual) => ({ ...atual, [grupo.id]: !fechado }))}>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              </div>
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
