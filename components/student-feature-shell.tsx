'use client'

import Link from 'next/link'
import { ArrowLeft, Bell } from 'lucide-react'
import { StudentMenu } from '@/components/student-menu'
import { StudentSidebar } from '@/components/student-sidebar'
import { Brand } from '@/components/brand'
import { SignOutButton } from '@/components/sign-out-button'

// Estrutura comum das páginas do estudante (menu, cabeçalho, botão de voltar).
// `backHref`/`backLabel`: para onde volta o botão (por omissão, a visão geral).
// `hideTitle`: a página desenha o seu próprio cabeçalho (ex.: Biblioteca).
export function StudentFeatureShell({
  firstName,
  eyebrow,
  title,
  children,
  hideBackLink = false,
  hideTitle = false,
  backHref = '/aluno',
  backLabel = 'Voltar à visão geral',
}: {
  firstName: string
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
  hideBackLink?: boolean
  hideTitle?: boolean
  backHref?: string
  backLabel?: string
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f8f5] text-[#202321]">
      <div className="flex min-h-screen">
        <StudentSidebar firstName={firstName} />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b border-[#eceee7] bg-[#f8f8f5]/95 px-5 py-3 backdrop-blur sm:px-8">
            <div className="mx-auto flex min-h-10 max-w-[1050px] items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <StudentMenu firstName={firstName} />
                <span className="lg:hidden"><Brand href="/aluno" /></span>
                <div className="hidden min-w-0 lg:block"><p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d4d41]">{eyebrow}</p><p className="truncate text-sm text-[#7a827b]">Área do estudante</p></div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href="/aluno/notificacoes" aria-label="Notificações" className="flex size-10 items-center justify-center rounded-full text-[#68716a] transition-colors hover:bg-[#eef0e9] hover:text-[#1d4d41]"><Bell /></Link>
                <div className="hidden h-7 w-px bg-[#e3e6dc] sm:block" aria-hidden="true" />
                <span className="hidden max-w-28 truncate text-xs font-medium text-[#48534b] sm:block">{firstName}</span>
                <SignOutButton />
              </div>
            </div>
          </header>
          <div className="mx-auto max-w-[1050px] px-5 py-6 sm:px-8 sm:py-10">
            {!hideBackLink && <Link href={backHref} className="inline-flex items-center gap-2 text-xs font-semibold text-[#68716a] hover:text-[#1d4d41]"><ArrowLeft />{backLabel}</Link>}
            {!hideTitle && <div className="mt-3 max-w-2xl"><h1 className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{title}</h1></div>}
            <div className={hideTitle && hideBackLink ? '' : 'mt-5'}>{children}</div>
          </div>
        </div>
      </div>
    </main>
  )
}
