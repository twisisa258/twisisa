'use client'

import { ArrowLeft, Menu, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminNav } from '@/components/admin/admin-nav'
import { Migalhas } from '@/components/admin/migalhas'
import { SignOutButton } from '@/components/sign-out-button'
import { ThemeToggle } from '@/components/site/theme-toggle'
import type { StaffRole } from '@/lib/staff-shared'

// A moldura da administração: barra lateral escura (gaveta no telemóvel), barra de topo com o caminho, a procura e o modo claro/escuro,
// e a área de conteúdo, que é a única que rola. Cada página põe o seu cabeçalho (AdminPageHeader) lá dentro.
export function AdminShell({ home, role, roleLabel, firstName, badges, children }: { home: string; role: StaffRole; roleLabel: string; firstName: string; badges: Record<string, number>; children: React.ReactNode }) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)

  useEffect(() => { setAberto(false) }, [pathname])
  useEffect(() => {
    if (!aberto) return
    const fechar = (event: KeyboardEvent) => { if (event.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [aberto])

  return (
    <div className="ad-root flex h-dvh overflow-hidden bg-fundo text-texto">
      {aberto && <button type="button" aria-label="Fechar menu" className="ad-scrim lg:hidden" onClick={() => setAberto(false)} />}

      <aside id="ad-menu" className={aberto ? 'ad-sd ad-sd-on' : 'ad-sd'}>
        <Link href={home} aria-label="Twisisa, página inicial da administração" className="ad-logo">
          <span className="ad-mark"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-4 w-auto object-contain" /></span>
          Twisisa
        </Link>
        <p className="ad-papel">{roleLabel}</p>
        <AdminNav role={role} badges={badges} />
        <div className="ad-rodape">
          <Link href="/aluno" className="ad-volta"><ArrowLeft size={16} aria-hidden="true" /> Área do estudante</Link>
          <div className="ad-eu">
            <span className="flex min-w-0 items-center gap-2">
              <span className="ad-av">{firstName.slice(0, 1)}</span>
              <span className="truncate">{firstName}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="ad-top">
          <button type="button" className="tw6-ic lg:hidden" aria-label="Abrir menu" aria-expanded={aberto} aria-controls="ad-menu" onClick={() => setAberto(true)}><Menu size={18} aria-hidden="true" /></button>
          <Migalhas />
          <span className="flex-1" />
          <form action="/admin/questoes" method="get" role="search" className="ad-q">
            <Search size={15} aria-hidden="true" />
            <label className="min-w-0 flex-1"><span className="sr-only">Procurar questões</span><input name="q" maxLength={100} placeholder="Procurar questões…" autoComplete="off" /></label>
          </form>
          <ThemeToggle />
          <span className="ad-av ad-av-top" aria-hidden="true">{firstName.slice(0, 1)}</span>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-5 sm:px-8 sm:py-7">{children}</div>
        </main>
      </div>
    </div>
  )
}
