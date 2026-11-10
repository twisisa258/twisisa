#!/usr/bin/env bash
# Twisisa, moldura única (10/11/2026): o menu lateral novo, o cabeçalho fixo e mínimo e o botão claro/escuro
# passam a ser os mesmos em todas as áreas (aluno, exames, simulado, blog, planos, termos, privacidade, entrar, criar conta).
# Corre na raiz do projecto (onde está o package.json). Recria os ficheiros completos; as alterações em ficheiros existentes são feitas com Node.
# Só faz commit e push se os testes e o `npm run build` passarem (set -e).
set -euo pipefail

if [ ! -f package.json ] || [ ! -f app/globals.css ] || [ ! -f components/site/site-frame.tsx ] || [ ! -f components/student-feature-shell.tsx ]; then
  echo "Corre este script na raiz do projecto twisisa (onde está o package.json)."
  exit 1
fi

mkdir -p components/shell scripts

echo "A escrever components/shell/theme-script.tsx"
cat > "components/shell/theme-script.tsx" <<'TWISISA_MOLDURA_EOF'
// Aplica o modo (claro/escuro) e a moldura do aluno antes de a página aparecer: sem «piscar» e sem a página a saltar para o lado.
// Usado uma só vez, no <head> de app/layout.tsx; vale para todas as páginas, com ou sem sessão.
const SCRIPT =
  "try{var d=document.documentElement,t=localStorage.getItem('tw-tema');if(t==='dark'||t==='light')d.dataset.theme=t;if(localStorage.getItem('tw-shell')==='aluno')d.dataset.shell='aluno'}catch(e){}"

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
}
TWISISA_MOLDURA_EOF

echo "A escrever components/shell/logo.tsx"
cat > "components/shell/logo.tsx" <<'TWISISA_MOLDURA_EOF'
import Image from 'next/image'
import Link from 'next/link'

// Marca do cabeçalho e do menu lateral: igual em todas as áreas.
export function ShellLogo({ href = '/', className = '' }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`sh-brand ${className}`} aria-label="Twisisa, início">
      <Image src="/images/twisisa-mark.png" alt="" width={44} height={24} priority className="h-6 w-auto" />
      Twisisa
    </Link>
  )
}
TWISISA_MOLDURA_EOF

echo "A escrever components/shell/aluno-aside.tsx"
cat > "components/shell/aluno-aside.tsx" <<'TWISISA_MOLDURA_EOF'
'use client'

import { useEffect } from 'react'
import { Avatar } from '@/components/aluno/avatar'
import { SignOutButton } from '@/components/sign-out-button'
import { ShellLogo } from '@/components/shell/logo'
import { StudentNavGroups } from '@/components/student-nav'
import { useSession } from '@/lib/auth-client'

// Menu lateral do aluno (computador, a partir de 900 px). Um só, em todas as páginas.
export function AlunoAside({ firstName, image = null }: { firstName: string; image?: string | null }) {
  return (
    <aside className="sh-aside" aria-label="Menu do aluno">
      <ShellLogo href="/aluno" className="sh-aside-brand" />
      <StudentNavGroups />
      <div className="sh-aside-foot">
        <span className="sh-who">
          <Avatar name={firstName} image={image} size={32} />
          <span>{firstName}</span>
        </span>
        <SignOutButton />
      </div>
    </aside>
  )
}

// Nas páginas públicas (exames, blog, planos…): quem tem sessão vê o mesmo menu lateral.
// O servidor não sabe quem é (páginas estáticas): o navegador decide e guarda uma pista para a próxima visita não saltar.
export function PublicAsideGate() {
  const { data, isPending } = useSession()
  const user = data?.user ?? null
  useEffect(() => {
    if (isPending) return
    const root = document.documentElement
    try {
      if (user) { root.dataset.shell = 'aluno'; window.localStorage.setItem('tw-shell', 'aluno') }
      else { delete root.dataset.shell; window.localStorage.removeItem('tw-shell') }
    } catch { /* sem armazenamento: só vale nesta visita */ }
  }, [user, isPending])
  if (!user) return null
  return <AlunoAside firstName={user.name?.split(' ')[0] || 'Eu'} image={user.image ?? null} />
}
TWISISA_MOLDURA_EOF

echo "A escrever components/shell/app-header.tsx"
cat > "components/shell/app-header.tsx" <<'TWISISA_MOLDURA_EOF'
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
TWISISA_MOLDURA_EOF

echo "A escrever components/site/site-frame.tsx"
cat > "components/site/site-frame.tsx" <<'TWISISA_MOLDURA_EOF'
import Image from 'next/image'
import Link from 'next/link'
import { AppHeader } from '@/components/shell/app-header'
import { PublicAsideGate } from '@/components/shell/aluno-aside'
import { listPublicInstitutions } from '@/lib/exames'

