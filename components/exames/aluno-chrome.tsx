'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, Menu, X } from 'lucide-react'
import { Avatar } from '@/components/aluno/avatar'
import { SignOutButton } from '@/components/sign-out-button'
import { ThemeToggle } from '@/components/site/theme-toggle'
import { MAIN, PERSONAL, SAVED } from '@/components/student-nav'
import { useSession } from '@/lib/auth-client'

// Depois do login, as páginas públicas de exames ganham o menu do aluno (barra lateral no computador, gaveta no telemóvel).
// Antes do login nada disto aparece: o CSS só mostra este bloco quando <html data-shell="aluno">.
// O aviso fica guardado neste aparelho (HINT) para a página já abrir no sítio certo, sem «piscar»; a sessão confirma logo a seguir.
export const SHELL_HINT = 'tw-aluno'

type Item = (typeof MAIN)[number] | (typeof SAVED)[number] | (typeof PERSONAL)[number]

function isActive(path: string, item: Item) {
  return 'exact' in item && item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`)
}

function Group({ label, items, path, onNavigate }: { label: string; items: readonly Item[]; path: string; onNavigate?: () => void }) {
  return (
    <>
      <p>{label}</p>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={isActive(path, item) ? 'page' : undefined}>
            <Icon size={17} aria-hidden />{item.label}
          </Link>
        )
      })}
    </>
  )
}

function Groups({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <nav className="ex2-nav" aria-label="Menu do aluno">
      <Group label="Estudar" items={MAIN} path={path} onNavigate={onNavigate} />
      <Group label="Guardado" items={SAVED} path={path} onNavigate={onNavigate} />
      <Group label="A minha conta" items={PERSONAL} path={path} onNavigate={onNavigate} />
    </nav>
  )
}

export function AlunoChrome() {
  const path = usePathname() ?? ''
  const { data, isPending } = useSession()
  const [open, setOpen] = useState(false)
  const user = data?.user
  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] || 'Eu'

  useEffect(() => {
    if (isPending) return
    document.documentElement.dataset.shell = user ? 'aluno' : 'publico'
    try {
      if (user) window.localStorage.setItem(SHELL_HINT, '1')
      else window.localStorage.removeItem(SHELL_HINT)
    } catch { /* sem armazenamento: vale só nesta visita */ }
  }, [isPending, user])

  useEffect(() => { setOpen(false) }, [path])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <>
      <aside className="ex2-side" aria-label="Menu do aluno">
        <Link href="/aluno" className="tw-brand ex2-sb"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-6 w-auto" />Twisisa</Link>
        <Groups path={path} />
        <div className="ex2-me">
          <Link href="/aluno/perfil" className="ex2-who"><Avatar name={firstName} image={user?.image ?? null} size={30} /><span>{firstName}</span></Link>
          <SignOutButton />
        </div>
      </aside>

      <header className="ex2-hd">
        <div className="ex2-bar">
          <button type="button" className="tw6-ic ex2-menu" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={18} aria-hidden /></button>
          <Link href="/aluno" className="tw-brand ex2-brand" aria-label="Twisisa, painel"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} priority className="h-6 w-auto" />Twisisa</Link>
          <span className="ex2-sp" />
          <ThemeToggle />
          <Link href="/aluno/notificacoes" className="tw6-ic" aria-label="Notificações"><Bell size={18} aria-hidden /></Link>
          <Link href="/aluno/perfil" aria-label="O meu perfil" className="ex2-av"><Avatar name={firstName} image={user?.image ?? null} size={32} /></Link>
        </div>
      </header>

      {open && (
        <div className="ex2-dr" role="dialog" aria-modal="true" aria-label="Menu do aluno">
          <button type="button" className="ex2-ov" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div className="ex2-pn">
            <div className="ex2-pt">
              <Link href="/aluno" onClick={() => setOpen(false)} className="tw-brand"><Image src="/images/twisisa-mark.png" alt="" width={44} height={24} className="h-6 w-auto" />Twisisa</Link>
              <button type="button" className="tw6-ic" aria-label="Fechar menu" onClick={() => setOpen(false)}><X size={18} aria-hidden /></button>
            </div>
            <Groups path={path} onNavigate={() => setOpen(false)} />
            <div className="ex2-me">
              <Link href="/aluno/perfil" className="ex2-who" onClick={() => setOpen(false)}><Avatar name={firstName} image={user?.image ?? null} size={30} /><span>{firstName}</span></Link>
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
