'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/aluno/avatar'
import { ShellLogo } from '@/components/shell/logo'
import { ThemeToggle } from '@/components/site/theme-toggle'
import { StudentMobileSidebar } from '@/components/student-mobile-sidebar'
import { useSession } from '@/lib/auth-client'

// O cabeçalho de toda a plataforma: fixo, opaco e mínimo (52 px). Muda só o conteúdo:
// com sessão → menu (telemóvel), tema, notificações e foto; sem sessão → ligações principais, tema e conta.
const NAV = [
  { href: '/exames', label: 'Exames' },
  { href: '/simulado', label: 'Simulador' },
  { href: '/jonas', label: 'Jonas' },
  { href: '/blog', label: 'Blog' },
] as const

type Aluno = { firstName: string; image: string | null }
type StaffLink = { href: string; label: string }

export function AppHeader({ aluno, unread = 0, staff = null }: { aluno?: Aluno; unread?: number; staff?: StaffLink | null }) {
  const { data, isPending } = useSession()
  const user = data?.user ?? null
  const known: Aluno | null = aluno ?? (user ? { firstName: user.name?.split(' ')[0] || 'Eu', image: user.image ?? null } : null)
  return known ? <AlunoBar aluno={known} unread={unread} staff={staff} /> : <PublicBar pending={isPending} />
}

function AlunoBar({ aluno, unread, staff }: { aluno: Aluno; unread: number; staff: StaffLink | null }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="sh-head">
      <div className="sh-bar">
        <button type="button" className="sh-ic sh-only-m" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={18} aria-hidden /></button>
        <ShellLogo href="/aluno" className="sh-only-m" />
        <span className="sh-sp" />
        {staff && <Link href={staff.href} className="sh-btn sh-ol sh-sm">{staff.label}</Link>}
        <ThemeToggle />
        <Link href="/aluno/notificacoes" className="sh-ic sh-bell" aria-label={unread > 0 ? `Notificações, ${unread} por ler` : 'Notificações'}>
          <Bell size={18} aria-hidden />
          {unread > 0 && <i aria-hidden="true" />}
        </Link>
        <Link href="/aluno/perfil" className="sh-av" aria-label="O meu perfil"><Avatar name={aluno.firstName} image={aluno.image} size={32} /></Link>
      </div>
      <StudentMobileSidebar firstName={aluno.firstName} image={aluno.image} open={open} onClose={() => setOpen(false)} />
    </header>
  )
}

function PublicBar({ pending }: { pending: boolean }) {
  const path = usePathname() ?? ''
  const [menu, setMenu] = useState(false)
  const on = (href: string) => (path === href || path.startsWith(`${href}/`) ? 'page' : undefined)
  return (
    <header className="sh-head">
      <div className="sh-bar">
        <ShellLogo />
        <nav className="sh-nav" aria-label="Navegação principal">
          {NAV.map((item) => <Link key={item.href} href={item.href} aria-current={on(item.href)}>{item.label}</Link>)}
        </nav>
        <span className="sh-sp" />
        <ThemeToggle />
        <span className={`sh-acts ${pending ? 'invisible' : ''}`}>
          <Link href="/sign-in" className="sh-btn sh-ol sh-sm sh-hide-s">Entrar</Link>
          <Link href="/sign-up" className="sh-btn sh-sm">Criar conta</Link>
        </span>
        <button type="button" className="sh-ic sh-only-m" onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu}><Menu size={18} aria-hidden /></button>
      </div>
      {menu && (
        <nav className="sh-mob" aria-label="Menu" onClick={() => setMenu(false)}>
          <Link href="/">Início</Link>
          {NAV.map((item) => <Link key={item.href} href={item.href} aria-current={on(item.href)}>{item.label}</Link>)}
          <Link href="/planos">Planos</Link>
          <Link href="/sign-in">Entrar</Link>
        </nav>
      )}
    </header>
  )
}