// Moldura de todas as páginas públicas (exames, simulado, blog, planos): o mesmo cabeçalho fixo e mínimo de toda a plataforma,
// com modo claro/escuro, e o mesmo rodapé. Quem tem sessão vê também o menu lateral do aluno.
// Sem sessão no servidor: o cabeçalho e o menu resolvem-se no navegador, por isso as páginas podem ser estáticas (rápidas e indexáveis).
// `themed` fica aceite por compatibilidade: agora todas as páginas públicas são «themed».
export async function SiteFrame({ children }: { children: React.ReactNode; themed?: boolean }) {
  const institutions = await listPublicInstitutions().catch(() => [])
  return (
    <div className="tw tw-th min-h-screen">
      <a href="#conteudo" className="tw5-skip">Saltar para o conteúdo</a>
      <AppHeader />
      <PublicAsideGate />
      {children}
      <footer className="tw-foot"><div className="tw-w">
        <div className="tw-ft">
          <div><Link href="/" className="tw-brand"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-6 w-auto" />Twisisa</Link></div>
          <div><h4>Explorar</h4><Link href="/">Início</Link><Link href="/exames">Exames</Link><Link href="/simulado">Simulador</Link><Link href="/blog">Blog</Link></div>
          {institutions.length > 0 && <div><h4>Universidades</h4>{institutions.slice(0, 6).map((item) => <Link key={item.id} href={`/exames/${item.slug}`}>{item.shortName}</Link>)}</div>}
          <div><h4>Plataforma</h4><Link href="/jonas">Jonas</Link><Link href="/planos">Planos</Link><Link href="/sign-up">Criar conta</Link></div>
          <div><h4>Legal</h4><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link></div>
        </div>
        <div className="tw-bot"><span>© {new Date().getFullYear()} Twisisa</span><span>Feito em Moçambique</span></div>
      </div></footer>
    </div>
  )
}
TWISISA_MOLDURA_EOF

echo "A escrever components/site/theme-toggle.tsx"
cat > "components/site/theme-toggle.tsx" <<'TWISISA_MOLDURA_EOF'
'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const KEY = 'tw-tema'

// Modo claro / escuro de toda a plataforma. Segue o sistema até a pessoa escolher; a escolha fica guardada neste aparelho.
export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    setDark(root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  function toggle() {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    setDark(!dark)
    try { window.localStorage.setItem(KEY, next) } catch { /* sem armazenamento: vale só nesta visita */ }
  }

  return (
    <button type="button" className="sh-ic" onClick={toggle} aria-label={dark ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}>
      {dark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  )
}
TWISISA_MOLDURA_EOF

echo "A escrever components/student-nav.tsx"
cat > "components/student-nav.tsx" <<'TWISISA_MOLDURA_EOF'
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
TWISISA_MOLDURA_EOF

echo "A escrever components/student-sidebar.tsx"
cat > "components/student-sidebar.tsx" <<'TWISISA_MOLDURA_EOF'
// Mantido por compatibilidade: o menu lateral do aluno é agora o de components/shell/aluno-aside.tsx.
export { AlunoAside as StudentSidebar } from '@/components/shell/aluno-aside'
TWISISA_MOLDURA_EOF

echo "A escrever components/student-mobile-sidebar.tsx"
cat > "components/student-mobile-sidebar.tsx" <<'TWISISA_MOLDURA_EOF'
'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { SignOutButton } from '@/components/sign-out-button'
import { Avatar } from '@/components/aluno/avatar'
import { ShellLogo } from '@/components/shell/logo'
import { StudentNavGroups } from '@/components/student-nav'

// Gaveta do aluno no telemóvel: a mesma lista do menu lateral do computador.
export function StudentMobileSidebar({ firstName, image = null, open, onClose }: { firstName: string; image?: string | null; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="sh-drawer" role="dialog" aria-modal="true" aria-label="Menu do aluno">
      <button type="button" aria-label="Fechar menu" onClick={onClose} className="sh-scrim" />
      <aside className="sh-panel">
        <div className="sh-panel-top">
          <ShellLogo href="/aluno" className="" />
          <button type="button" aria-label="Fechar menu" onClick={onClose} className="sh-ic"><X size={18} aria-hidden /></button>
        </div>
        <StudentNavGroups onNavigate={onClose} />
        <div className="sh-aside-foot">
          <Link href="/aluno/perfil" onClick={onClose} className="sh-who">
            <Avatar name={firstName} image={image} size={32} />
            <span>{firstName}</span>
          </Link>
          <SignOutButton />
        </div>
      </aside>
    </div>,
    document.body,
  )
}
TWISISA_MOLDURA_EOF

echo "A escrever components/student-menu.tsx"
cat > "components/student-menu.tsx" <<'TWISISA_MOLDURA_EOF'
'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { StudentMobileSidebar } from '@/components/student-mobile-sidebar'

// Mantido por compatibilidade: o botão do menu faz agora parte do cabeçalho (components/shell/app-header.tsx).
export function StudentMenu({ firstName, image = null }: { firstName: string; image?: string | null }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" aria-label="Abrir menu do aluno" aria-expanded={open} onClick={() => setOpen(true)} className="sh-ic sh-only-m"><Menu size={18} aria-hidden /></button>
    <StudentMobileSidebar firstName={firstName} image={image} open={open} onClose={() => setOpen(false)} />
  </>
}
TWISISA_MOLDURA_EOF

echo "A escrever components/student-feature-shell.tsx"
cat > "components/student-feature-shell.tsx" <<'TWISISA_MOLDURA_EOF'
import Link from 'next/link'
import { headers } from 'next/headers'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AlunoAside } from '@/components/shell/aluno-aside'
import { AppHeader } from '@/components/shell/app-header'
import { auth } from '@/lib/auth'

