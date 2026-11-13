'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { migalhasDe } from '@/lib/admin-migalhas'
import { adminOverview, adminSections } from '@/lib/admin-sections'

const secoes = [adminOverview, ...adminSections].map(({ href, label }) => ({ href, label }))

// O caminho da página no topo: Fluxo de conteúdo › Banco de questões › Nova.
export function Migalhas() {
  const migalhas = migalhasDe(usePathname(), secoes)
  return (
    <nav aria-label="Caminho" className="ad-bc">
      {migalhas.map((migalha, indice) => {
        const ultima = indice === migalhas.length - 1
        return (
          <span key={`${migalha.label}-${indice}`} className="ad-bc-i">
            {indice > 0 && <ChevronRight size={13} aria-hidden="true" />}
            {migalha.href && !ultima ? <Link href={migalha.href}>{migalha.label}</Link> : <b aria-current={ultima ? 'page' : undefined}>{migalha.label}</b>}
          </span>
        )
      })}
    </nav>
  )
}
