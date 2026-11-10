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