// Estrutura comum das páginas do estudante: menu lateral, cabeçalho fixo e botão de voltar.
// `backHref`/`backLabel`: para onde volta o botão (por omissão, a visão geral).
// `hideTitle`: a página desenha o seu próprio cabeçalho (ex.: Ranking).
export async function StudentFeatureShell({
  firstName,
  title,
  description,
  icon: Icon,
  tone = 'marca',
  children,
  hideBackLink = false,
  hideTitle = false,
  backHref = '/aluno',
  backLabel = 'Voltar à visão geral',
}: {
  firstName: string
  /** Já não aparece no cabeçalho (o cabeçalho é mínimo); fica aceite para as páginas não mudarem. */
  eyebrow?: string
  title: string
  description?: string
  /** Ícone no cabeçalho da página, num quadrado com a cor da área. Se faltar, o título aparece sozinho. */
  icon?: LucideIcon
  tone?: 'marca' | 'conquista' | 'ajuda' | 'assistente' | 'aviso'
  children: React.ReactNode
  hideBackLink?: boolean
  hideTitle?: boolean
  backHref?: string
  backLabel?: string
}) {
  // A foto vem da sessão: assim todas as páginas do estudante mostram-na sem cada uma a ter de a passar.
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
  const image = session?.user.image ?? null
  return (
    <div className="sh-app">
      <a href="#conteudo" className="sh-skip">Saltar para o conteúdo</a>
      <AlunoAside firstName={firstName} image={image} />
      <div className="sh-main min-w-0 overflow-x-clip">
        <AppHeader aluno={{ firstName, image }} />
        <main id="conteudo" className="mx-auto max-w-[1050px] px-5 py-6 text-texto sm:px-8 sm:py-10">
          {!hideBackLink && <Link href={backHref} className="inline-flex items-center gap-2 text-xs font-semibold text-texto-2 hover:text-marca min-[900px]:hidden"><ArrowLeft />{backLabel}</Link>}
          {!hideTitle && (
            <div className={cn('mt-3 flex max-w-2xl items-center gap-3.5', `tom-${tone}`)}>
              {Icon && <span className="ic-tom ic-tom-lg"><Icon size={24} aria-hidden="true" /></span>}
              <div className="min-w-0">
                <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">{title}</h1>
                {description && <p className="mt-1 text-[14px] leading-5 text-texto-2">{description}</p>}
              </div>
            </div>
          )}
          <div className={hideTitle && hideBackLink ? '' : 'mt-5'}>{children}</div>
        </main>
      </div>
    </div>
  )
}
TWISISA_MOLDURA_EOF

echo "A escrever components/skeletons/student-shell.tsx"
cat > "components/skeletons/student-shell.tsx" <<'TWISISA_MOLDURA_EOF'
import { Skeleton } from './skeleton'

/** Menu lateral do aluno (6 + 2 + 1 ligações), com as mesmas medidas do real (232 px). */
export function StudentSidebarSkeleton() {
  return (
    <aside aria-hidden="true" className="sh-aside">
      <Skeleton className="mx-2 mb-4 h-6 w-24" />
      {[6, 2, 1].map((count, group) => (
        <div key={group} className="mt-3">
          <Skeleton className="mx-2.5 mb-2 h-2.5 w-16" />
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2.5">
              <Skeleton className="size-[18px] rounded-md" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ))}
    </aside>
  )
}

/**
 * Esqueleto do StudentFeatureShell (menu lateral + cabeçalho + título). Mantém as medidas do shell real
 * (232 px de menu, cabeçalho de 52 px, conteúdo até 1050 px) para a página não saltar quando os dados chegam.
 */
