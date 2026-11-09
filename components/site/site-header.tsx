'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSession } from '@/lib/auth-client'
import { ThemeToggle } from '@/components/site/theme-toggle'

// O mesmo cabeçalho da página inicial, em todas as páginas públicas: logo (volta ao início), quatro ligações e conta.
const NAV = [
  { href: '/exames', label: 'Exames' },
  { href: '/simulado', label: 'Simulador' },
  { href: '/jonas', label: 'Jonas' },
  { href: '/blog', label: 'Blog' },
] as const

export function SiteHeader({ themed = false }: { themed?: boolean }) {
  const path = usePathname() ?? ''
  const [menu, setMenu] = useState(false)
  const { data, isPending } = useSession()
  const signedIn = Boolean(data?.user)
  const on = (href: string) => (path === href || path.startsWith(`${href}/`) ? 'page' : undefined)
  return (
    <header className="tw-head">
      <div className="tw-w tw-bar">
        <Link href="/" className="tw-brand" aria-label="Twisisa, início">
          <Image src="/images/twisisa-mark.png" alt="" width={44} height={24} priority className="h-6 w-auto" />Twisisa
        </Link>
        <nav className="tw-nav" aria-label="Navegação principal">
          {NAV.map((item) => <Link key={item.href} href={item.href} aria-current={on(item.href)}>{item.label}</Link>)}
        </nav>
        <div className={`flex items-center gap-2 ${isPending ? 'invisible' : ''}`}>
          {themed && <ThemeToggle />}
          {!signedIn && <span className="hidden md:block"><Link href="/sign-in" className="tw-btn ol sm">Entrar</Link></span>}
          <Link href={signedIn ? '/aluno' : '/sign-up'} className="tw-btn sm">{signedIn ? 'Painel' : 'Criar conta'}</Link>
          <button className="tw-menu tw-burger" onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu}>{menu ? '✕' : '☰'}</button>
        </div>
      </div>
      {menu && (
        <nav className="tw-mob tw-menu" aria-label="Menu móvel" onClick={() => setMenu(false)}>
          <Link href="/">Início</Link>
          {NAV.map((item) => <Link key={item.href} href={item.href} aria-current={on(item.href)}>{item.label}</Link>)}
          <Link href="/planos">Planos</Link>
          {!signedIn && <Link href="/sign-in">Entrar</Link>}
        </nav>
      )}
    </header>
  )
}