export function StudentShellSkeleton({ children, hideBackLink = false, hideTitle = false }: { children: React.ReactNode; hideBackLink?: boolean; hideTitle?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label="A carregar" className="sh-app">
      <StudentSidebarSkeleton />
      <div className="sh-main min-w-0 overflow-x-clip">
        <div aria-hidden="true" className="sh-head">
          <div className="sh-bar">
            <Skeleton className="size-9 rounded-lg min-[900px]:hidden" />
            <span className="sh-sp" />
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
        <div className="mx-auto max-w-[1050px] px-5 py-6 sm:px-8 sm:py-10">
          {!hideBackLink && <Skeleton aria-hidden="true" className="h-4 w-40" />}
          {!hideTitle && <Skeleton className="mt-3 h-9 w-2/3 max-w-sm sm:h-10" />}
          <div className={hideTitle && hideBackLink ? '' : 'mt-5'}>{children}</div>
        </div>
      </div>
    </div>
  )
}
TWISISA_MOLDURA_EOF

echo "A apagar o cabeçalho público e o botão de menu antigos"
rm -f components/site/site-header.tsx components/aluno/aluno-menu-button.tsx

echo "A escrever scripts/_patch-shell.mjs"
cat > "scripts/_patch-shell.mjs" <<'TWISISA_MOLDURA_EOF'
// Twisisa · moldura única (cabeçalho fixo, menu lateral do aluno, modo claro/escuro) em todas as áreas.
// Altera ficheiros existentes (sem Python). Pode correr-se duas vezes sem estragar nada.
import fs from 'node:fs'
import path from 'node:path'

const read = (f) => fs.readFileSync(f, 'utf8')
const write = (f, s) => fs.writeFileSync(f, s)
function must(s, from, to, label) {
  if (s.includes(to) && !s.includes(from)) return s
  if (!s.includes(from)) throw new Error(`Não encontrei o ponto de alteração: ${label}`)
  return s.replace(from, to)
}

// 1. app/layout.tsx: script do tema no <head> e cor do navegador para claro e escuro
{
  const f = 'app/layout.tsx'
  let s = read(f)
  if (!s.includes('ThemeScript')) {
    s = must(s, "import { CookieCard } from '@/components/cookies/cookie-card'\n", "import { CookieCard } from '@/components/cookies/cookie-card'\nimport { ThemeScript } from '@/components/shell/theme-script'\n", 'layout import')
    s = must(s, "  colorScheme: 'light',\n  themeColor: '#1d4d41',\n", "  colorScheme: 'light dark',\n  themeColor: [\n    { media: '(prefers-color-scheme: light)', color: '#f8f8f5' },\n    { media: '(prefers-color-scheme: dark)', color: '#0b1310' },\n  ],\n", 'layout viewport')
    s = must(s, '      <head>\n', '      <head>\n        <ThemeScript />\n', 'layout head')
    write(f, s)
  }
}

// 2. exames/public-shell e blog-shell: o script do tema passou a ser global
{
  const f = 'components/exames/public-shell.tsx'
  let s = read(f)
  s = s.replace(/\/\/ Aplica o modo guardado[^\n]*\nconst THEME_SCRIPT[^\n]*\n\n/, '')
  s = s.replace('      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />\n', '')
  s = s.replace('// Moldura das páginas de exames: cabeçalho fixo e rodapé da página inicial, com modo claro/escuro, e o conteúdo ao centro.', '// Moldura das páginas de exames: a moldura comum de toda a plataforma (SiteFrame) e o conteúdo ao centro.')
  write(f, s)
  const g = 'components/blog/blog-shell.tsx'
  write(g, read(g).replace('(cabeçalho com a navegação principal e rodapé com as universidades)', '(cabeçalho fixo com a navegação principal e o modo claro/escuro, e rodapé com as universidades)'))
}

// 3. Painel do aluno (/aluno): usa o menu lateral e o cabeçalho novos
{
  const f = 'app/aluno/(painel)/page.tsx'
  let s = read(f)
  if (!s.includes('AppHeader')) {
    s = must(s, "import { StudentSidebar } from '@/components/student-sidebar'\n", "import { AlunoAside } from '@/components/shell/aluno-aside'\nimport { AppHeader } from '@/components/shell/app-header'\n", 'painel import sidebar')
    s = must(s, "import { AlunoMenuButton } from '@/components/aluno/aluno-menu-button'\n", '', 'painel import menu')
    s = must(s, '<div className="flex min-h-screen">\n        <StudentSidebar firstName={firstName} image={session.user.image ?? null} />\n        <div className="w-0 min-w-0 flex-1 overflow-x-clip leading-[normal]">', '<div className="sh-app">\n        <AlunoAside firstName={firstName} image={session.user.image ?? null} />\n        <div className="sh-main min-w-0 overflow-x-clip leading-[normal]">', 'painel estrutura')
    const a = s.indexOf('<header className="flex h-[60px]')
    const b = s.indexOf('</header>', a) + '</header>'.length
    if (a < 0 || b < a) throw new Error('Não encontrei o cabeçalho antigo do painel')
    s = s.slice(0, a) + "<AppHeader aluno={{ firstName, image: session.user.image ?? null }} unread={unreadCount} staff={staffRole ? { href: staffRole === 'admin' ? '/admin' : '/admin/questoes', label: staffRole === 'admin' ? 'Administração' : 'Revisão' } : null} />" + s.slice(b)
    s = s.replace('<main className="min-h-screen max-w-full overflow-x-hidden bg-fundo text-texto"', '<main id="conteudo" className="min-h-screen max-w-full overflow-x-hidden bg-fundo text-texto"')
    write(f, s)
  }
}

// 4. globals.css: tokens novos, modo escuro global e a moldura (.sh-*)
{
  const f = 'app/globals.css'
  let s = read(f)
  if (!s.includes('[twisisa-shell-7]')) {
    s = must(s, '  --color-conquista-texto: var(--conquista-texto);\n', '  --color-conquista-texto: var(--conquista-texto);\n  --color-superficie: var(--superficie);\n  --color-superficie-2: var(--superficie-2);\n  --color-on-marca: var(--on-marca);\n', 'tema inline')
    s = must(s, '  --conquista-texto: #92400e;\n', '  --conquista-texto: #92400e;\n  --superficie: #ffffff;       /* cartões e menus */\n  --superficie-2: #f1f4ef;     /* painéis suaves */\n  --on-marca: #ffffff;         /* texto sobre a cor da marca */\n', 'tokens root')
    s = must(s, '.tw-th .tw5{max-width:880px;padding-top:calc(52px + env(safe-area-inset-top,0px) + 18px)}', '.tw-th .tw5{max-width:880px;padding-top:18px}', 'tw5 padding mobile')
    s = must(s, '.tw-th .tw5{padding-top:calc(52px + env(safe-area-inset-top,0px) + 30px)}', '.tw-th .tw5{padding-top:30px}', 'tw5 padding desktop')
    const dark = `--marca:#6fc2a4;--marca-escura:#8fd4ba;--marca-suave:#173226;--fundo:#0b1310;--linha:#24312b;--texto:#e8efea;--texto-2:#a3ada7;--sucesso:#4ade80;--sucesso-suave:#12301f;--sucesso-texto:#86efac;--erro:#f87171;--erro-suave:#331616;--erro-texto:#fca5a5;--aviso:#f59e0b;--aviso-suave:#2b2112;--aviso-texto:#fcd9a8;--ajuda:#8ab4ff;--ajuda-suave:#14223f;--assistente:#a5b4fc;--assistente-suave:#1f2140;--conquista:#facc15;--conquista-suave:#2e2810;--conquista-texto:#fde68a;--superficie:#131d19;--superficie-2:#18241f;--on-marca:#07150f;--background:#0b1310;--foreground:#e8efea;--card:#131d19;--card-foreground:#e8efea;--popover:#131d19;--popover-foreground:#e8efea;--primary-foreground:#07150f;--secondary:#18241f;--secondary-foreground:#e8efea;--muted:#18241f;--muted-foreground:#a3ada7;--accent:#18241f;--accent-foreground:#e8efea;--border:#24312b;--input:#24312b;--ring:#6fc2a4;color-scheme:dark`
    const over = (p) => `${p} .bg-white{background-color:var(--superficie)}\n${p} .bg-marca,${p} .btn-primario{color:var(--on-marca)}\n${p} .btn-primario{border-bottom-color:var(--marca-escura)}\n${p} img{opacity:.92}\n`
    const css = `
/* [twisisa-shell-7] moldura única de toda a plataforma: cabeçalho fixo e mínimo, menu lateral do aluno e modo claro/escuro.
   Usa as cores de cada família (.tw nas páginas públicas, tokens nas do aluno): var(--bg, var(--fundo)) e semelhantes. */
@media (prefers-color-scheme:dark){html:not([data-theme="light"]){${dark}}
${over('html:not([data-theme="light"])')}}
html[data-theme="dark"]{${dark}}
${over('html[data-theme="dark"]')}
.sh-head,.sh-aside,.sh-panel,.sh-mob,.sh-skip{--k-bg:var(--bg,var(--fundo));--k-sf:var(--sf,var(--superficie));--k-ink:var(--ink,var(--texto));--k-mu:var(--mu,var(--texto-2));--k-ln:var(--ln,var(--linha));--k-g:var(--g,var(--marca));--k-gs:var(--gs,var(--marca-suave));--k-on:var(--on,var(--on-marca))}
.sh-head{position:fixed;top:0;left:0;right:0;z-index:40;padding-top:env(safe-area-inset-top,0px);background:var(--k-bg);border-bottom:1px solid var(--k-ln);color:var(--k-ink)}
.sh-bar{height:52px;display:flex;align-items:center;gap:10px;padding:0 16px;max-width:1100px;margin:0 auto}
.sh-brand{display:inline-flex;align-items:center;gap:8px;font:800 1.05rem 'Manrope',system-ui,sans-serif;letter-spacing:-.03em;color:var(--k-ink,var(--texto));text-decoration:none}
.sh-nav{display:none;gap:4px;margin-left:8px}
.sh-nav a{padding:6px 10px;border-radius:6px;font-weight:600;font-size:.92rem;color:var(--k-mu);text-decoration:none}
.sh-nav a:hover{color:var(--k-g)}
.sh-nav a[aria-current=page]{color:var(--k-g);background:var(--k-gs)}
.sh-sp{flex:1}
.sh-ic{position:relative;width:36px;height:36px;display:inline-grid;place-items:center;padding:0;flex:none;border:1px solid var(--k-ln,var(--linha));border-radius:8px;background:transparent;color:var(--k-ink,var(--texto));cursor:pointer}
.sh-ic:hover{border-color:var(--k-g,var(--marca));color:var(--k-g,var(--marca))}
.sh-bell i{position:absolute;top:7px;right:8px;width:8px;height:8px;border-radius:50%;background:var(--aviso,#b45309)}
.sh-av{display:inline-flex;border-radius:50%}
.sh-btn{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--k-g);background:var(--k-g);color:var(--k-on);font-weight:700;font-size:.92rem;text-decoration:none;white-space:nowrap}
.sh-btn.sh-ol{background:transparent;color:var(--k-ink);border-color:var(--k-ln)}
.sh-btn.sh-ol:hover{border-color:var(--k-g);color:var(--k-g)}
.sh-acts{display:inline-flex;align-items:center;gap:8px}
.sh-hide-s{display:none}
.sh-mob{display:flex;flex-direction:column;padding:2px 16px 10px;background:var(--k-bg);border-bottom:1px solid var(--k-ln)}
.sh-mob a{padding:12px 0;border-top:1px solid var(--k-ln);font-weight:600;color:var(--k-ink);text-decoration:none}
.sh-mob a:first-child{border-top:0}
.sh-mob a[aria-current=page]{color:var(--k-g)}
.sh-skip{position:absolute;left:-9999px;top:8px;z-index:80;padding:8px 12px;border-radius:8px;background:var(--k-sf);color:var(--k-ink);font-weight:700}
.sh-skip:focus{left:8px}
.sh-aside{display:none}
.sh-aside-brand{padding:4px 8px 16px}
.sh-groups{display:flex;flex-direction:column;gap:14px;flex:1}
.sh-group{display:flex;flex-direction:column;gap:2px}
.sh-gl{margin:0 10px 4px;font-size:.78rem;font-weight:700;color:var(--k-mu)}
.sh-l{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;font-weight:600;font-size:.92rem;color:var(--k-mu);text-decoration:none;white-space:nowrap}
.sh-l:hover{background:var(--k-gs);color:var(--k-g)}
.sh-l[aria-current=page]{background:var(--k-g);color:var(--k-on)}
.sh-aside-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--k-ln)}
.sh-who{display:flex;align-items:center;gap:8px;min-width:0;font-size:.85rem;font-weight:600;color:var(--k-ink);text-decoration:none}
.sh-who span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sh-drawer{position:fixed;inset:0;z-index:70}
.sh-scrim{position:absolute;inset:0;border:0;background:rgba(5,12,9,.5)}
.sh-panel{position:relative;display:flex;flex-direction:column;gap:4px;height:100%;width:min(86vw,320px);padding:calc(14px + env(safe-area-inset-top,0px)) 14px 14px;background:var(--k-sf);border-right:1px solid var(--k-ln);overflow-y:auto}
.sh-panel-top{display:flex;align-items:center;justify-content:space-between;padding:0 4px 14px 8px}
.sh-main{padding-top:calc(52px + env(safe-area-inset-top,0px))}
.tw-th{padding-top:calc(52px + env(safe-area-inset-top,0px))}
html:has(.sh-app){scroll-padding-top:calc(60px + env(safe-area-inset-top,0px))}
@media (min-width:640px){.sh-hide-s{display:inline-flex}}
@media (min-width:900px){
  .sh-nav{display:flex}
  .sh-only-m,.sh-drawer{display:none!important}
  .sh-mob{display:none}
  .sh-aside{display:flex;position:fixed;top:0;bottom:0;left:0;width:232px;flex-direction:column;gap:4px;padding:18px 14px;background:var(--k-sf);border-right:1px solid var(--k-ln);z-index:45;overflow-y:auto}
  .sh-app .sh-main{margin-left:232px}
  .sh-app .sh-head,html[data-shell="aluno"] .tw .sh-head{left:232px}
  html[data-shell="aluno"] .tw{margin-left:232px}
}
@media (prefers-reduced-motion:reduce){.sh-ic,.sh-l,.sh-btn{transition:none!important}}
`
    write(f, s.trimEnd() + '\n' + css)
  }
}

// 5. Cores fixas (#hex) dos neutros e dos tons de aviso passam a usar os tokens: é isso que faz o modo escuro valer em todas as páginas do aluno.
function hsl(hex) {
  const n = parseInt(hex, 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), c = max - min, l = (max + min) / 2
  let h = 0
  if (c) h = max === r ? ((g - b) / c) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4
  return { h: (h * 60 + 360) % 360, c, l }
}
function pick(prefix, hex) {
  const { h, c, l } = hsl(hex)
  const neutral = c < 0.03 || (c < 0.045 && h >= 60 && h < 110)
  const green = h >= 70 && h <= 190, red = h <= 20 || h >= 340, warm = h > 20 && h <= 65
  if (prefix === 'bg') {
    if (neutral) return l >= 0.965 ? 'superficie' : l >= 0.925 ? 'superficie-2' : l >= 0.8 ? 'linha' : null
    if (l > 0.85 && green) return 'marca-suave'
    if (l > 0.88 && red) return 'erro-suave'
    if (l > 0.85 && warm) return 'conquista-suave'
    return null
  }
  if (prefix === 'border' || prefix === 'divide' || prefix === 'ring' || prefix === 'outline') {
    if (l >= 0.78 && (neutral || green)) return 'linha'
    if (l >= 0.8 && red) return 'erro-suave'
    return null
  }
  if (prefix === 'text') {
    const grey = neutral || (green && c < 0.12)
    if (grey) return l < 0.3 ? 'texto' : l < 0.62 ? 'texto-2' : null
    if (green && l < 0.5) return 'marca'
    if (red && l < 0.5) return 'erro-texto'
    if (warm && l < 0.5) return 'conquista-texto'
    return null
  }
  if (prefix === 'from' || prefix === 'via' || prefix === 'to') {
    if (l > 0.85 && green) return 'marca-suave'
    if (l > 0.9 && neutral) return 'superficie-2'
    return null
  }
  return null
}
const RX = /(?<![\w\[\]-])((?:[a-z0-9\[\]_-]+:)*)(bg|border|divide|ring|outline|text|from|via|to)(-[trblxy])?-\[#([0-9a-fA-F]{6})\](\/\d+)?/g
let touched = 0, replaced = 0, left = {}
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p) }
    else if (p.endsWith('.tsx') && !p.includes(`${path.sep}admin${path.sep}`) && !p.startsWith(`app${path.sep}admin`)) {
      const before = read(p)
      const after = before.replace(RX, (all, variants, prefix, side = '', hex, opacity = '') => {
        const token = pick(prefix, hex)
        if (!token) { left[`${prefix} #${hex.toLowerCase()}`] = (left[`${prefix} #${hex.toLowerCase()}`] || 0) + 1; return all }
        replaced++
        return `${variants}${prefix}${side}-${token}${opacity}`
      })
      if (after !== before) { write(p, after); touched++ }
    }
  }
}
walk('app'); walk('components')
const rest = Object.entries(left).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} (${v})`).join(', ')
console.log(`Cores: ${replaced} trocadas por tokens em ${touched} ficheiros. Por trocar (mais comuns): ${rest || 'nenhuma'}`)

// 6. Termos e Privacidade: a moldura comum (cabeçalho fixo, tema, rodapé)
for (const f of ['app/termos/page.tsx', 'app/privacidade/page.tsx']) {
  let s = read(f)
  if (s.includes('SiteFrame')) continue
  s = must(s, "import { Brand } from '@/components/brand'\n", "import { SiteFrame } from '@/components/site/site-frame'\n", `${f} import`)
  const a = s.indexOf('<main className="min-h-screen bg-fundo text-texto"><header')
  const b = s.indexOf('</header>', a) + '</header>'.length
  if (a < 0 || b < a) throw new Error(`${f}: cabeçalho antigo não encontrado`)
  s = s.slice(0, a) + '<SiteFrame><main id="conteudo" className="text-texto">' + s.slice(b)
  s = must(s, '</article></main>', '</article></main></SiteFrame>', `${f} fecho`)
  write(f, s)
}

// 7. Entrar, Criar conta, Esqueci a senha, Redefinir senha: ecrãs de foco, com o botão do tema no canto
for (const f of ['app/sign-in/page.tsx', 'app/sign-up/page.tsx', 'app/esqueci-a-senha/page.tsx', 'app/redefinir-senha/page.tsx']) {
  if (!fs.existsSync(f)) continue
  let s = read(f)
  if (s.includes('ThemeToggle')) continue
  const from = '<header className="pt-8 sm:pt-12">\n        <Brand />\n      </header>'
  if (!s.includes(from)) { console.log(`Aviso: ${f} tem outro cabeçalho; botão do tema não acrescentado.`); continue }
  s = s.replace(from, '<header className="flex items-center justify-between pt-8 sm:pt-12">\n        <Brand />\n        <ThemeToggle />\n      </header>')
  s = must(s, "import { Brand } from '@/components/brand'\n", "import { Brand } from '@/components/brand'\nimport { ThemeToggle } from '@/components/site/theme-toggle'\n", `${f} import`)
  write(f, s)
}

// 8. Documentação viva
{
  const d = 'DESIGN.md'
  let s = read(d)
  if (!s.includes('## Moldura única')) {
    write(d, s.trimEnd() + `

## Moldura única (cabeçalho, menu lateral, tema)
- Um só cabeçalho em toda a plataforma: fixo, opaco e mínimo (52 px), \`components/shell/app-header.tsx\`. Sem sessão: logo, quatro ligações, tema e conta. Com sessão: menu (telemóvel), tema, notificações e foto.
- Um só menu lateral do aluno (232 px, a partir de 900 px): \`components/shell/aluno-aside.tsx\`. A lista de ligações está em \`components/student-nav.tsx\` e serve também a gaveta do telemóvel. Nas páginas públicas aparece quando há sessão (\`PublicAsideGate\`).
- Sem barra de navegação em baixo (decidido).
- Modo claro/escuro: botão no cabeçalho, escolha guardada em \`localStorage\` (\`tw-tema\`), por omissão segue o sistema. O script do \`<head>\` (\`components/shell/theme-script.tsx\`) aplica-o antes de pintar. Os tokens escuros estão em \`app/globals.css\` (secção «twisisa-shell-7»).
- Em páginas novas: usar tokens (\`bg-superficie\`, \`bg-superficie-2\`, \`border-linha\`, \`text-texto-2\`, \`text-on-marca\`), nunca \`#hex\`. Um \`#hex\` não muda no modo escuro.
- Ecrãs de foco sem menu: onboarding, sessão do Treinar e Jonas.
`)
  }
  const st = 'State.md'
  s = read(st)
  if (!s.includes('## Moldura (cabeçalho, menu, tema)')) {
    s = must(s, '## Administração (`/admin`)', `## Moldura (cabeçalho, menu, tema)
- **FEITO, FALTA TESTE** (10/11/2026): cabeçalho fixo e mínimo, menu lateral do aluno e botão claro/escuro iguais em todas as áreas (aluno, exames, simulado, blog, planos, termos, privacidade; entrar e criar conta só com o botão do tema). Regras em \`DESIGN.md\`.
- Modo escuro nas páginas do aluno: tokens novos e troca automática de cerca de 250 cores \`#hex\` por tokens. Ficam algumas cores fixas (degradês e fundos escuros): rever à vista no telemóvel, página a página.
- Por testar: menu lateral em \`/exames\` com sessão (a pista \`tw-shell\` evita o salto), gaveta no telemóvel, notificações com ponto, contraste no escuro.
- Fora da moldura de propósito: \`/aluno/bem-vindo\`, sessão do Treinar, Jonas, \`/admin\`, \`/esqueci-a-senha\` e \`/redefinir-senha\`.

## Administração (\`/admin\`)`, 'State.md')
    write(st, s)
  }
}
TWISISA_MOLDURA_EOF

echo "A alterar os ficheiros existentes (layout, painel, globals.css, termos, privacidade, entrar, criar conta, State.md, DESIGN.md)"
node scripts/_patch-shell.mjs
rm -f scripts/_patch-shell.mjs

echo ""
echo "A correr os testes…"
npm test

echo ""
echo "A correr o build…"
npm run build

echo ""
echo "Testes e build passaram. A fazer commit e push…"
git add -A app components State.md DESIGN.md scripts
git commit -m "Moldura única: menu lateral novo, cabeçalho fixo e mínimo e modo claro/escuro em todas as áreas"
git push

echo ""
echo "Concluído. Depois do deploy, testa num telemóvel: /aluno, /exames (com e sem sessão), /blog, o botão do tema e a gaveta do menu."
